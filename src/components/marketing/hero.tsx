import Image from "next/image";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { ArrowIcon } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

const HERO_BLUR =
  "data:image/webp;base64,UklGRoACAABXRUJQVlA4THQCAABQHyQBS0gAAAABAAEAQB8A";

export function Hero({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);

  return (
    <section className="relative overflow-hidden bg-paper">
      <div className="container-editorial pb-14 pt-10 md:pb-20 md:pt-16 lg:pb-28 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          {/* Texte */}
          <div className="order-2 lg:order-1 lg:col-span-6">
            <span className="eyebrow text-champagne-deep">{t("home.hero.eyebrow")}</span>

            <h1 className="display mt-6 text-ink">{t("home.hero.title")}</h1>

            <p className="mt-7 max-w-[46ch] body-lg text-graphite">{t("home.hero.lede")}</p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <ButtonLink href={localePath(locale, "/commande/service")} size="lg" className="sm:w-auto">
                {t("home.hero.ctaPrimary")}
                <ArrowIcon />
              </ButtonLink>
              <ButtonLink
                href={localePath(locale, "/photobooks")}
                variant="secondary"
                size="lg"
                className="sm:w-auto"
              >
                {t("home.hero.ctaSecondary")}
              </ButtonLink>
            </div>

            <p className="mt-8 flex items-start gap-2 text-[0.8125rem] leading-relaxed text-stone">
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-champagne"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
              >
                <rect x="3" y="7" width="10" height="7" rx="1" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" strokeLinecap="round" />
              </svg>
              {t("home.hero.trustLine")}
            </p>
          </div>

          {/* Image */}
          <div className="order-1 lg:order-2 lg:col-span-6 lg:col-start-7 lg:me-[calc(50%-50vw+3rem)] lg:-me-12">
            <div className="relative overflow-hidden rounded-sm bg-sand">
              <Image
                src="/images/hero-atelier.avif"
                alt={t("home.hero.alt")}
                width={1800}
                height={1200}
                priority
                fetchPriority="high"
                sizes="(max-width: 1024px) 100vw, 55vw"
                placeholder="blur"
                blurDataURL={HERO_BLUR}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
