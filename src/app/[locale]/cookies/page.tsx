import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { getLegalPage } from "@/content/legal";
import { site } from "@/config/site";
import { buildMetadata, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";
import { Container, Eyebrow, Reveal, Rule, Section } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";
const SLUG = "cookies";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const page = getLegalPage(SLUG, locale);
  if (!page) return {};
  return {
    ...buildMetadata({
      locale,
      path: `/${SLUG}`,
      title: page.title,
      description: page.sections[0]?.paragraphs[0] ?? page.title,
      noIndex: false,
    }),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);
  const page = getLegalPage(SLUG, locale);
  if (!page) notFound();

  const jsonLd = [
    breadcrumbJsonLd([
      { name: t("nav.home"), url: `${site.url}${localePath(locale, "/")}` },
      { name: page.title, url: `${site.url}${localePath(locale, `/${SLUG}`)}` },
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <Section tone="paper" className="!pb-10 !pt-14 md:!pt-20">
        <Container>
          <div className="max-w-3xl">
            <Eyebrow>{page.updated}</Eyebrow>
            <h1 className="heading-1 mt-6 text-ink">{page.title}</h1>
          </div>
        </Container>
      </Section>

      <Section tone="paper" className="!pt-4">
        <Container>
          <div className="max-w-3xl space-y-12 pb-8">
            {page.sections.map((section, index) => (
              <Reveal key={section.title} delay={index * 50}>
                <h2 className="heading-3 text-ink">{section.title}</h2>
                <Rule className="my-5 w-10 bg-champagne" />
                <div className="editorial">
                  {section.paragraphs.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
          <p className="max-w-3xl border-t border-line pt-8 text-[0.8125rem] leading-relaxed text-stone">
            {
              locale === "en"
                ? "These texts provide a structure and a first draft. They must be reviewed by a Tunisian lawyer before commercial launch (consumer law, INPDP — law n° 2004-63 on personal data)."
                : "Ces textes constituent une structure et une base rédactionnelle. Ils doivent être relus par un juriste tunisien avant la mise en exploitation commerciale (droit de la consommation, INPDP — loi n° 2004-63 relative aux données personnelles)."
            }
          </p>
        </Container>
      </Section>
    </>
  );
}
