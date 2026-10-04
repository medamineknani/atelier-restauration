import "server-only";

import { createHash } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/server/db";
import { assets, type Asset } from "@/server/db/schema";
import { getStorage, storageKeys } from "@/lib/files";
import { orderLimits } from "./catalog";
import { refreshPhotosCount } from "./orders";

export class UploadError extends Error {
  constructor(
    message: string,
    readonly code: "FILE_TOO_LARGE" | "UNSUPPORTED_FORMAT" | "QUOTA_REACHED" | "CORRUPT_FILE",
  ) {
    super(message);
    this.name = "UploadError";
  }
}

const THUMB_WIDTH = 480;
const BLUR_SIZE = 16;

/** Les formats acceptés sont validés par le contenu réel, jamais par l'en-tête. */
const FORMAT_EXTENSION: Record<string, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  tiff: "tiff",
};

export async function inspectImage(buffer: Buffer) {
  try {
    const meta = await sharp(buffer, { failOn: "none" }).metadata();
    return meta;
  } catch {
    return null;
  }
}

async function assertValidImage(buffer: Buffer, filename: string) {
  const limits = await orderLimits();

  if (buffer.byteLength > limits.maxFileSizeBytes) {
    throw new UploadError(
      `Fichier trop volumineux (${Math.round(buffer.byteLength / 1024 / 1024)} Mo)`,
      "FILE_TOO_LARGE",
    );
  }

  const meta = await inspectImage(buffer);
  if (!meta?.format) throw new UploadError("Fichier illisible", "CORRUPT_FILE");

  const ext = FORMAT_EXTENSION[meta.format];
  if (!ext) {
    throw new UploadError(`Format non pris en charge (${meta.format})`, "UNSUPPORTED_FORMAT");
  }

  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < 200 || height < 200) {
    throw new UploadError("Image trop petite (200 px minimum)", "UNSUPPORTED_FORMAT");
  }

  return { ext, width, height, mime: `image/${meta.format}`, filename };
}

/* -------------------------------------------------------------------------- */
/* Ingest                                                                      */
/* -------------------------------------------------------------------------- */

export type IngestResult = { asset: Asset; thumbUrl: string };

/**
 * Enregistre un original : stockage immuable, validation par magic bytes,
 * génération de la vignette et du flou de chargement, suppression des
 * métadonnées (dont la géolocalisation) — puis rafraîchissement du quota.
 */
export async function ingestOriginal(input: {
  orderId: string;
  buffer: Buffer;
  filename: string;
  uploadedBy?: string | null;
  position?: number;
}): Promise<Asset> {
  const limits = await orderLimits();

  const existing = await db
    .select({ count: assets.id })
    .from(assets)
    .where(and(eq(assets.orderId, input.orderId), eq(assets.kind, "original"), isNull(assets.deletedAt)));
  if (existing.length >= limits.maxFilesPerOrder) {
    throw new UploadError("Nombre maximum de photos atteint", "QUOTA_REACHED");
  }

  const info = await assertValidImage(input.buffer, input.filename);
  const storage = getStorage();

  const [created] = await db
    .insert(assets)
    .values({
      orderId: input.orderId,
      kind: "original",
      status: "pending",
      storageDriver: storage.name,
      storageKey: "",
      originalFilename: input.filename.slice(0, 180),
      mimeType: info.mime,
      sizeBytes: input.buffer.byteLength,
      position: input.position ?? existing.length,
      uploadedBy: input.uploadedBy ?? null,
    })
    .returning();

  const asset = created!;
  const key = storageKeys.original(input.orderId, asset.id, info.ext);
  const thumbKey = storageKeys.originalThumb(input.orderId, asset.id);

  await storage.put(key, input.buffer, info.mime);

  // La vignette et le flou sont produits par un réencodage complet :
  // les métadonnées EXIF (dont la géolocalisation) disparaissent.
  const thumb = await sharp(input.buffer, { failOn: "none" })
    .rotate()
    .resize(THUMB_WIDTH, undefined, { withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  await storage.put(thumbKey, thumb, "image/webp");

  const blurBuffer = await sharp(thumb).resize(BLUR_SIZE, BLUR_SIZE, { fit: "inside" }).blur(1.2).webp({ quality: 40 }).toBuffer();
  const blurPlaceholder = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

  const [updated] = await db
    .update(assets)
    .set({
      storageKey: key,
      thumbKey,
      blurPlaceholder,
      width: info.width,
      height: info.height,
      checksumSha256: createHash("sha256").update(input.buffer).digest("hex"),
      exifStripped: true,
      status: "ready",
    })
    .where(eq(assets.id, asset.id))
    .returning();

  await refreshPhotosCount(input.orderId);
  return updated!;
}

/* -------------------------------------------------------------------------- */
/* Lecture                                                                     */
/* -------------------------------------------------------------------------- */

export async function getAsset(id: string) {
  const rows = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listOriginals(orderId: string) {
  return db
    .select()
    .from(assets)
    .where(and(eq(assets.orderId, orderId), eq(assets.kind, "original"), isNull(assets.deletedAt)))
    .orderBy(asc(assets.position), asc(assets.createdAt));
}

export async function listRestored(orderId: string) {
  return db
    .select()
    .from(assets)
    .where(and(eq(assets.orderId, orderId), eq(assets.kind, "restored"), isNull(assets.deletedAt)))
    .orderBy(asc(assets.position), asc(assets.createdAt));
}

export async function softDeleteAsset(id: string) {
  await db.update(assets).set({ status: "deleted", deletedAt: new Date() }).where(eq(assets.id, id));
}

/** Suppression physique — uniquement depuis le job de rétention. */
export async function purgeAsset(asset: Asset) {
  const storage = getStorage();
  await storage.remove(asset.storageKey);
  if (asset.thumbKey) await storage.remove(asset.thumbKey);
  await db.delete(assets).where(eq(assets.id, asset.id));
}

/* -------------------------------------------------------------------------- */
/* Résultats                                                                   */
/* -------------------------------------------------------------------------- */

/** Comparaison de noms tolérante : casse, extension et préfixes d'atelier. */
export function normalizeForPairing(filename: string) {
  return filename
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^(restauree|restaurée|restored|final|retouche)[-_ ]?/i, "")
    .replace(/[-_ ]?(restauree|restaurée|restored|final)$/i, "")
    .replace(/[^a-z0-9]/gi, "");
}

/**
 * Enregistre une photo restaurée.
 *
 * L'appariement avec l'original se fait par nom de fichier : l'atelier
 * travaille généralement sans renommer, et ce simple rapprochement évite
 * d'apparier à la main cinquante images. Quand il échoue, l'admin appaire
 * en glissant — jamais par un formulaire.
 */
export async function ingestRestored(input: {
  orderId: string;
  buffer: Buffer;
  filename: string;
  uploadedBy?: string | null;
  position?: number;
}): Promise<Asset & { paired: boolean }> {
  const info = await assertValidImage(input.buffer, input.filename);
  const storage = getStorage();

  const originals = await listOriginals(input.orderId);
  const alreadyRestored = await listRestored(input.orderId);
  const taken = new Set(alreadyRestored.map((asset) => asset.pairedAssetId).filter(Boolean));

  const wanted = normalizeForPairing(input.filename);
  const match = originals.find(
    (original) =>
      normalizeForPairing(original.originalFilename) === wanted && !taken.has(original.id),
  );

  const [created] = await db
    .insert(assets)
    .values({
      orderId: input.orderId,
      kind: "restored",
      status: "processing",
      storageDriver: storage.name,
      storageKey: "",
      originalFilename: input.filename.slice(0, 180),
      mimeType: info.mime,
      sizeBytes: input.buffer.byteLength,
      position: input.position ?? 0,
      uploadedBy: input.uploadedBy ?? null,
      pairedAssetId: match?.id ?? null,
    })
    .returning();

  const asset = created!;
  const key = storageKeys.restored(input.orderId, asset.id, info.ext);
  const thumbKey = storageKeys.restoredThumb(input.orderId, asset.id);

  await storage.put(key, input.buffer, info.mime);

  const thumb = await sharp(input.buffer, { failOn: "none" })
    .rotate()
    .resize(THUMB_WIDTH, undefined, { withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  await storage.put(thumbKey, thumb, "image/webp");

  const [updated] = await db
    .update(assets)
    .set({
      storageKey: key,
      thumbKey,
      width: info.width,
      height: info.height,
      checksumSha256: createHash("sha256").update(input.buffer).digest("hex"),
      exifStripped: true,
      status: "ready",
    })
    .where(eq(assets.id, asset.id))
    .returning();

  return { ...updated!, paired: Boolean(match) };
}

/** Rattache un résultat à un original (appariement manuel). */
export async function pairAssets(restoredId: string, originalId: string | null) {
  await db
    .update(assets)
    .set({ pairedAssetId: originalId })
    .where(and(eq(assets.id, restoredId), eq(assets.kind, "restored")));
}

/** Compte les originaux encore sans résultat apparié. */
export async function unpairableNotice(orderId: string) {
  const originals = await listOriginals(orderId);
  const restored = await listRestored(orderId);
  const paired = new Set(restored.map((asset) => asset.pairedAssetId).filter(Boolean));
  return { total: originals.length, covered: originals.filter((a) => paired.has(a.id)).length };
}
