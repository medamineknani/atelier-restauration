import type { Metadata } from "next";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { getFaqs } from "@/server/services/content";
import { buildMetadata, breadcrumbJsonLd, faqJsonLd, jsonLdScript } from "@/lib/seo";
import { site } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { ArrowIcon, Container, Eyebrow, Reveal, Section } from "@/components/ui/primitives";
import { FaqAccordion } from "@/components/marketing/faq-accordion";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);
  return buildMetadata({ locale, path: "/faq", title: t("faq.title"), description: t("faq.lede") });
}

const CATEGORY_KEYS = ["service", "qualite", "upload", "prix", "confidentialite", "livraison"] as const;

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);
  const faqs = await getFaqs(locale);

  const url = `${site.url}${localePath(locale, "/faq")}`;
  const jsonLd = [
    faqJsonLd(faqs),
    breadcrumbJsonLd([
      { name: t("nav.home"), url: `${site.url}${localePath(locale, "/")}` },
      { name: t("nav.faq"), url },
    ]),
  ];

  const grouped = CATEGORY_KEYS.map((category) => ({
    category,
    entries: faqs.filter((entry) => entry.category === category),
  })).filter((group) => group.entries.length > 0);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      <Section tone="paper" className="!pb-10 !pt-14 md:!pt-20">
        <Container>
          <div className="max-w-3xl">
            <Eyebrow>{t("home.faq.eyebrow")}</Eyebrow>
            <h1 className="heading-1 mt-6 text-ink">{t("faq.title")}</h1>
            <p className="mt-7 body-lg text-graphite">{t("faq.lede")}</p>
          </div>
        </Container>
      </Section>

      <Section tone="paper" className="!pt-6">
        <Container>
          <div className="grid gap-14">
            {grouped.map((group, index) => (
              <div key={group.category}>
                <Reveal delay={index * 60}>
                  <h2 className="eyebrow text-champagne-deep">
                    {t(`faq.categories.${group.category}` as never) || group.category}
                  </h2>
                  <div className="mt-6">
                    <FaqAccordion items={group.entries} />
                  </div>
                </Reveal>
              </div>
            ))}
          </div>

          <Reveal>
            <div className="mt-20 border-t border-line pt-12">
              <h2 className="heading-2 text-ink">
                {locale === "en" ? "Still a question?" : "Une question qui n'est pas là ?"}
              </h2>
              <p className="mt-4 max-w-[52ch] text-[0.9375rem] text-graphite">
                {locale === "en"
                  ? "Write to us and tell us what photographs you have. We answer within 24 hours."
                  : "Écrivez-nous et dites-nous quelles photographies vous avez. Nous répondons sous 24 heures."}
              </p>
              <ButtonLink href={localePath(locale, "/contact")} variant="secondary" size="lg" className="mt-8">
                {t("nav.contact")}
                <ArrowIcon />
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
