import type { Metadata } from "next";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { getPageBlocks } from "@/server/services/content";
import { buildMetadata, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";
import { site } from "@/config/site";
import { Container, Eyebrow, Reveal, Rule, Section } from "@/components/ui/primitives";
import { FinalCta } from "@/components/marketing/final-cta";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  return buildMetadata({
    locale,
    path: "/a-propos",
    title: locale === "en" ? "The workshop" : "L'atelier",
    description:
      locale === "en"
        ? "A workshop that restores photographs by hand, in Tunis."
        : "Un atelier qui restaure les photographies à la main, à Tunis.",
  });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);
  const blocks = await getPageBlocks("about", locale);

  const url = `${site.url}${localePath(locale, "/a-propos")}`;
  const jsonLd = [
    breadcrumbJsonLd([
      { name: t("nav.home"), url: `${site.url}${localePath(locale, "/")}` },
      { name: t("nav.about"), url },
    ]),
  ];

  const fallback = [
    {
      title: locale === "en" ? "Why this workshop" : "Pourquoi cet atelier",
      paragraphs: [
        locale === "en"
          ? "It started with a shoebox. Three hundred photographs, a grandmother who could no longer remember names, and no way to see any of it without removing them from the box one by one."
          : "Tout a commencé avec une boîte à chaussures. Trois cents photographies, une grand-mère qui ne se souvenait plus des prénoms, et aucun moyen de les regarder sans les sortir une par une.",
        locale === "en"
          ? "We restored them all. And we understood that the trade was not retouching: it was looking after."
          : "Nous les avons toutes restaurées. Et nous avons compris que le métier n'était pas la retouche : c'était le soin.",
      ],
    },
    {
      title: locale === "en" ? "Our restoration charter" : "Notre charte de restauration",
      paragraphs: [
        locale === "en"
          ? "We restore, we do not reinvent. Faces are not smoothed, expressions are not altered, nothing that was not in the frame is added."
          : "Nous restaurons, nous ne réinventons pas. Les visages ne sont pas lissés, les expressions ne sont pas modifiées, rien n'est ajouté qui n'était pas dans le cadre.",
        locale === "en"
          ? "A period flaw is part of the photograph. Film grain, a slight motion blur, a hesitant framing: these are traces of life, not errors to be corrected."
          : "Un défaut d'époque fait partie de la photographie. Un grain argentique, un léger flou de bougé, un cadrage hésitant : ce sont des traces de vie, pas des erreurs à corriger.",
        locale === "en"
          ? "And when a photograph cannot be saved, we say so before starting. You are not charged."
          : "Et quand une photographie ne peut pas être sauvée, nous le disons avant de commencer. Vous n'êtes pas facturé.",
      ],
    },
  ];

  // Les blocs viennent de la base (éditables au back-office). À défaut, un
  // texte de repli — jamais une page vide.
  const sections: {
    blockKey: string;
    title: string | null;
    content: string | null;
  }[] =
    blocks.length > 0
      ? blocks
      : fallback.map((block, index) => ({
          blockKey: `fallback-${index}`,
          title: block.title,
          content: block.paragraphs.join("\n\n"),
        }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      <Section tone="paper" className="!pb-12 !pt-14 md:!pt-20">
        <Container>
          <div className="max-w-3xl">
            <Eyebrow>{t("nav.about")}</Eyebrow>
            <h1 className="heading-1 mt-6 text-ink">
              {locale === "en" ? "We look after photographs." : "Nous prenons soin des photographies."}
            </h1>
            <p className="mt-7 body-lg text-graphite">
              {locale === "en"
                ? "A restoration workshop in Tunis. Every image is worked on by hand, one by one."
                : "Un atelier de restauration à Tunis. Chaque image est travaillée à la main, une par une."}
            </p>
          </div>
        </Container>
      </Section>

      {sections.map((section, index) => (
        <Section
          key={section.blockKey}
          tone={index % 2 === 0 ? "paper" : "cream"}
          className="!py-14 md:!py-20"
        >
          <Container>
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-4">
                <Reveal>
                  <h2 className="heading-2 text-ink">{section.title}</h2>
                  <Rule className="mt-6 w-12 border-champagne" />
                </Reveal>
              </div>
              <div className="lg:col-span-7 lg:col-start-6">
                <Reveal delay={80}>
                  <div className="editorial">
                    {section.content
                      ? section.content
                          .split("\n\n")
                          .map((paragraph, i) => <p key={i}>{paragraph}</p>)
                      : null}
                  </div>
                </Reveal>
              </div>
            </div>
          </Container>
        </Section>
      ))}

      <FinalCta locale={locale} />
    </>
  );
}
