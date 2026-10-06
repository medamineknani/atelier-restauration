import type { Metadata } from "next";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { site } from "@/config/site";
import { buildMetadata, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";
import { ContactForm } from "@/components/marketing/contact-form";
import { CheckItem, Container, Eyebrow, Reveal, Section } from "@/components/ui/primitives";

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
    path: "/devis",
    title: locale === "en" ? "Request a tailor-made quote" : "Demander un devis sur mesure",
    // Sa propre description : reprise telle quelle de la page de contact, le
    // moteur voyait deux pages se disputer la même requête.
    description: t("devis.lede"),
  });
}

export default async function QuotePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);
  const isEn = locale === "en";

  const url = `${site.url}${localePath(locale, "/devis")}`;
  const jsonLd = [
    breadcrumbJsonLd([
      { name: t("nav.home"), url: `${site.url}${localePath(locale, "/")}` },
      { name: isEn ? "Quote" : "Devis", url },
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      <Section tone="paper" className="!pb-10 !pt-14 md:!pt-20">
        <Container>
          <div className="max-w-3xl">
            <Eyebrow>{isEn ? "Sur mesure" : "Sur mesure"}</Eyebrow>
            <h1 className="heading-1 mt-6 text-ink">
              {isEn ? "A collection, an archive, an association" : "Un fonds, une archive, une association"}
            </h1>
            <p className="mt-7 body-lg text-graphite">
              {isEn
                ? "Beyond a hundred photographs, or for an old collection, we work to a tailor-made quote. Tell us what you have: we reply within 24 hours."
                : "Au-delà de cent photographies, ou pour un fonds ancien, nous travaillons sur devis. Dites-nous ce que vous avez : nous répondons sous 24 heures."}
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="paper" className="!pt-4">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <Reveal>
                <ContactForm locale={locale} />
              </Reveal>
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <Reveal delay={80}>
                <h2 className="eyebrow text-stone">
                  {isEn ? "What we handle" : "Ce que nous traitons"}
                </h2>
                <ul className="mt-6 space-y-4">
                  {[
                    isEn ? "Family collections of several hundred prints" : "Fonds familiaux de plusieurs centaines de tirages",
                    isEn ? "Municipal or association archives" : "Archives communales ou associatives",
                    isEn ? "Studio negatives and glass plates" : "Négatifs de studio et plaques de verre",
                    isEn ? "Full scanning of albums and boxes" : "Numérisation complète d'albums et de boîtes",
                    isEn ? "Print runs of several identical books" : "Tirages de plusieurs exemplaires identiques",
                  ].map((item) => (
                    <CheckItem key={item}>{item}</CheckItem>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
