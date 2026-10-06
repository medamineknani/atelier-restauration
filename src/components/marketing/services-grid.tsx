import { createTranslator, localePath, raw, type Locale } from "@/lib/i18n";
import { Container, Reveal, Section, SectionHeading } from "@/components/ui/primitives";
import { ArrowIcon } from "@/components/ui/primitives";
import Link from "next/link";

type Service = { title: string; body: string; cta: string };

const HREFS = ["/restauration-photo", "/photobooks", "/colorisation-photos", "/devis"];

export function ServicesGrid({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  const items = raw<Service[]>(locale, "home.services.items") ?? [];

  return (
    <Section tone="paper">
      <Container>
        <Reveal>
          <SectionHeading eyebrow={t("home.services.eyebrow")} title={t("home.services.title")} />
        </Reveal>

        <ul className="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2">
          {items.map((service, index) => (
            <li key={service.title}>
              <Reveal delay={index * 70}>
                <Link href={localePath(locale, HREFS[index] ?? "/contact")} className="group block">
                  <div className="border-t border-line pt-7 transition-editorial group-hover:border-champagne">
                    <h3 className="heading-3 text-ink transition-fast group-hover:text-champagne-deep">
                      {service.title}
                    </h3>
                    <p className="mt-3 max-w-[44ch] text-[0.9375rem] leading-relaxed text-graphite">
                      {service.body}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 text-[0.875rem] text-ink">
                      {service.cta}
                      <ArrowIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
