import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { getPacks } from "@/server/services/catalog";
import { getFaqs, getTransformations } from "@/server/services/content";
import { site } from "@/config/site";
import { buildMetadata, breadcrumbJsonLd, jsonLdScript, productJsonLd } from "@/lib/seo";
import { ButtonLink } from "@/components/ui/button";
import { ArrowIcon, CheckItem, Container, Eyebrow, Price, Reveal, Rule, Section } from "@/components/ui/primitives";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { GalleryGrid } from "@/components/marketing/gallery-grid";
import { FinalCta } from "@/components/marketing/final-cta";
import type { ProductWithTranslation } from "@/server/services/catalog";
import { PHOTOBOOK_ENTRIES } from "@/lib/content/photobooks";

export const dynamic = "force-dynamic";


export function generateStaticParams() {
  return PHOTOBOOK_ENTRIES.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  const entry = PHOTOBOOK_ENTRIES.find((e) => e.slug === slug);
  if (!entry) return {};
  const copy = locale === "en" ? entry.en : entry.fr;
  return buildMetadata({
    locale,
    path: `/photobooks/${slug}`,
    title: copy.title,
    description: copy.lede,
  });
}

export default async function PhotobookCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  const t = createTranslator(locale);
  const entry = PHOTOBOOK_ENTRIES.find((e) => e.slug === slug);
  if (!entry) notFound();

  const copy = locale === "en" ? entry.en : entry.fr;
  const [packs, faqs, transformations] = await Promise.all([
    getPacks("photobook", locale),
    getFaqs(locale, "livraison"),
    getTransformations(locale),
  ]);

  const focused: ProductWithTranslation[] = entry.focus
    .map((s) => packs.find((p) => p.slug === s))
    .filter((p): p is ProductWithTranslation => Boolean(p));
  const shown = focused.length > 0 ? focused : packs;

  const url = `${site.url}${localePath(locale, `/photobooks/${slug}`)}`;
  const jsonLd = [
    breadcrumbJsonLd([
      { name: t("nav.home"), url: `${site.url}${localePath(locale, "/")}` },
      { name: t("nav.photobooks"), url: `${site.url}${localePath(locale, "/photobooks")}` },
      { name: copy.title, url },
    ]),
    ...shown.map((pack) =>
      productJsonLd({
        name: pack.name,
        description: pack.tagline ?? pack.name,
        priceMillimes: pack.priceMillimes,
        url,
      }),
    ),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      <Section tone="paper" className="!pb-10 !pt-14 md:!pt-20">
        <Container>
          <div className="max-w-3xl">
            <Eyebrow>{copy.eyebrow}</Eyebrow>
            <h1 className="heading-1 mt-6 text-ink">{copy.title}</h1>
            <p className="mt-7 body-lg text-graphite">{copy.lede}</p>
            <ButtonLink href={localePath(locale, "/commande/service")} size="lg" className="mt-9">
              {t("home.photobooks.cta")}
              <ArrowIcon />
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <Section tone="cream" className="!py-14 md:!py-20">
        <Container>
          <ul className="grid gap-10 sm:grid-cols-2">
            {copy.items.map((item, index) => (
              <li key={item.title}>
                <Reveal delay={index * 70}>
                  <div className="border-t border-line pt-6">
                    <h2 className="font-display text-[1.0625rem] text-ink">{item.title}</h2>
                    <p className="mt-3 max-w-[46ch] text-[0.9375rem] leading-relaxed text-graphite">
                      {item.body}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section tone="paper">
        <Container>
          <Reveal>
            <h2 className="heading-2 text-ink">{t("home.photobooks.eyebrow")}</h2>
          </Reveal>
          <ul className="mt-12 grid gap-6 md:grid-cols-2">
            {shown.map((pack) => (
              <li key={pack.id} className="flex">
                <Reveal className="flex w-full">
                  <article className="flex w-full flex-col rounded-md border border-line bg-paper p-7 md:p-8">
                    <h3 className="heading-3 text-ink">{pack.name}</h3>
                    <p className="mt-2 text-[0.9375rem] text-stone">{pack.tagline}</p>
                    <div className="mt-6">
                      <Price millimes={pack.priceMillimes} />
                    </div>
                    <Rule className="my-6" />
                    <ul className="flex-1 space-y-3">
                      {pack.features.map((feature) => (
                        <CheckItem key={feature}>{feature}</CheckItem>
                      ))}
                    </ul>
                    <p className="mt-6 text-[0.8125rem] text-stone">
                      {t("common.estimated")} : {pack.turnaroundDaysMin}–{pack.turnaroundDaysMax}{" "}
                      {t("common.days")}
                    </p>
                    <ButtonLink
                      href={`${localePath(locale, "/commande/service")}?pack=${pack.slug}`}
                      variant={pack.isFeatured ? "accent" : "secondary"}
                      className="mt-6 w-full"
                    >
                      {t("home.packs.cta")}
                    </ButtonLink>
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section tone="cream">
        <Container>
          <Reveal>
            <h2 className="heading-2 text-ink">{t("home.gallery.title")}</h2>
          </Reveal>
          <div className="mt-12">
            <GalleryGrid locale={locale} items={transformations.slice(0, 3)} columns={2} />
          </div>
        </Container>
      </Section>

      <Section tone="paper" className="!py-16 md:!py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <h2 className="heading-2 text-ink">{t("faq.title")}</h2>
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
