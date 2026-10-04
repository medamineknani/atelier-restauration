import "server-only";

import { createHash, createHmac } from "node:crypto";
import type { StorageDriver } from "./types";

/**
 * Stockage objet compatible S3 (OVH, Scaleway, AWS, Minio…).
 *
 * Signature AWS SigV4 écrite à la main plutôt que via le SDK : une dépendance
 * de moins côté serveur, et le contrôle exact des en-têtes signés — ce qui
 * compte quand on limite la taille d'un envoi direct.
 *
 * Le navigateur envoie ses fichiers **directement** au stockage via une URL
 * présignée : aucune photographie de 40 Mo ne traverse l'application.
 */
export function createS3Driver(config: {
  bucket: string;
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}): StorageDriver {
  const { bucket, region, endpoint, accessKeyId, secretAccessKey } = config;

  const service = "s3";
  const algorithm = "AWS4-HMAC-SHA256";

  function hmac(key: Buffer | string, data: string) {
    return createHmac("sha256", key).update(data, "utf8").digest();
  }

  function signingKey(dateStamp: string) {
    let key = hmac(`AWS4${secretAccessKey}`, dateStamp);
    key = hmac(key, region);
    key = hmac(key, service);
    return hmac(key, "aws4_request");
  }

  /** Chaque segment est encodé, mais les `/` restent des séparateurs. */
  function canonicalUri(key: string) {
    return `/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  function urlFor(key: string, query = "") {
    return `${endpoint.replace(/\/$/, "")}/${bucket}${canonicalUri(key)}${query ? `?${query}` : ""}`;
  }

  function sign(input: {
    method: string;
    key: string;
    query: Record<string, string>;
    headers: Record<string, string>;
    payloadHash: string;
    now: Date;
  }) {
    const amzDate = input.now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);

    const headers: Record<string, string> = {
      host: new URL(endpoint).host,
      "x-amz-content-sha256": input.payloadHash,
      "x-amz-date": amzDate,
      ...input.headers,
    };

    const sortedHeaders = Object.keys(headers)
      .map((name) => name.toLowerCase())
      .sort();
    const canonicalHeaders = sortedHeaders
      .map((name) => `${name}:${String(headers[name] ?? "").trim()}\n`)
      .join("");
    const signedHeaders = sortedHeaders.join(";");

    const canonicalQuery = Object.keys(input.query)
      .sort()
      .map((name) => `${encodeURIComponent(name)}=${encodeURIComponent(input.query[name] ?? "")}`)
      .join("&");

    const canonicalRequest = [
      input.method,
      canonicalUri(input.key),
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      input.payloadHash,
    ].join("\n");

    const scope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      scope,
      createHash("sha256").update(canonicalRequest, "utf8").digest("hex"),
    ].join("\n");

    const signature = hmac(signingKey(dateStamp), stringToSign).toString("hex");

    return {
      headers,
      authorization: `${algorithm} Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    };
  }

  async function request(
    method: string,
    key: string,
    options: {
      body?: Buffer;
      contentType?: string;
      query?: Record<string, string>;
      headers?: Record<string, string>;
    } = {},
  ) {
    const now = new Date();
    const payloadHash = createHash("sha256")
      .update(options.body ?? Buffer.alloc(0))
      .digest("hex");

    const { authorization, headers } = sign({
      method,
      key,
      query: options.query ?? {},
      headers: {
        ...(options.contentType ? { "content-type": options.contentType } : {}),
        ...options.headers,
      },
      payloadHash,
      now,
    });

    const query = new URLSearchParams(options.query ?? {}).toString();
    return fetch(urlFor(key, query), {
      method,
      headers: { ...headers, authorization },
      body: options.body,
    });
  }

  return {
    name: "s3",

    async put(key, body, contentType) {
      const response = await request("PUT", key, {
        body,
        contentType: contentType ?? "application/octet-stream",
      });
      if (!response.ok) {
        throw new Error(`S3 PUT ${key} : ${response.status} ${await response.text()}`);
      }
    },

    async get(key) {
      const response = await request("GET", key);
      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
    },

    async remove(key) {
      const response = await request("DELETE", key);
      if (!response.ok && response.status !== 404) {
        throw new Error(`S3 DELETE ${key} : ${response.status}`);
      }
    },

    async createUploadUrl(key, contentType, maxBytes, ttlSeconds) {
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
      const dateStamp = amzDate.slice(0, 8);

      const query: Record<string, string> = {
        "X-Amz-Algorithm": algorithm,
        "X-Amz-Credential": `${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`,
        "X-Amz-Date": amzDate,
        "X-Amz-Expires": String(ttlSeconds),
        "X-Amz-SignedHeaders": "content-type;host;x-amz-content-sha256",
      };

      // Requête présignée : la charge utile est inconnue au moment de signer.
      const { authorization, headers } = sign({
        method: "PUT",
        key,
        query,
        headers: {
          "content-type": contentType,
          "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        },
        payloadHash: "UNSIGNED-PAYLOAD",
        now,
      });

      const signature = authorization.split("Signature=")[1] ?? "";
      const signed = { ...query, "X-Amz-Signature": signature };

      return {
        url: urlFor(key, new URLSearchParams(signed).toString()),
        method: "PUT",
        headers: {
          "content-type": contentType,
          host: String(headers.host ?? new URL(endpoint).host),
          "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
          // Garde-fou : le stockage refuse au-delà, même si le client ment.
          "content-length-range": `0,${maxBytes}`,
        },
        expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
      };
    },
  };
}
