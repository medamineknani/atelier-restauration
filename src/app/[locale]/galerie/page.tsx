import Link from "next/link";
import type { Metadata } from "next";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { getGalleryCategories, getTransformations } from "@/server/services/content";
import { buildMetadata, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";
import { site } from "@/config/site";
import { Container, Eyebrow, Section } from "@/components/ui/primitives";
import { GalleryGrid } from "@/components/marketing/gallery-grid";
import { FinalCta } from "@/components/marketing/final-cta";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);
  return buildMetadata({
    locale,
    path: "/galerie",
    title: t("gallery.title"),
    description: t("gallery.lede"),
  });
}

export default async function GalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ categorie?: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const { categorie } = await searchParams;
  const t = createTranslator(locale);

  const [items, categories] = await Promise.all([
    getTransformations(locale, categorie),
    getGalleryCategories(),
  ]);

  const url = `${site.url}${localePath(locale, "/galerie")}`;
  const jsonLd = [
    breadcrumbJsonLd([
      { name: t("nav.home"), url: `${site.url}${localePath(locale, "/")}` },
      { name: t("nav.gallery"), url },
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      <Section tone="paper" className="!pb-10 !pt-14 md:!pt-20">
        <Container>
          <div className="max-w-3xl">
            <Eyebrow>{t("home.gallery.eyebrow")}</Eyebrow>
            <h1 className="heading-1 mt-6 text-ink">{t("gallery.title")}</h1>
            <p className="mt-7 body-lg text-graphite">{t("gallery.lede")}</p>
          </div>

          {/* Filtres */}
          <nav aria-label={t("common.filter")} className="mt-12 overflow-x-auto no-scrollbar">
            <ul className="flex min-w-max items-center gap-7 border-b border-line pb-4">
              <li>
                <Link
                  href={localePath(locale, "/galerie")}
                  className={cn(
                    "rule-expand text-[0.875rem] transition-fast",
                    !categorie ? "text-ink" : "text-stone hover:text-ink",
                  )}
                >
                  {t("gallery.filterAll")}
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category}>
                  <Link
                    href={`${localePath(locale, "/galerie")}?categorie=${category}`}
                    className={cn(
                      "rule-expand text-[0.875rem] transition-fast",
                      categorie === category ? "text-ink" : "text-stone hover:text-ink",
                    )}
                  >
                    {t(`gallery.categories.${category}` as never) || category}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </Section>

      <Section tone="paper" className="!pt-10">
        <Container>
          {items.length === 0 ? (
            <p className="py-16 text-center text-[0.9375rem] text-stone">{t("gallery.emptyFilter")}</p>
          ) : (
            <GalleryGrid locale={locale} items={items} headingLevel={2} />
          )}
        </Container>
      </Section>

      <FinalCta locale={locale} />
    </>
  );
}
