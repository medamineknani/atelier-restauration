import Link from "next/link";
import type { Metadata } from "next";
import { createTranslator, localePath, raw, type Locale } from "@/lib/i18n";
import { getPacks } from "@/server/services/catalog";
import { getFaqs, getTestimonials, getTransformations } from "@/server/services/content";
import {
  buildMetadata,
  canonicalUrl,
  faqJsonLd,
  howToJsonLd,
  jsonLdScript,
  organizationJsonLd,
  productJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { Container, Section, SectionHeading, Reveal } from "@/components/ui/primitives";
import { ArrowIcon } from "@/components/ui/primitives";
import { Hero } from "@/components/marketing/hero";
import { ValueProps } from "@/components/marketing/value-props";
import { BeforeAfterSection } from "@/components/marketing/before-after-section";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ServicesGrid } from "@/components/marketing/services-grid";
import { PacksSection } from "@/components/marketing/packs-section";
import { PhotobooksSection } from "@/components/marketing/photobooks-section";
import { GalleryGrid } from "@/components/marketing/gallery-grid";
import { Testimonials } from "@/components/marketing/testimonials";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FinalCta } from "@/components/marketing/final-cta";

/** Catalogue et contenus sont éditables en back-office : rendu à la requête. */
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
    path: "/",
    title:
      locale === "en"
        ? "Photo restoration & premium photobooks — Tunisia"
        : "Restauration de photos anciennes & photobooks premium — Tunisie",
    description: t("home.hero.lede"),
    image: "/images/hero-atelier.jpg",
  });
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);

  const [digitalPacks, photobookPacks, transformations, testimonials, faqs] = await Promise.all([
    getPacks("digital", locale),
    getPacks("photobook", locale),
    getTransformations(locale),
    getTestimonials(locale, true),
    getFaqs(locale),
  ]);

  const featured =
    transformations.find((item) => item.isFeatured) ?? transformations[0] ?? null;
  const galleryItems = transformations.slice(0, 6);
  const homeFaqs = faqs.slice(0, 6);
  const steps = raw<{ title: string; body: string }[]>(locale, "home.how.steps") ?? [];

  const jsonLd = [
    await organizationJsonLd(),
    websiteJsonLd(),
    howToJsonLd(steps),
    faqJsonLd(homeFaqs),
    ...digitalPacks.map((pack) =>
      productJsonLd({
        name: pack.name,
        description: pack.tagline ?? pack.name,
        priceMillimes: pack.priceMillimes,
        url: canonicalUrl(locale, "/tarifs"),
      }),
    ),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />

      {/* ① Émotion */}
      <Hero locale={locale} />

      {/* ② Ce que nous sommes */}
      <ValueProps locale={locale} />

      {/* ③ La preuve */}
      <BeforeAfterSection locale={locale} transformation={featured} />

      {/* ④ La raison */}
      <HowItWorks locale={locale} />
      <ServicesGrid locale={locale} />

      {/* ⑤ Le choix */}
      <PacksSection locale={locale} packs={digitalPacks} />
      <PhotobooksSection locale={locale} packs={photobookPacks} />

      {/* ⑥ La confiance */}
      <Section tone="paper">
        <Container>
          <Reveal>
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <SectionHeading
                eyebrow={t("home.gallery.eyebrow")}
                title={t("home.gallery.title")}
                lede={t("home.gallery.lede")}
              />
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
            <GalleryGrid locale={locale} items={galleryItems} />
          </div>
        </Container>
      </Section>

      <Section tone="cream">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t("home.testimonials.eyebrow")}
              title={t("home.testimonials.title")}
              align="center"
              className="mx-auto"
            />
          </Reveal>
          <div className="mt-16">
            <Testimonials
              items={testimonials}
              previousLabel={t("home.testimonials.previous")}
              nextLabel={t("home.testimonials.next")}
            />
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
            <div className="lg:col-span-4">
              <Reveal>
                <SectionHeading
                  eyebrow={t("home.faq.eyebrow")}
                  title={t("home.faq.title")}
                />
                <Link
                  href={localePath(locale, "/faq")}
                  className="mt-8 inline-block text-[0.9375rem] text-ink underline underline-offset-4 transition-fast hover:text-champagne-deep"
                >
                  {t("home.faq.cta")}
                </Link>
              </Reveal>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <Reveal delay={80}>
                <FaqAccordion items={homeFaqs} />
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      {/* ⑦ L'impulsion */}
      <FinalCta locale={locale} />
    </>
  );
}
