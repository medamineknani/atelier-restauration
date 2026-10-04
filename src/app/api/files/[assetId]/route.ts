import { eq, and, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { assets, downloadTokens, orders } from "@/server/db/schema";
import { getStorage } from "@/lib/files";
import { getCurrentUser } from "@/lib/auth/session";
import { sha256 } from "@/lib/crypto";
import { readDraftOrderId } from "@/lib/draft";
import { logAudit } from "@/server/services/audit";

/** Natures de fichiers exposées publiquement (contenu du site, jamais client). */
const PUBLIC_KINDS = new Set(["gallery_before", "gallery_after", "avatar"]);

const SAFE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "application/pdf",
]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;

  const rows = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), isNull(assets.deletedAt)))
    .limit(1);
  const asset = rows[0];
  if (!asset) return new NextResponse("Introuvable", { status: 404 });

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const token = url.searchParams.get("t");
  // `thumb` : vignette 480 px réencodée (sans EXIF). `original` : fichier du
  // client, jamais exposé publiquement.
  const variant = url.searchParams.get("variant") === "thumb" ? "thumb" : "original";

  if (!PUBLIC_KINDS.has(asset.kind)) {
    const user = await getCurrentUser();
    let allowed = false;

    if (user && (user.role === "admin" || user.role === "superadmin")) {
      allowed = true;
    } else if (asset.orderId && (await readDraftOrderId()) === asset.orderId) {
      // Le propriétaire du brouillon en cours accède à ses propres fichiers :
      // c'est ce qui permet de voir les vignettes pendant l'envoi, avant même
      // la création d'un compte.
      allowed = true;
    } else if (asset.orderId) {
      const orderRows = await db.select().from(orders).where(eq(orders.id, asset.orderId)).limit(1);
      const order = orderRows[0];
      if (order) {
        if (user && order.userId === user.id) {
          allowed = true;
        } else if (token && order.guestAccessTokenHash === sha256(token)) {
          allowed = true;
        } else if (token) {
          const tokenRows = await db
            .select()
            .from(downloadTokens)
            .where(eq(downloadTokens.tokenHash, sha256(token)))
            .limit(1);
          const record = tokenRows[0];
          if (
            record &&
            record.orderId === asset.orderId &&
            !record.revokedAt &&
            record.expiresAt > new Date() &&
            record.downloadCount < record.maxDownloads
          ) {
            allowed = true;
            await db
              .update(downloadTokens)
              .set({ downloadCount: record.downloadCount + 1 })
              .where(eq(downloadTokens.id, record.id));
          }
        }
      }
    }

    if (!allowed) return new NextResponse("Interdit", { status: 403 });

    if (user && (user.role === "admin" || user.role === "superadmin")) {
      await logAudit({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "asset.accessed",
        entityType: "asset",
        entityId: asset.id,
        metadata: { kind: asset.kind, orderId: asset.orderId },
        ip: request.headers.get("x-forwarded-for") ?? undefined,
      });
    }
  }

  const storage = getStorage();
  const key = variant === "thumb" ? (asset.thumbKey ?? asset.storageKey) : asset.storageKey;
  const stream = storage.getStream ? await storage.getStream(key) : null;
  const body = stream ?? (await storage.get(key));

  if (!body) return new NextResponse("Fichier indisponible", { status: 404 });

  const thumbMime = "image/webp";
  const contentType =
    variant === "thumb"
      ? thumbMime
      : SAFE_CONTENT_TYPES.has(asset.mimeType)
        ? asset.mimeType
        : "application/octet-stream";

  const headers = new Headers({
    "content-type": download ? "application/octet-stream" : contentType,
    "content-disposition": download
      ? `attachment; filename="${encodeURIComponent(asset.originalFilename || "photo")}"`
      : "inline",
    "x-content-type-options": "nosniff",
    "cache-control": PUBLIC_KINDS.has(asset.kind)
      ? "public, max-age=31536000, immutable"
      : "private, no-store",
  });

  const length =
    variant === "original" && asset.sizeBytes
      ? asset.sizeBytes
      : body instanceof Buffer
        ? body.byteLength
        : null;
  if (length) headers.set("content-length", String(length));

  return new NextResponse(body as BodyInit, { status: 200, headers });
}
