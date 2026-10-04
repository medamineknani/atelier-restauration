import type { Metadata } from "next";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { site } from "@/config/site";
import { buildMetadata, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";
import { ContactForm } from "@/components/marketing/contact-form";
import { Container, Eyebrow, Reveal, Rule, Section } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);
  return buildMetadata({ locale, path: "/contact", title: t("contact.title"), description: t("contact.lede") });
}

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ envoye?: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const { envoye } = await searchParams;
  const t = createTranslator(locale);

  const url = `${site.url}${localePath(locale, "/contact")}`;
  const jsonLd = [
    breadcrumbJsonLd([
      { name: t("nav.home"), url: `${site.url}${localePath(locale, "/")}` },
      { name: t("nav.contact"), url },
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      <Section tone="paper" className="!pb-12 !pt-14 md:!pt-20">
        <Container>
          <div className="max-w-3xl">
            <Eyebrow>{t("nav.contact")}</Eyebrow>
            <h1 className="heading-1 mt-6 text-ink">{t("contact.title")}</h1>
            <p className="mt-7 body-lg text-graphite">{t("contact.lede")}</p>
          </div>
        </Container>
      </Section>

      <Section tone="paper" className="!pt-4">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              {envoye === "1" ? (
                <div className="rounded-md border border-champagne bg-champagne-soft/40 p-8">
                  <p className="font-display text-[1.25rem] text-ink">{t("contact.sent")}</p>
                </div>
              ) : (
                <Reveal>
                  <ContactForm locale={locale} />
                </Reveal>
              )}
            </div>

            <div className="lg:col-span-4 lg:col-start-9">
              <Reveal delay={80}>
                <h2 className="eyebrow text-stone">{t("contact.directTitle")}</h2>
                <ul className="mt-6 space-y-4 text-[0.9375rem]">
                  <li>
                    <span className="block text-stone">{t("contact.email")}</span>
                    <a
                      href={`mailto:${site.email}`}
                      className="text-ink transition-fast hover:text-champagne-deep"
                    >
                      {site.email}
                    </a>
                  </li>
                  <li>
                    <span className="block text-stone">{t("contact.phone")}</span>
                    <a
                      href={`tel:${site.phoneHref}`}
                      className="text-ink transition-fast hover:text-champagne-deep"
                    >
                      {site.phone}
                    </a>
                  </li>
                  <li>
                    <span className="block text-stone">WhatsApp</span>
                    <a
                      href={`https://wa.me/${site.whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink transition-fast hover:text-champagne-deep"
                    >
                      {site.whatsapp}
                    </a>
                  </li>
                </ul>

                <Rule className="my-8" />

                <h2 className="eyebrow text-stone">{t("contact.hours")}</h2>
                <p className="mt-4 text-[0.9375rem] text-graphite">{site.openingHours}</p>
                <p className="mt-2 text-[0.9375rem] text-graphite">
                  {site.address.street}, {site.address.postalCode} {site.address.city}
                </p>

                <Rule className="my-8" />

                <p className="text-[0.875rem] leading-relaxed text-stone">
                  {t("checkout.privacyNote")}
                </p>
                <a
                  href={localePath(locale, "/confidentialite")}
                  className="mt-3 inline-block text-[0.875rem] text-ink underline underline-offset-4 transition-fast hover:text-champagne-deep"
                >
                  {t("nav.trust")}
                </a>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
