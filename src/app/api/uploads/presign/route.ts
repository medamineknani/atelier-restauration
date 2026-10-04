import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { readDraftOrderId } from "@/lib/draft";
import { getOrderById } from "@/server/services/orders";
import { getStorage, storageKeys } from "@/lib/storage";
import { orderLimits } from "@/server/services/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * URL d'envoi direct vers le stockage objet (production).
 *
 * Le serveur ne voit jamais le contenu du fichier : il délivre uniquement une
 * URL signée de courte durée, limitée en taille. C'est ce qui permet d'envoyer
 * cent photos de 40 Mo depuis une connexion mobile sans faire transiter quoi
 * que ce soit par l'application.
 */
export async function POST(request: NextRequest) {
  const orderId = await readDraftOrderId();
  if (!orderId) return NextResponse.json({ error: "NO_DRAFT" }, { status: 401 });

  const order = await getOrderById(orderId);
  if (!order || order.status !== "draft") {
    return NextResponse.json({ error: "NO_DRAFT" }, { status: 401 });
  }

  const limits = await orderLimits();
  if (order.photosCount >= limits.maxFilesPerOrder) {
    return NextResponse.json({ error: "QUOTA_REACHED" }, { status: 409 });
  }

  const body = (await request.json().catch(() => null)) as
    | { filename?: string; contentType?: string; size?: number }
    | null;

  const contentType = body?.contentType ?? "application/octet-stream";
  if (!limits.acceptedFormats.includes(contentType)) {
    return NextResponse.json({ error: "UNSUPPORTED_FORMAT" }, { status: 415 });
  }
  if ((body?.size ?? 0) > limits.maxFileSizeBytes) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  }

  const storage = getStorage();
  const fileId = randomUUID();
  const key = storageKeys.original(orderId, fileId, extensionFor(contentType));

  const upload = storage.createUploadUrl
    ? await storage.createUploadUrl(key, contentType, limits.maxFileSizeBytes, 600)
    : null;
  if (!upload) {
    return NextResponse.json({ error: "DIRECT_UPLOAD_UNAVAILABLE" }, { status: 501 });
  }

  return NextResponse.json({
    mode: "presigned",
    key,
    fileId,
    url: upload.url,
    headers: upload.headers,
    method: upload.method,
    expiresAt: upload.expiresAt,
  });
}

function extensionFor(contentType: string) {
  return (
    {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/tiff": "tiff",
    }[contentType] ?? "bin"
  );
}
