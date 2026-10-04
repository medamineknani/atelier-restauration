import { NextResponse, type NextRequest } from "next/server";
import { readDraftOrderId } from "@/lib/draft";
import { getOrderById } from "@/server/services/orders";
import { getStorage } from "@/lib/files";
import { ingestOriginal } from "@/server/services/assets";
import { getCurrentUser } from "@/lib/auth/session";
import { logAudit } from "@/server/services/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Finalise un envoi direct : le fichier est déjà dans le stockage objet, on
 * l'enregistre en base, on produit la vignette et on efface les métadonnées.
 */
export async function POST(request: NextRequest) {
  const orderId = await readDraftOrderId();
  if (!orderId) return NextResponse.json({ error: "NO_DRAFT" }, { status: 401 });

  const order = await getOrderById(orderId);
  if (!order || order.status !== "draft") {
    return NextResponse.json({ error: "NO_DRAFT" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { key?: string; filename?: string }
    | null;
  if (!body?.key) return NextResponse.json({ error: "MISSING_KEY" }, { status: 400 });

  const storage = getStorage();
  const buffer = await storage.get(body.key);
  if (!buffer) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const user = await getCurrentUser();

  try {
    const asset = await ingestOriginal({
      orderId,
      buffer,
      filename: body.filename ?? "photo.jpg",
      uploadedBy: user?.id ?? null,
      position: order.photosCount,
    });

    await logAudit({
      actorId: user?.id ?? null,
      action: "asset.uploaded",
      entityType: "asset",
      entityId: asset.id,
      metadata: { orderId, mode: "presigned" },
    });

    return NextResponse.json({ id: asset.id, thumbUrl: `/api/files/${asset.id}` });
  } catch {
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
}
