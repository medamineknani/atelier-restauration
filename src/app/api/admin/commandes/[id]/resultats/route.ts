import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { assets } from "@/server/db/schema";
import { currentAdmin } from "@/lib/auth/admin";
import { getOrderById } from "@/server/services/orders";
import { ingestRestored, UploadError } from "@/server/services/assets";
import { logAudit } from "@/server/services/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Dépôt des photographies restaurées.
 *
 * Réservé à l'équipe, et à une commande qui existe réellement : un fichier
 * restauré hors commande n'a aucun sens. Chaque dépôt est journalisé — on
 * sait toujours qui a déposé quoi, et quand.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

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

  const buffer = Buffer.from(await file.arrayBuffer());

  const [existing] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assets)
    .where(eq(assets.orderId, id));
  const position = existing?.count ?? 0;

  try {
    const asset = await ingestRestored({
      orderId: id,
      buffer,
      filename: file.name || "restauree.jpg",
      uploadedBy: admin.id,
      position,
    });

    await logAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: "asset.restored_uploaded",
      entityType: "order",
      entityId: id,
      metadata: {
        assetId: asset.id,
        filename: asset.originalFilename,
        size: asset.sizeBytes,
        paired: asset.paired,
      },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({
      id: asset.id,
      filename: asset.originalFilename,
      size: asset.sizeBytes,
      paired: asset.paired,
      thumbUrl: `/api/files/${asset.id}?variant=thumb`,
    });
  } catch (error) {
    if (error instanceof UploadError) {
      const status = error.code === "FILE_TOO_LARGE" ? 413 : 415;
      return NextResponse.json({ error: error.code, message: error.message }, { status });
    }
    console.error("[admin/resultats]", error);
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
}
