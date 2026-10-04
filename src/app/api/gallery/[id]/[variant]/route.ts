import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { assets, transformations } from "@/server/db/schema";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Images de la galerie publique : /api/gallery/{transformation}/{before|after}
 *
 * Le variant est dans le chemin et non en query string : l'URL reste
 * compatible avec l'optimiseur d'images de Next et se met en cache proprement.
 * Seules les natures `gallery_before` / `gallery_after` sont servies ici —
 * aucun fichier client n'est atteignable par cette route.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; variant: string }> },
) {
  const { id, variant } = await params;
  if (variant !== "before" && variant !== "after") {
    return new NextResponse("Introuvable", { status: 404 });
  }

  const rows = await db
    .select()
    .from(transformations)
    .where(and(eq(transformations.id, id), eq(transformations.isPublished, true)))
    .limit(1);
  const transformation = rows[0];
  if (!transformation) return new NextResponse("Introuvable", { status: 404 });

  const assetId = variant === "before" ? transformation.beforeAssetId : transformation.afterAssetId;
  if (!assetId) return new NextResponse("Introuvable", { status: 404 });

  const assetRows = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), isNull(assets.deletedAt)))
    .limit(1);
  const asset = assetRows[0];
  if (!asset || !asset.kind.startsWith("gallery_")) {
    return new NextResponse("Interdit", { status: 403 });
  }

  const storage = getStorage();
  const stream = storage.getStream ? await storage.getStream(asset.storageKey) : null;
  const body = stream ?? (await storage.get(asset.storageKey));
  if (!body) return new NextResponse("Indisponible", { status: 404 });

  return new NextResponse(body as BodyInit, {
    headers: {
      "content-type": asset.mimeType || "image/webp",
      "x-content-type-options": "nosniff",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
