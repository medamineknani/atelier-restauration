import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { getTransformationBySlug, getTransformations } from "@/server/services/content";
import { buildMetadata, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";
import { site } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { ArrowIcon, Container, Eyebrow, Reveal, Rule, Section } from "@/components/ui/primitives";
import { BeforeAfter } from "@/components/marketing/before-after";
import { FinalCta } from "@/components/marketing/final-cta";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  const item = await getTransformationBySlug(slug, locale);
  if (!item) return {};
  return buildMetadata({
    locale,
    path: `/galerie/${slug}`,
    title: item.title,
    description: item.workDescription,
    image: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/gallery/${item.id}/after`,
  });
}

export default async function TransformationPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  const t = createTranslator(locale);

  const item = await getTransformationBySlug(slug, locale);
  if (!item) notFound();

  const others = (await getTransformations(locale))
    .filter((entry) => entry.id !== item.id)
    .slice(0, 3);

  const url = `${site.url}${localePath(locale, `/galerie/${slug}`)}`;
  const jsonLd = [
    breadcrumbJsonLd([
      { name: t("nav.home"), url: `${site.url}${localePath(locale, "/")}` },
      { name: t("nav.gallery"), url: `${site.url}${localePath(locale, "/galerie")}` },
      { name: item.title, url },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      name: item.title,
      description: item.workDescription,
      contentUrl: `${site.url}/api/gallery/${item.id}/after`,
      license: `${site.url}/mentions-legales`,
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      <Section tone="paper" className="!pb-10 !pt-14 md:!pt-20">
        <Container>
          <Link
            href={localePath(locale, "/galerie")}
            className="text-[0.875rem] text-stone transition-fast hover:text-ink"
          >
            ← {t("nav.gallery")}
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Eyebrow>{t(`gallery.categories.${item.category}` as never) || item.category}</Eyebrow>
              <h1 className="heading-1 mt-5 text-ink">{item.title}</h1>
              <Rule className="my-8 w-12 border-champagne" />
              <p className="eyebrow text-stone">{t("home.gallery.workDone")}</p>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-graphite">
                {item.workDescription}
              </p>
              <ButtonLink href={localePath(locale, "/commande/service")} size="lg" className="mt-10">
                {t("nav.cta")}
                <ArrowIcon />
              </ButtonLink>
            </div>

            <div className="lg:col-span-7 lg:col-start-6">
              <Reveal>
                <BeforeAfter
                  beforeSrc={`/api/gallery/${item.id}/before`}
                  afterSrc={`/api/gallery/${item.id}/after`}
                  beforeAlt={item.altBefore}
                  afterAlt={item.altAfter}
                  beforeLabel={t("common.before")}
                  afterLabel={t("common.after")}
                  sliderLabel={t("a11y.beforeAfterSlider")}
                  width={item.width}
                  height={item.height}
                  priority
                />
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      {others.length > 0 ? (
        <Section tone="cream" className="!py-16 md:!py-24">
          <Container>
            <h2 className="eyebrow text-stone">{t("home.gallery.cta")}</h2>
            <ul className="mt-10 grid gap-8 sm:grid-cols-3">
              {others.map((other) => (
                <li key={other.id}>
                  <Link href={localePath(locale, `/galerie/${other.slug}`)} className="group block">
                    <div className="border-t border-line pt-5">
                      <p className="eyebrow text-stone">
                        {t(`gallery.categories.${other.category}` as never) || other.category}
                      </p>
                      <h3 className="mt-3 font-display text-[1.0625rem] text-ink transition-fast group-hover:text-champagne-deep">
                        {other.title}
                      </h3>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <FinalCta locale={locale} />
    </>
  );
}
