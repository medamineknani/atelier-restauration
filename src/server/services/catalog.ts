import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  productExtras,
  products,
  productTranslations,
  settings,
} from "@/server/db/schema";
import { defaultLocale, type Locale } from "@/lib/i18n";

export type ProductWithTranslation = typeof products.$inferSelect & {
  name: string;
  tagline: string | null;
  description: string | null;
  features: string[];
  ctaLabel: string | null;
};

type Row = {
  id: string;
  slug: string;
  kind: "pack" | "extra";
  family: "digital" | "photobook";
  priceMillimes: number;
  photosIncluded: number | null;
  photosMin: number | null;
  photosMax: number | null;
  pagesIncluded: number | null;
  turnaroundDaysMin: number;
  turnaroundDaysMax: number;
  extraPhotosGranted: number;
  extraPagesGranted: number;
  pricingMode: "flat" | "per_photo" | "per_page" | "per_copy";
  maxQuantity: number | null;
  requiresShipping: boolean;
  isFeatured: boolean;
  sortOrder: number;
  locale: Locale | null;
  name: string | null;
  tagline: string | null;
  features: string[] | null;
  ctaLabel: string | null;
};

/**
 * Retourne la traduction demandée, avec repli sur la langue par défaut.
 * Une traduction manquante ne produit jamais de trou à l'écran.
 */
function toProduct(row: Row): ProductWithTranslation {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    family: row.family,
    categoryId: null,
    priceMillimes: row.priceMillimes,
    photosIncluded: row.photosIncluded,
    photosMin: row.photosMin,
    photosMax: row.photosMax,
    pagesIncluded: row.pagesIncluded,
    turnaroundDaysMin: row.turnaroundDaysMin,
    turnaroundDaysMax: row.turnaroundDaysMax,
    extraPhotosGranted: row.extraPhotosGranted,
    extraPagesGranted: row.extraPagesGranted,
    pricingMode: row.pricingMode,
    maxQuantity: row.maxQuantity,
    requiresShipping: row.requiresShipping,
    isFeatured: row.isFeatured,
    sortOrder: row.sortOrder,
    currency: "TND",
    isActive: true,
    deletedAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    name: row.name ?? row.slug,
    tagline: row.tagline,
    description: null,
    features: row.features ?? [],
    ctaLabel: row.ctaLabel,
  };
}

const selection = {
  id: products.id,
  slug: products.slug,
  kind: products.kind,
  family: products.family,
  priceMillimes: products.priceMillimes,
  photosIncluded: products.photosIncluded,
  photosMin: products.photosMin,
  photosMax: products.photosMax,
  pagesIncluded: products.pagesIncluded,
  turnaroundDaysMin: products.turnaroundDaysMin,
  turnaroundDaysMax: products.turnaroundDaysMax,
  extraPhotosGranted: products.extraPhotosGranted,
  extraPagesGranted: products.extraPagesGranted,
  pricingMode: products.pricingMode,
  maxQuantity: products.maxQuantity,
  requiresShipping: products.requiresShipping,
  isFeatured: products.isFeatured,
  sortOrder: products.sortOrder,
  locale: productTranslations.locale,
  name: productTranslations.name,
  tagline: productTranslations.tagline,
  features: productTranslations.features,
  ctaLabel: productTranslations.ctaLabel,
};

/**
 * Une seule requête, triée pour que la locale demandée passe avant le repli :
 * on récupère packs et traductions sans N+1.
 */
function dedupe(rows: Row[], locale: Locale) {
  const byId = new Map<string, Row>();
  for (const row of rows) {
    const existing = byId.get(row.id);
    if (!existing) {
      byId.set(row.id, row);
      continue;
    }
    const existingScore = existing.locale === locale ? 2 : existing.locale === defaultLocale ? 1 : 0;
    const rowScore = row.locale === locale ? 2 : row.locale === defaultLocale ? 1 : 0;
    if (rowScore > existingScore) byId.set(row.id, row);
  }
  return [...byId.values()].map((row) => toProduct(row));
}

export async function getPacks(family: "digital" | "photobook", locale: Locale) {
  const rows = (await db
    .select(selection)
    .from(products)
    .leftJoin(
      productTranslations,
      and(
        eq(productTranslations.productId, products.id),
        sql`${productTranslations.locale} in (${locale}, ${defaultLocale})`,
      ),
    )
    .where(
      and(
        eq(products.kind, "pack"),
        eq(products.family, family),
        eq(products.isActive, true),
        isNull(products.deletedAt),
      ),
    )
    .orderBy(asc(products.sortOrder))) as Row[];

  return dedupe(rows, locale);
}

export async function getExtrasForPack(packId: string, locale: Locale) {
  const rows = (await db
    .select({ ...selection, extraSort: productExtras.sortOrder })
    .from(productExtras)
    .innerJoin(products, eq(products.id, productExtras.extraId))
    .leftJoin(
      productTranslations,
      and(
        eq(productTranslations.productId, products.id),
        sql`${productTranslations.locale} in (${locale}, ${defaultLocale})`,
      ),
    )
    .where(and(eq(productExtras.packId, packId), eq(products.isActive, true)))
    .orderBy(asc(productExtras.sortOrder))) as (Row & { extraSort: number })[];

  return dedupe(rows, locale);
}

export async function getProductById(id: string, locale: Locale) {
  const rows = (await db
    .select(selection)
    .from(products)
    .leftJoin(
      productTranslations,
      and(
        eq(productTranslations.productId, products.id),
        sql`${productTranslations.locale} in (${locale}, ${defaultLocale})`,
      ),
    )
    .where(eq(products.id, id))) as Row[];

  return dedupe(rows, locale)[0] ?? null;
}

export async function getProductBySlug(slug: string, locale: Locale) {
  const rows = (await db
    .select(selection)
    .from(products)
    .leftJoin(
      productTranslations,
      and(
        eq(productTranslations.productId, products.id),
        sql`${productTranslations.locale} in (${locale}, ${defaultLocale})`,
      ),
    )
    .where(eq(products.slug, slug))) as Row[];

  return dedupe(rows, locale)[0] ?? null;
}

export async function getAllProducts(locale: Locale) {
  const rows = (await db
    .select(selection)
    .from(products)
    .leftJoin(
      productTranslations,
      and(
        eq(productTranslations.productId, products.id),
        sql`${productTranslations.locale} in (${locale}, ${defaultLocale})`,
      ),
    )
    .where(isNull(products.deletedAt))
    .orderBy(asc(products.family), asc(products.kind), asc(products.sortOrder))) as Row[];

  return dedupe(rows, locale);
}

/* -------------------------------------------------------------------------- */
/* Réglages                                                                     */
/* -------------------------------------------------------------------------- */

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  const row = rows[0];
  return row ? (row.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown, updatedBy?: string) {
  await db
    .insert(settings)
    .values({ key, value, updatedBy: updatedBy ?? null, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedBy: updatedBy ?? null, updatedAt: new Date() },
    });
}

export const orderLimits = async () => ({
  maxFileSizeBytes: await getSetting("max_file_size_bytes", 60 * 1024 * 1024),
  maxFilesPerOrder: await getSetting("max_files_per_order", 200),
  acceptedFormats: await getSetting<string[]>("accepted_formats", [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/tiff",
  ]),
});
