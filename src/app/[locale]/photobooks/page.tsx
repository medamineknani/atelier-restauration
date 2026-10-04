import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { getPacks } from "@/server/services/catalog";
import { getFaqs } from "@/server/services/content";
import { buildMetadata, breadcrumbJsonLd, jsonLdScript, productJsonLd, serviceJsonLd } from "@/lib/seo";
import { site } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { CheckItem, Container, Eyebrow, Price, Reveal, Section, SectionHeading } from "@/components/ui/primitives";
import { ArrowIcon } from "@/components/ui/primitives";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { GalleryGrid } from "@/components/marketing/gallery-grid";
import { FinalCta } from "@/components/marketing/final-cta";
import { getTransformations } from "@/server/services/content";

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
    path: "/photobooks",
    title: t("home.photobooks.title"),
    description: t("home.photobooks.lede"),
    image: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/images/photobook-premium.jpg`,
  });
}

export default async function PhotobooksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);

  const [packs, faqs, transformations] = await Promise.all([
    getPacks("photobook", locale),
    getFaqs(locale, "livraison"),
    getTransformations(locale),
  ]);

  const url = `${site.url}${localePath(locale, "/photobooks")}`;
  const jsonLd = [
    serviceJsonLd({ name: t("home.photobooks.title"), description: t("home.photobooks.lede"), url, locale }),
    breadcrumbJsonLd([
      { name: t("nav.home"), url: `${site.url}${localePath(locale, "/")}` },
      { name: t("nav.photobooks"), url },
    ]),
    ...packs.map((pack) =>
      productJsonLd({
        name: pack.name,
        description: pack.tagline ?? pack.name,
        priceMillimes: pack.priceMillimes,
        url: `${url}#${pack.slug}`,
      }),
    ),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      {/* En-tête */}
      <Section tone="paper" className="!pb-12 !pt-14 md:!pt-20">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <Eyebrow>{t("home.photobooks.eyebrow")}</Eyebrow>
              <h1 className="heading-1 mt-6 text-ink">{t("home.photobooks.title")}</h1>
              <p className="mt-7 max-w-[48ch] body-lg text-graphite">{t("home.photobooks.lede")}</p>

              <ul className="mt-10 space-y-3">
                {[
                  locale === "en" ? "Lay-flat binding, thick matte paper" : "Reliure lay-flat, papier mat épais",
                  locale === "en" ? "Bespoke layout, page by page" : "Mise en page sur mesure, page par page",
                  locale === "en" ? "Delivered across all 24 governorates" : "Livraison dans les 24 gouvernorats",
                  locale === "en" ? "Your photographs, never public" : "Vos photographies, jamais publiées",
                ].map((item) => (
                  <CheckItem key={item}>{item}</CheckItem>
                ))}
              </ul>

              <ButtonLink href={localePath(locale, "/commande/service")} size="lg" className="mt-10">
                {t("home.photobooks.cta")}
                <ArrowIcon />
              </ButtonLink>
            </div>
            <div className="lg:col-span-6">
              <div className="relative overflow-hidden rounded-sm bg-sand">
                <Image
                  src="/images/photobook-premium.avif"
                  alt="Photobook premium ouvert sur une table, reliure lay-flat"
                  width={1400}
                  height={1000}
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Les trois formules */}
      <Section tone="cream">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t("nav.pricing")}
              title={locale === "en" ? "Three books, three ways of passing things on" : "Trois livres, trois manières de transmettre"}
            />
          </Reveal>

          <div className="mt-14 space-y-8">
            {packs.map((pack, index) => (
              <Reveal key={pack.id} delay={index * 80}>
                <article
                  id={pack.slug}
                  className="grid gap-8 rounded-md border border-line bg-paper p-7 md:grid-cols-12 md:p-9"
                >
                  <div className="md:col-span-4">
                    <h2 className="heading-3 text-ink">{pack.name}</h2>
                    <p className="mt-2 text-[0.9375rem] text-stone">{pack.tagline}</p>
                    <div className="mt-6">
                      <Price millimes={pack.priceMillimes} />
                    </div>
                  </div>
                  <div className="md:col-span-5">
                    <ul className="space-y-3">
                      {pack.features.map((feature) => (
                        <CheckItem key={feature}>{feature}</CheckItem>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col justify-between gap-4 md:col-span-3 md:items-end">
                    <p className="text-[0.8125rem] text-stone">
                      {t("common.estimated")}
                      <br />
                      {pack.turnaroundDaysMin}–{pack.turnaroundDaysMax} {t("common.days")}
                    </p>
                    <ButtonLink
                      href={`${localePath(locale, "/commande/service")}?pack=${pack.slug}`}
                      variant={pack.isFeatured ? "accent" : "secondary"}
                    >
                      {t("home.packs.cta")}
                    </ButtonLink>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          <div className="mt-12">
            <p className="eyebrow text-stone">{t("home.photobooks.optionsLabel")}</p>
            <p className="mt-3 max-w-[60ch] text-[0.9375rem] text-graphite">
              {t("home.photobooks.options")}
            </p>
            <Link
              href={localePath(locale, "/tarifs")}
              className="mt-6 inline-block text-[0.9375rem] text-ink underline underline-offset-4 transition-fast hover:text-champagne-deep"
            >
              {t("home.packs.allPacks")}
            </Link>
          </div>
        </Container>
      </Section>

      {/* Exemples */}
      <Section tone="paper">
        <Container>
          <Reveal>
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <SectionHeading eyebrow={t("home.gallery.eyebrow")} title={t("home.gallery.title")} />
              <Link
                href={localePath(locale, "/galerie")}
                className="inline-flex shrink-0 items-center gap-2 text-[0.9375rem] text-ink transition-fast hover:text-champagne-deep"
              >
                {t("home.gallery.cta")}
                <ArrowIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Reveal>
          <div className="mt-14">
            <GalleryGrid locale={locale} items={transformations.slice(0, 3)} columns={2} />
          </div>
        </Container>
      </Section>

      {/* FAQ */}
      <Section tone="cream" className="!py-16 md:!py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <Reveal>
                <h2 className="heading-2 text-ink">{t("faq.title")}</h2>
                <Link
                  href={localePath(locale, "/faq")}
                  className="mt-6 inline-block text-[0.9375rem] text-ink underline underline-offset-4 transition-fast hover:text-champagne-deep"
                >
                  {t("home.faq.cta")}
                </Link>
              </Reveal>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <FaqAccordion items={faqs.slice(0, 5)} />
            </div>
          </div>
        </Container>
      </Section>

      <FinalCta locale={locale} />
    </>
  );
}
