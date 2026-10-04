import { site } from "@/config/site";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/button";
import { ArrowIcon, Container, Reveal, Section } from "@/components/ui/primitives";

export function FinalCta({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);

  return (
    <Section tone="ink">
      <Container>
        <Reveal>
          <div className="max-w-2xl">
            <span className="eyebrow text-champagne">{t("home.finalCta.eyebrow")}</span>
            <h2 className="heading-1 mt-6 text-paper">{t("home.finalCta.title")}</h2>
            <p className="mt-6 body-lg text-paper/70">{t("home.finalCta.lede")}</p>

            <ButtonLink
              href={localePath(locale, "/commande/service")}
              variant="accent"
              size="lg"
              className="mt-10"
            >
              {t("home.finalCta.cta")}
              <ArrowIcon />
            </ButtonLink>

            <div className="mt-16 border-t border-paper/15 pt-8">
              <p className="eyebrow text-champagne">{t("home.finalCta.directTitle")}</p>
              <ul className="mt-5 space-y-2 text-[0.9375rem] text-paper/80">
                <li>
                  <a href={`tel:${site.phoneHref}`} className="transition-fast hover:text-paper">
                    {site.phone}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${site.email}`} className="transition-fast hover:text-paper">
                    {site.email}
                  </a>
                </li>
                <li>
                  <a
                    href={`https://wa.me/${site.whatsapp.replace(/[^0-9]/g, "")}`}
                    className="transition-fast hover:text-paper"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    WhatsApp
                  </a>
                </li>
              </ul>
              <p className="mt-6 text-[0.8125rem] text-paper/50">
                {t("home.finalCta.reassurance")}
              </p>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
