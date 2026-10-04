import { createTranslator, raw, type Locale } from "@/lib/i18n";
import { Container, Section, SectionHeading, Reveal } from "@/components/ui/primitives";

type Step = { title: string; body: string };

export function HowItWorks({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  const steps = raw<Step[]>(locale, "home.how.steps") ?? [];

  return (
    <Section tone="cream">
      <Container>
        <Reveal>
          <SectionHeading eyebrow={t("home.how.eyebrow")} title={t("home.how.title")} />
        </Reveal>

        <ol className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Reveal delay={index * 90}>
                <div className="border-t border-line pt-7">
                  <span className="font-display text-[2.5rem] leading-none text-line-strong">
                    0{index + 1}
                  </span>
                  <div className="mt-4 h-px w-8 bg-champagne" />
                  <h3 className="mt-6 heading-3 text-ink">{step.title}</h3>
                  <p className="mt-3 max-w-[42ch] text-[0.9375rem] leading-relaxed text-graphite">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>

        <Reveal delay={280}>
          <div className="mt-16 max-w-2xl border-s-2 border-champagne ps-6">
            <h3 className="heading-3 text-ink">{t("home.how.reassuranceTitle")}</h3>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-graphite">
              {t("home.how.reassuranceBody")}
            </p>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
