import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  assets,
  faqItems,
  faqTranslations,
  pageBlockTranslations,
  pageBlocks,
  testimonials,
  testimonialTranslations,
  transformations,
  transformationTranslations,
} from "@/server/db/schema";
import { defaultLocale, type Locale } from "@/lib/i18n";

/* -------------------------------------------------------------------------- */
/* Galerie avant / après                                                       */
/* -------------------------------------------------------------------------- */

export type TransformationCard = {
  id: string;
  slug: string;
  category: string;
  isFeatured: boolean;
  title: string;
  workDescription: string;
  altBefore: string;
  altAfter: string;
  beforeKey: string | null;
  afterKey: string | null;
  beforeThumb: string | null;
  afterThumb: string | null;
  blurBefore: string | null;
  blurAfter: string | null;
  createdAt: Date;
  width: number;
  height: number;
};

export async function getTransformations(locale: Locale, category?: string) {
  const rows = await db
    .select({
      id: transformations.id,
      slug: transformations.slug,
      category: transformations.category,
      isFeatured: transformations.isFeatured,
      sortOrder: transformations.sortOrder,
      createdAt: transformations.createdAt,
      title: transformationTranslations.title,
      workDescription: transformationTranslations.workDescription,
      altBefore: transformationTranslations.altBefore,
      altAfter: transformationTranslations.altAfter,
      locale: transformationTranslations.locale,
    })
    .from(transformations)
    .leftJoin(
      transformationTranslations,
      and(
        eq(transformationTranslations.transformationId, transformations.id),
        sql`${transformationTranslations.locale} in (${locale}, ${defaultLocale})`,
      ),
    )
    .where(
      category
        ? and(eq(transformations.isPublished, true), eq(transformations.category, category))
        : eq(transformations.isPublished, true),
    )
    .orderBy(asc(transformations.sortOrder));

  // Repli sur la locale par défaut : on garde la meilleure traduction par entité.
  const best = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const prev = best.get(row.id);
    const score = (l: string | null) => (l === locale ? 2 : l === defaultLocale ? 1 : 0);
    if (!prev || score(row.locale) > score(prev.locale)) best.set(row.id, row);
  }

  const ordered = [...best.values()]
    .filter((row) => row.title)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const ids = ordered.map((r) => r.id);
  if (ids.length === 0) return [] as TransformationCard[];

  const media = await db.select().from(assets).where(inArray(assets.transformationId, ids));
  const mediaByTransformation = new Map<string, { before?: typeof media[number]; after?: typeof media[number] }>();
  for (const asset of media) {
    if (!asset.transformationId) continue;
    const entry = mediaByTransformation.get(asset.transformationId) ?? {};
    if (asset.kind === "gallery_before") entry.before = asset;
    if (asset.kind === "gallery_after") entry.after = asset;
    mediaByTransformation.set(asset.transformationId, entry);
  }

  return ordered.map((row) => {
    const m = mediaByTransformation.get(row.id) ?? {};
    return {
      id: row.id,
      slug: row.slug,
      category: row.category,
      isFeatured: row.isFeatured,
      title: row.title ?? row.slug,
      workDescription: row.workDescription ?? "",
      altBefore: row.altBefore ?? `${row.title} — original`,
      altAfter: row.altAfter ?? `${row.title} — restauré`,
      beforeKey: m.before?.storageKey ?? null,
      afterKey: m.after?.storageKey ?? null,
      beforeThumb: m.before?.thumbKey ?? null,
      afterThumb: m.after?.thumbKey ?? null,
      blurBefore: m.before?.blurPlaceholder ?? null,
      blurAfter: m.after?.blurPlaceholder ?? null,
      createdAt: row.createdAt,
      width: m.after?.width ?? 1400,
      height: m.after?.height ?? 934,
    } satisfies TransformationCard;
  });
}

export async function getTransformationBySlug(slug: string, locale: Locale) {
  const all = await getTransformations(locale);
  return all.find((t) => t.slug === slug) ?? null;
}

export async function getGalleryCategories() {
  const rows = await db
    .selectDistinct({ category: transformations.category })
    .from(transformations)
    .where(eq(transformations.isPublished, true));
  return rows.map((r) => r.category);
}

/* -------------------------------------------------------------------------- */
/* Témoignages                                                                 */
/* -------------------------------------------------------------------------- */

export type TestimonialCard = {
  id: string;
  authorName: string;
  authorLocation: string | null;
  authorContext: string | null;
  rating: number | null;
  quote: string;
};

export async function getTestimonials(locale: Locale, onlyFeatured = false): Promise<TestimonialCard[]> {
  const rows = await db
    .select({
      id: testimonials.id,
      authorName: testimonials.authorName,
      authorLocation: testimonials.authorLocation,
      authorContext: testimonials.authorContext,
      rating: testimonials.rating,
      sortOrder: testimonials.sortOrder,
      quote: testimonialTranslations.quote,
      trLocale: testimonialTranslations.locale,
    })
    .from(testimonials)
    .leftJoin(
      testimonialTranslations,
      and(
        eq(testimonialTranslations.testimonialId, testimonials.id),
        sql`${testimonialTranslations.locale} in (${locale}, ${defaultLocale})`,
      ),
    )
    .where(onlyFeatured ? and(eq(testimonials.isApproved, true), eq(testimonials.isFeatured, true)) : eq(testimonials.isApproved, true))
    .orderBy(asc(testimonials.sortOrder));

  const best = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const prev = best.get(row.id);
    const score = (l: string | null) => (l === locale ? 2 : l === defaultLocale ? 1 : 0);
    if (!prev || score(row.trLocale) > score(prev.trLocale)) best.set(row.id, row);
  }

  return [...best.values()]
    .filter((r) => r.quote)
    .map((r) => ({
      id: r.id,
      authorName: r.authorName,
      authorLocation: r.authorLocation,
      authorContext: r.authorContext,
      rating: r.rating,
      quote: r.quote!,
    }))
    .sort((a, b) => rows.findIndex((r) => r.id === a.id) - rows.findIndex((r) => r.id === b.id));
}

/* -------------------------------------------------------------------------- */
/* FAQ                                                                         */
/* -------------------------------------------------------------------------- */

export type FaqEntry = { id: string; category: string; question: string; answer: string };

export async function getFaqs(locale: Locale, category?: string): Promise<FaqEntry[]> {
  const rows = await db
    .select({
      id: faqItems.id,
      category: faqItems.category,
      sortOrder: faqItems.sortOrder,
      question: faqTranslations.question,
      answer: faqTranslations.answer,
      trLocale: faqTranslations.locale,
    })
    .from(faqItems)
    .leftJoin(
      faqTranslations,
      and(eq(faqTranslations.faqId, faqItems.id), sql`${faqTranslations.locale} in (${locale}, ${defaultLocale})`),
    )
    .where(category ? and(eq(faqItems.isPublished, true), eq(faqItems.category, category)) : eq(faqItems.isPublished, true))
    .orderBy(asc(faqItems.sortOrder));

  const best = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const prev = best.get(row.id);
    const score = (l: string | null) => (l === locale ? 2 : l === defaultLocale ? 1 : 0);
    if (!prev || score(row.trLocale) > score(prev.trLocale)) best.set(row.id, row);
  }

  return [...best.values()]
    .filter((r) => r.question && r.answer)
    .map((r) => ({ id: r.id, category: r.category, question: r.question!, answer: r.answer! }))
    .sort((a, b) => rows.findIndex((r) => r.id === a.id) - rows.findIndex((r) => r.id === b.id));
}

/* -------------------------------------------------------------------------- */
/* Blocs éditoriaux                                                            */
/* -------------------------------------------------------------------------- */

export type EditorialBlock = {
  pageKey: string;
  blockKey: string;
  title: string | null;
  content: string | null;
  data: Record<string, unknown>;
  sortOrder: number;
};

export async function getPageBlocks(pageKey: string, locale: Locale): Promise<EditorialBlock[]> {
  const rows = await db
    .select({
      id: pageBlocks.id,
      pageKey: pageBlocks.pageKey,
      blockKey: pageBlocks.blockKey,
      sortOrder: pageBlocks.sortOrder,
      data: pageBlocks.data,
      title: pageBlockTranslations.title,
      content: pageBlockTranslations.content,
      trLocale: pageBlockTranslations.locale,
      trData: pageBlockTranslations.data,
    })
    .from(pageBlocks)
    .leftJoin(
      pageBlockTranslations,
      and(eq(pageBlockTranslations.pageBlockId, pageBlocks.id), sql`${pageBlockTranslations.locale} in (${locale}, ${defaultLocale})`),
    )
    .where(eq(pageBlocks.pageKey, pageKey))
    .orderBy(asc(pageBlocks.sortOrder));

  const best = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const prev = best.get(row.id);
    const score = (l: string | null) => (l === locale ? 2 : l === defaultLocale ? 1 : 0);
    if (!prev || score(row.trLocale) > score(prev.trLocale)) best.set(row.id, row);
  }

  return [...best.values()]
    .map((r) => ({
      pageKey: r.pageKey,
      blockKey: r.blockKey,
      title: r.title,
      content: r.content,
      data: { ...r.data, ...(r.trData ?? {}) } as Record<string, unknown>,
      sortOrder: r.sortOrder,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getRecentPublished() {
  const rows = await db.select().from(transformations).orderBy(desc(transformations.createdAt)).limit(1);
  return rows[0] ?? null;
}
