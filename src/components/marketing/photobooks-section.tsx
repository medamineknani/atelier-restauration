import Image from "next/image";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/button";
import { Container, Price, Reveal, Section } from "@/components/ui/primitives";
import { ArrowIcon } from "@/components/ui/primitives";
import type { ProductWithTranslation } from "@/server/services/catalog";

export function PhotobooksSection({
  locale,
  packs,
}: {
  locale: Locale;
  packs: ProductWithTranslation[];
}) {
  const t = createTranslator(locale);

  return (
    <Section tone="cream">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <Reveal>
              <span className="eyebrow text-champagne-deep">{t("home.photobooks.eyebrow")}</span>
              <h2 className="heading-1 mt-6 text-ink">{t("home.photobooks.title")}</h2>
              <p className="mt-6 max-w-[48ch] body-lg text-graphite">{t("home.photobooks.lede")}</p>

              <ul className="mt-10 divide-y divide-line border-y border-line">
                {packs.map((pack) => (
                  <li key={pack.id}>
                    <a
                      href={`${localePath(locale, "/commande/service")}?pack=${pack.slug}`}
                      className="group flex items-center justify-between gap-4 py-5 transition-fast hover:ps-1"
                    >
                      <span>
                        <span className="block font-display text-[1.0625rem] text-ink transition-fast group-hover:text-champagne-deep">
                          {pack.name}
                        </span>
                        <span className="mt-1 block text-[0.8125rem] text-stone">{pack.tagline}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <Price millimes={pack.priceMillimes} size="sm" />
                        <ArrowIcon className="h-3.5 w-3.5 text-stone transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>

              <p className="mt-8 text-[0.8125rem] text-stone">
                <span className="eyebrow text-stone">{t("home.photobooks.optionsLabel")}</span>
                <span className="mt-2 block text-[0.875rem]">{t("home.photobooks.options")}</span>
              </p>

              <ButtonLink
                href={localePath(locale, "/photobooks")}
                variant="primary"
                size="lg"
                className="mt-9"
              >
                {t("home.photobooks.cta")}
                <ArrowIcon />
              </ButtonLink>
            </Reveal>
          </div>

          <div className="lg:col-span-6">
            <Reveal delay={120}>
              <div className="relative overflow-hidden rounded-sm bg-sand">
                <Image
                  src="/images/photobook-premium.avif"
                  alt="Photobook premium ouvert, reliure lay-flat, photographies anciennes imprimées sur papier mat"
                  width={1400}
                  height={1000}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="h-full w-full object-cover"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </Section>
  );
}
