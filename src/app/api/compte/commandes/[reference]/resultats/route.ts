import { NextResponse } from "next/server";
import { getStorage } from "@/lib/files";
import { getCurrentUser } from "@/lib/auth/session";
import { listRestored } from "@/server/services/assets";
import { orderForUser } from "@/server/services/accounts";
import { createZip } from "@/lib/zip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Téléchargement groupé des photographies restaurées.
 *
 * Une archive reconstruite à la volée plutôt qu'un fichier conservé sur le
 * serveur : rien à purger, rien qui traîne, et le contenu est toujours exact.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;

  const user = await getCurrentUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });

  const order = await orderForUser(reference, user.id);
  if (!order) return new NextResponse("Introuvable", { status: 404 });

  const restored = await listRestored(order.id);
  if (restored.length === 0) return new NextResponse("Aucun résultat", { status: 404 });

  const storage = getStorage();
  const entries: { name: string; data: Buffer }[] = [];

  for (const asset of restored) {
    const file = await storage.get(asset.storageKey).catch(() => null);
    if (!file) continue;
    entries.push({ name: safeName(asset.originalFilename), data: file });
  }

  if (entries.length === 0) return new NextResponse("Aucun résultat", { status: 404 });

  const zip = createZip(entries);

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-length": String(zip.length),
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="atelier-restauration-${reference}.zip"`,
    },
  });
}

/** Les noms sont aplatis : pas de séparateur de dossier dans une archive. */
function safeName(name: string) {
  return (
    name
      .replace(/[\\/]/g, "-")
      .replace(/[^\p{L}\p{N}._-]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "photo"
  );
}
