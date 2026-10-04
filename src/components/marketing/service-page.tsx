import Link from "next/link";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/button";
import {
  ArrowIcon,
  CheckItem,
  Container,
  Eyebrow,
  Reveal,
  Rule,
  Section,
} from "@/components/ui/primitives";
import { FaqAccordion } from "./faq-accordion";
import { PacksSection } from "./packs-section";
import { FinalCta } from "./final-cta";
import type { ServicePageContent } from "@/content/pages";
import type { FaqEntry } from "@/server/services/content";
import type { ProductWithTranslation } from "@/server/services/catalog";
import { breadcrumbJsonLd, jsonLdScript, serviceJsonLd } from "@/lib/seo";
import { site } from "@/config/site";

export function ServicePage({
  locale,
  content,
  faqs,
  packs,
}: {
  locale: Locale;
  content: ServicePageContent;
  faqs: FaqEntry[];
  packs: ProductWithTranslation[];
}) {
  const t = createTranslator(locale);
  const path = `/${content.slug}`;
  const url = `${site.url}${localePath(locale, path)}`;

  const jsonLd = [
    serviceJsonLd({
      name: content.title,
      description: content.lede,
      url,
      locale,
    }),
    breadcrumbJsonLd([
      { name: t("nav.home"), url: `${site.url}${localePath(locale, "/")}` },
      { name: content.title, url },
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      {/* En-tête */}
      <Section tone="paper" className="!pb-10 !pt-14 md:!pt-20">
        <Container>
          <div className="max-w-3xl">
            <Eyebrow>{content.eyebrow}</Eyebrow>
            <h1 className="heading-1 mt-6 text-ink">{content.title}</h1>
            <p className="mt-7 body-lg text-graphite">{content.lede}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={localePath(locale, "/commande/service")} size="lg">
                {t("nav.cta")}
                <ArrowIcon />
              </ButtonLink>
              <ButtonLink href={localePath(locale, "/galerie")} variant="secondary" size="lg">
                {t("nav.gallery")}
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>

      {/* Sommaire */}
      <Container>
        <nav aria-label={content.toc} className="border-y border-line py-6">
          <ul className="flex flex-wrap gap-x-8 gap-y-2">
            {content.sections.map((section) => (
              <li key={section.title}>
                <a
                  href={`#${slugifyAnchor(section.title)}`}
                  className="text-[0.875rem] text-stone transition-fast hover:text-ink"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Container>

      {/* Sections */}
      {content.sections.map((section, index) => (
        <Section
          key={section.title}
          id={slugifyAnchor(section.title)}
          tone={index % 2 === 0 ? "paper" : "cream"}
          className="!py-16 md:!py-24"
        >
          <Container>
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-4">
                <Reveal>
                  <h2 className="heading-2 text-ink">{section.title}</h2>
                  <div className="mt-5 h-px w-10 bg-champagne" />
                </Reveal>
              </div>
              <div className="lg:col-span-7 lg:col-start-6">
                <Reveal delay={80}>
                  <div className="editorial">
                    {section.body.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                  {section.list ? (
                    <ul className="mt-10 grid gap-8 sm:grid-cols-2">
                      {section.list.map((item) => (
                        <li key={item.title}>
                          <div className="border-t border-line pt-5">
                            <h3 className="font-display text-[1.0625rem] text-ink">{item.title}</h3>
                            <p className="mt-2 text-[0.875rem] leading-relaxed text-graphite">
                              {item.body}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Reveal>
              </div>
            </div>
          </Container>
        </Section>
      ))}

      {/* Packs */}
      <PacksSection locale={locale} packs={packs} />

      {/* FAQ ciblée */}
      {faqs.length > 0 ? (
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
                    {t("faq.cta" as never) || t("home.faq.cta")}
                  </Link>
                </Reveal>
              </div>
              <div className="lg:col-span-7 lg:col-start-6">
                <FaqAccordion items={faqs} />
              </div>
            </div>
          </Container>
        </Section>
      ) : null}

      {/* Conclusion */}
      <Section tone="paper" className="!py-16 md:!py-24">
        <Container>
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <Rule className="mx-auto mb-10 w-16 border-champagne" />
              <h2 className="heading-2 text-ink">{content.closing.title}</h2>
              <p className="mt-5 body-lg text-graphite">{content.closing.body}</p>
              <ButtonLink href={localePath(locale, "/commande/service")} size="lg" className="mt-9">
                {t("nav.cta")}
                <ArrowIcon />
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </Section>

      <FinalCta locale={locale} />
    </>
  );
}

function slugifyAnchor(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export { CheckItem };
