import { NextResponse } from "next/server";
import { getStorage } from "@/lib/files";
import { currentAdmin } from "@/lib/auth/admin";
import { listOriginals } from "@/server/services/assets";
import { getOrderById } from "@/server/services/orders";
import { createZip } from "@/lib/zip";
import { logAudit } from "@/server/services/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Téléchargement groupé des originaux.
 *
 * C'est l'action la plus sensible du back-office : elle sort du coffre les
 * photographies que le client a confiées. Elle est réservée à l'équipe et
 * systématiquement journalisée — on doit pouvoir dire qui a téléchargé quoi.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await currentAdmin();
  if (!admin) return new NextResponse("Non autorisé", { status: 401 });

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return new NextResponse("Introuvable", { status: 404 });

  const originals = await listOriginals(id);
  if (originals.length === 0) return new NextResponse("Aucun fichier", { status: 404 });

  const storage = getStorage();
  const entries: { name: string; data: Buffer }[] = [];

  for (const asset of originals) {
    const file = await storage.get(asset.storageKey).catch(() => null);
    if (!file) continue;
    entries.push({
      name: asset.originalFilename.replace(/[\\/]/g, "-").slice(0, 120),
      data: file,
    });
  }

  if (entries.length === 0) return new NextResponse("Aucun fichier", { status: 404 });

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: "asset.originals_downloaded",
    entityType: "order",
    entityId: id,
    metadata: { files: entries.length },
  });

  const zip = createZip(entries);

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-length": String(zip.length),
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="originaux-${order.reference}.zip"`,
    },
  });
}
