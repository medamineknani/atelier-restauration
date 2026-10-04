import Link from "next/link";
import { createTranslator, localePath, raw, type Locale } from "@/lib/i18n";
import { Container, Eyebrow, Reveal, Section } from "@/components/ui/primitives";
import { ArrowIcon } from "@/components/ui/primitives";

type Item = { title: string; body: string };

export function ValueProps({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  const items = raw<Item[]>(locale, "home.value.items") ?? [];

  return (
    <Section tone="paper">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <Reveal>
              <Eyebrow>{t("home.value.eyebrow")}</Eyebrow>
              <p className="mt-7 font-display text-[1.75rem] leading-[1.25] text-ink md:text-[2.125rem]">
                {t("home.value.line1")}
              </p>
              <p className="mt-6 max-w-[46ch] body-lg text-graphite">{t("home.value.line2")}</p>
              <Link
                href={localePath(locale, "/a-propos")}
                className="rule-expand mt-8 inline-block text-[0.9375rem] text-ink transition-fast hover:text-champagne-deep"
              >
                {t("home.value.linkLabel")}
              </Link>
            </Reveal>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <ul className="space-y-10">
              {items.map((item, index) => (
                <li key={item.title}>
                  <Reveal delay={index * 80}>
                    <div className="flex gap-5">
                      <span className="mt-1 font-display text-[0.875rem] tabular-nums text-champagne-deep">
                        0{index + 1}
                      </span>
                      <div>
                        <div className="h-px w-10 bg-champagne" />
                        <h3 className="mt-5 heading-3 text-ink">{item.title}</h3>
                        <p className="mt-3 max-w-[48ch] text-[0.9375rem] leading-relaxed text-graphite">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>

            <Reveal delay={260}>
              <Link
                href={localePath(locale, "/restauration-photo")}
                className="mt-12 inline-flex items-center gap-2 text-[0.9375rem] text-ink transition-fast hover:text-champagne-deep"
              >
                {t("common.readMore")}
                <ArrowIcon className="h-3.5 w-3.5" />
              </Link>
            </Reveal>
          </div>
        </div>
      </Container>
    </Section>
  );
}
