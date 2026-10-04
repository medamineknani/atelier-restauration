import type { Metadata } from "next";
import { createTranslator, localePath, raw, type Locale } from "@/lib/i18n";
import { buildMetadata, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";
import { site } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { Container, Eyebrow, Reveal, Rule, Section } from "@/components/ui/primitives";
import { FinalCta } from "@/components/marketing/final-cta";
import Link from "next/link";

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
    path: "/confidentialite",
    title: t("trust.title"),
    description: t("trust.lede"),
  });
}

type Journey = { title: string; body: string };
type Retention = { label: string; duration: string };

export default async function TrustPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);

  const journey = raw<Journey[]>(locale, "trust.journey") ?? [];
  const never = raw<string[]>(locale, "trust.never") ?? [];
  const retention = raw<Retention[]>(locale, "trust.retention") ?? [];

  const url = `${site.url}${localePath(locale, "/confidentialite")}`;
  const jsonLd = [
    breadcrumbJsonLd([
      { name: t("nav.home"), url: `${site.url}${localePath(locale, "/")}` },
      { name: t("nav.trust"), url },
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      {/* 1. Promesse */}
      <Section tone="ink" className="!py-20 md:!py-28">
        <Container>
          <div className="max-w-3xl">
            <Eyebrow tone="onDark">{t("nav.trust")}</Eyebrow>
            <h1 className="heading-1 mt-6 text-paper">{t("trust.title")}</h1>
            <p className="mt-7 body-lg text-paper/70">{t("trust.lede")}</p>
          </div>
        </Container>
      </Section>

      {/* 2. Le parcours d'une photo */}
      <Section tone="paper">
        <Container>
          <Reveal>
            <h2 className="heading-2 text-ink">{t("trust.journeyTitle")}</h2>
          </Reveal>

          <ol className="mt-14 grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {journey.map((step, index) => (
              <li key={step.title} className="bg-paper p-7">
                <Reveal delay={index * 60}>
                  <span className="font-display text-[0.875rem] tabular-nums text-champagne-deep">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="mt-4 h-px w-8 bg-champagne" />
                  <h3 className="mt-5 font-display text-[1.0625rem] text-ink">{step.title}</h3>
                  <p className="mt-3 text-[0.875rem] leading-relaxed text-graphite">{step.body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* 3. Ce que nous ne faisons jamais */}
      <Section tone="cream">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <Reveal>
                <h2 className="heading-2 text-ink">{t("trust.neverTitle")}</h2>
                <Rule className="mt-6 w-12 border-champagne" />
              </Reveal>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <Reveal delay={80}>
                <ul className="space-y-5">
                  {never.map((item) => (
                    <li key={item} className="flex gap-4 text-[0.9375rem] leading-relaxed text-graphite">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        className="mt-1 h-4 w-4 shrink-0 text-danger"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                      >
                        <path d="M4 4l8 8M12 4l-8 8" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      {/* 4. Durées de conservation */}
      <Section tone="paper">
        <Container>
          <Reveal>
            <h2 className="heading-2 text-ink">{t("trust.retentionTitle")}</h2>
          </Reveal>

          <div className="mt-10 max-w-3xl border-y border-line">
            <table className="w-full text-start text-[0.9375rem]">
              <caption className="sr-only">{t("trust.retentionTitle")}</caption>
              <tbody className="divide-y divide-line">
                {retention.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="py-4 text-start font-normal text-graphite">
                      {row.label}
                    </th>
                    <td className="py-4 text-end font-display text-[1.0625rem] text-ink">
                      {row.duration}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 max-w-[62ch] text-[0.8125rem] leading-relaxed text-stone">
            {locale === "en"
              ? "You can request immediate deletion at any time: it takes one click in your account, or one email to us."
              : "Vous pouvez demander une suppression immédiate à tout moment : un clic dans votre espace, ou un email."}
          </p>
        </Container>
      </Section>

      {/* 5. Droits & sécurité */}
      <Section tone="cream">
        <Container>
          <div className="grid gap-12 md:grid-cols-2">
            <Reveal>
              <h2 className="heading-2 text-ink">{t("trust.rightsTitle")}</h2>
              <p className="mt-5 max-w-[52ch] text-[0.9375rem] leading-relaxed text-graphite">
                {t("trust.rightsBody")}
              </p>
              <ButtonLink href={localePath(locale, "/contact")} variant="secondary" className="mt-8">
                {t("trust.cta")}
              </ButtonLink>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="heading-2 text-ink">{t("trust.securityTitle")}</h2>
              <p className="mt-5 max-w-[52ch] text-[0.9375rem] leading-relaxed text-graphite">
                {t("trust.securityBody")}
              </p>
              <Link
                href={localePath(locale, "/politique-confidentialite")}
                className="mt-8 inline-block text-[0.9375rem] text-ink underline underline-offset-4 transition-fast hover:text-champagne-deep"
              >
                {t("footer.privacy")}
              </Link>
            </Reveal>
          </div>
        </Container>
      </Section>

      <FinalCta locale={locale} />
    </>
  );
}
