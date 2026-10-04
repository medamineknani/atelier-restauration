import Link from "next/link";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/button";
import { CheckItem, Container, Price, Reveal, Rule, Section, SectionHeading } from "@/components/ui/primitives";
import type { ProductWithTranslation } from "@/server/services/catalog";
import { cn } from "@/lib/utils";

export function PacksSection({
  locale,
  packs,
}: {
  locale: Locale;
  packs: ProductWithTranslation[];
}) {
  const t = createTranslator(locale);

  return (
    <Section tone="paper" id="packs">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={t("home.packs.eyebrow")}
            title={t("home.packs.title")}
            align="center"
            className="mx-auto"
          />
        </Reveal>

        <ul className="mt-16 grid items-stretch gap-6 md:grid-cols-3">
          {packs.map((pack, index) => (
            <li key={pack.id} className="flex">
              <Reveal delay={index * 90} className="flex w-full">
                <article
                  className={cn(
                    "flex w-full flex-col rounded-md border bg-paper p-7 transition-editorial hover:shadow-md md:p-8",
                    pack.isFeatured ? "border-champagne shadow-sm" : "border-line hover:border-line-strong",
                  )}
                >
                  {pack.isFeatured ? (
                    <span className="eyebrow mb-5 text-champagne-deep">{t("home.packs.mostChosen")}</span>
                  ) : (
                    <span className="eyebrow mb-5 text-transparent" aria-hidden="true">
                      &nbsp;
                    </span>
                  )}

                  <h3 className="heading-3 text-ink">{pack.name}</h3>
                  <p className="mt-2 text-[0.9375rem] text-stone">{pack.tagline}</p>

                  <div className="mt-7">
                    <Price millimes={pack.priceMillimes} />
                  </div>

                  <Rule className="my-7" />

                  <ul className="flex-1 space-y-3">
                    {pack.features.map((feature) => (
                      <CheckItem key={feature}>{feature}</CheckItem>
                    ))}
                  </ul>

                  <p className="mt-7 text-[0.8125rem] text-stone">
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

        <div className="mt-12 text-center">
          <p className="text-[0.8125rem] text-stone">
            <span className="eyebrow text-stone">{t("home.packs.optionsLabel")}</span>
            <span className="mt-2 block text-[0.875rem]">{t("home.packs.options")}</span>
          </p>
          <Link
            href={localePath(locale, "/tarifs")}
            className="mt-6 inline-block text-[0.9375rem] text-ink underline underline-offset-4 transition-fast hover:text-champagne-deep"
          >
            {t("home.packs.allPacks")}
          </Link>
        </div>
      </Container>
    </Section>
  );
}
