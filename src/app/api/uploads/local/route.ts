import { NextResponse, type NextRequest } from "next/server";
import { readDraftOrderId } from "@/lib/draft";
import { getOrderById } from "@/server/services/orders";
import { ingestOriginal, UploadError } from "@/server/services/assets";
import { orderLimits } from "@/server/services/catalog";
import { logAudit } from "@/server/services/audit";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Réception d'un original (driver de stockage `local`).
 *
 * En production, le navigateur envoie le fichier **directement** au stockage
 * objet via une URL présignée : rien ne transite par le serveur applicatif.
 * Cette route est utilisée en développement et pour les installations sur
 * serveur unique.
 */
export async function POST(request: NextRequest) {
  const orderId = await readDraftOrderId();
  if (!orderId) return NextResponse.json({ error: "NO_DRAFT" }, { status: 401 });

  const order = await getOrderById(orderId);
  if (!order || order.status !== "draft") {
    return NextResponse.json({ error: "NO_DRAFT" }, { status: 401 });
  }

  const limits = await orderLimits();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  }

  if (file.size > limits.maxFileSizeBytes) {
    return NextResponse.json(
      { error: "FILE_TOO_LARGE", max: limits.maxFileSizeBytes },
      { status: 413 },
    );
  }

  if (order.photosCount >= limits.maxFilesPerOrder) {
    return NextResponse.json({ error: "QUOTA_REACHED" }, { status: 409 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const user = await getCurrentUser();

  try {
    const asset = await ingestOriginal({
      orderId,
      buffer,
      filename: file.name || "photo.jpg",
      uploadedBy: user?.id ?? null,
      position: order.photosCount,
    });

    await logAudit({
      actorId: user?.id ?? null,
      actorEmail: order.customerSnapshot?.email ?? null,
      action: "asset.uploaded",
      entityType: "asset",
      entityId: asset.id,
      metadata: { orderId, size: asset.sizeBytes, mime: asset.mimeType },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({
      id: asset.id,
      thumbUrl: `/api/files/${asset.id}`,
      width: asset.width,
      height: asset.height,
      filename: asset.originalFilename,
      size: asset.sizeBytes,
    });
  } catch (error) {
    if (error instanceof UploadError) {
      const status =
        error.code === "FILE_TOO_LARGE"
          ? 413
          : error.code === "QUOTA_REACHED"
            ? 409
            : 415;
      return NextResponse.json({ error: error.code, message: error.message }, { status });
    }
    console.error("[uploads/local]", error);
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
}
