import type { Metadata } from "next";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { getPacks, getProductById } from "@/server/services/catalog";
import { db } from "@/server/db";
import { productExtras } from "@/server/db/schema";
import { buildMetadata, breadcrumbJsonLd, jsonLdScript, productJsonLd } from "@/lib/seo";
import { site } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { CheckItem, Container, Eyebrow, Price, Reveal, Rule, Section, SectionHeading } from "@/components/ui/primitives";
import { ArrowIcon } from "@/components/ui/primitives";
import { FinalCta } from "@/components/marketing/final-cta";
import { eq } from "drizzle-orm";
import type { ProductWithTranslation } from "@/server/services/catalog";

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
    path: "/tarifs",
    title: locale === "en" ? "Pricing — photo restoration & photobooks" : "Tarifs — restauration photo & photobooks",
    description: t("home.packs.title"),
  });
}

async function extrasFor(packId: string, locale: Locale) {
  const rows = await db
    .select({ extraId: productExtras.extraId })
    .from(productExtras)
    .where(eq(productExtras.packId, packId));
  const extras: ProductWithTranslation[] = [];
  for (const row of rows) {
    const product = await getProductById(row.extraId, locale);
    if (product) extras.push(product);
  }
  return extras;
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);

  const [digital, photobooks] = await Promise.all([
    getPacks("digital", locale),
    getPacks("photobook", locale),
  ]);

  const allExtras = await Promise.all(
    [...digital, ...photobooks].map(async (pack) => ({ pack, extras: await extrasFor(pack.id, locale) })),
  );
  const digitalExtras = allExtras.find((e) => e.pack.family === "digital")?.extras ?? [];
  const photobookExtras = allExtras.find((e) => e.pack.family === "photobook")?.extras ?? [];

  const url = `${site.url}${localePath(locale, "/tarifs")}`;
  const jsonLd = [
    breadcrumbJsonLd([
      { name: t("nav.home"), url: `${site.url}${localePath(locale, "/")}` },
      { name: t("nav.pricing"), url },
    ]),
    ...[...digital, ...photobooks].map((pack) =>
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
            <Eyebrow>{t("nav.pricing")}</Eyebrow>
            <h1 className="heading-1 mt-6 text-ink">
              {locale === "en" ? "Clear pricing, no surprises" : "Des tarifs clairs, sans mauvaise surprise"}
            </h1>
            <p className="mt-7 body-lg text-graphite">{t("home.packs.title")}</p>
          </div>
        </Container>
      </Section>

      {/* Restauration numérique */}
      <Section tone="paper" className="!pt-8">
        <Container>
          <Reveal>
            <SectionHeading eyebrow={t("home.packs.eyebrow")} title={t("home.packs.eyebrow")} />
          </Reveal>
          <ul className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
            {digital.map((pack) => (
              <li key={pack.id} className="flex">
                <Reveal className="flex w-full">
                  <article
                    className={`flex w-full flex-col rounded-md border bg-paper p-7 ${
                      pack.isFeatured ? "border-champagne shadow-sm" : "border-line"
                    }`}
                  >
                    <h2 className="heading-3 text-ink">{pack.name}</h2>
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

          <div className="mt-12 border-y border-line py-8">
            <p className="eyebrow text-stone">{t("home.packs.optionsLabel")}</p>
            <ul className="mt-6 grid gap-6 sm:grid-cols-3">
              {digitalExtras.map((extra) => (
                <li key={extra.id} className="flex items-baseline justify-between gap-4">
                  <span>
                    <span className="block text-[0.9375rem] text-ink">{extra.name}</span>
                    <span className="mt-1 block text-[0.8125rem] text-stone">{extra.tagline}</span>
                  </span>
                  <Price millimes={extra.priceMillimes} size="sm" />
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      {/* Photobooks */}
      <Section tone="cream">
        <Container>
          <Reveal>
            <SectionHeading eyebrow={t("home.photobooks.eyebrow")} title={t("home.photobooks.eyebrow")} />
          </Reveal>
          <ul className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
            {photobooks.map((pack) => (
              <li key={pack.id} className="flex">
                <Reveal className="flex w-full">
                  <article className="flex w-full flex-col rounded-md border border-line bg-paper p-7">
                    <h2 className="heading-3 text-ink">{pack.name}</h2>
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

          <div className="mt-12 border-y border-line py-8">
            <p className="eyebrow text-stone">{t("home.photobooks.optionsLabel")}</p>
            <ul className="mt-6 grid gap-6 sm:grid-cols-3">
              {photobookExtras.map((extra) => (
                <li key={extra.id} className="flex items-baseline justify-between gap-4">
                  <span>
                    <span className="block text-[0.9375rem] text-ink">{extra.name}</span>
                    <span className="mt-1 block text-[0.8125rem] text-stone">{extra.tagline}</span>
                  </span>
                  <Price millimes={extra.priceMillimes} size="sm" />
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-10 max-w-[62ch] text-[0.875rem] leading-relaxed text-stone">
            {locale === "en"
              ? "All prices are in Tunisian dinars, inclusive of tax. Bank transfer, cash at the workshop and cash on delivery are accepted."
              : "Tous les prix sont en dinars tunisiens, toutes taxes comprises. Règlement par virement bancaire, en espèces à l'atelier ou à la livraison."}
          </p>
        </Container>
      </Section>

      <Section tone="paper" className="!py-16">
        <Container>
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="heading-2 text-ink">
                {locale === "en" ? "Not sure which pack to choose?" : "Vous hésitez sur la formule ?"}
              </h2>
              <p className="mt-5 body-lg text-graphite">
                {locale === "en"
                  ? "Send us your photographs first: we tell you what can be done and you only pay for what you send."
                  : "Envoyez d'abord vos photographies : nous vous disons ce qui est possible, et vous ne payez que ce que vous envoyez."}
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <ButtonLink href={localePath(locale, "/commande/service")} size="lg">
                  {t("nav.cta")}
                  <ArrowIcon />
                </ButtonLink>
                <ButtonLink href={localePath(locale, "/contact")} variant="secondary" size="lg">
                  {t("nav.contact")}
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      <FinalCta locale={locale} />
    </>
  );
}
