import { env } from "@/config/env";
import type { StorageDriver } from "./types";
import { createLocalDriver } from "./local";
import { createS3Driver } from "./s3";

export type { StorageDriver, UploadTarget } from "./types";
export { storageKeys } from "./types";

let instance: StorageDriver | null = null;

/**
 * Pilote de stockage courant.
 *
 * Le choix se fait sur `STORAGE_DRIVER` uniquement : le code métier ne sait
 * jamais s'il écrit sur un disque local ou dans un bucket.
 */
export function getStorage(): StorageDriver {
  if (instance) return instance;

  if (env.STORAGE_DRIVER === "s3") {
    const missing = [
      ["STORAGE_S3_BUCKET", env.STORAGE_S3_BUCKET],
      ["STORAGE_S3_REGION", env.STORAGE_S3_REGION],
      ["STORAGE_S3_ENDPOINT", env.STORAGE_S3_ENDPOINT],
      ["STORAGE_S3_ACCESS_KEY_ID", env.STORAGE_S3_ACCESS_KEY_ID],
      ["STORAGE_S3_SECRET_ACCESS_KEY", env.STORAGE_S3_SECRET_ACCESS_KEY],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      throw new Error(
        `Stockage S3 configuré mais incomplet : ${missing.join(", ")}. ` +
          `Repassez sur STORAGE_DRIVER=local ou complétez la configuration.`,
      );
    }

    instance = createS3Driver({
      bucket: env.STORAGE_S3_BUCKET!,
      region: env.STORAGE_S3_REGION!,
      endpoint: env.STORAGE_S3_ENDPOINT!,
      accessKeyId: env.STORAGE_S3_ACCESS_KEY_ID!,
      secretAccessKey: env.STORAGE_S3_SECRET_ACCESS_KEY!,
    });
    return instance;
  }

  instance = createLocalDriver(env.STORAGE_LOCAL_DIR);
  return instance;
}

/** Réinitialise le pilote — utile aux tests. */
export function resetStorage() {
  instance = null;
}
