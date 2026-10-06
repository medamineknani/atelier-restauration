import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { Container, Reveal, Section, SectionHeading } from "@/components/ui/primitives";
import { ArrowIcon } from "@/components/ui/primitives";
import Link from "next/link";
import { BeforeAfter } from "./before-after";
import type { TransformationCard } from "@/server/services/content";

export function BeforeAfterSection({
  locale,
  transformation,
}: {
  locale: Locale;
  transformation: TransformationCard | null;
}) {
  const t = createTranslator(locale);

  return (
    <Section tone="cream">
      <Container>
        <Reveal>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow={t("home.beforeAfter.eyebrow")} title={t("home.beforeAfter.title")} />
            <Link
              href={localePath(locale, "/galerie")}
              className="inline-flex shrink-0 items-center gap-2 text-[0.9375rem] text-ink transition-fast hover:text-champagne-deep"
            >
              {t("home.beforeAfter.cta")}
              <ArrowIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-12">
          {transformation?.beforeKey && transformation.afterKey ? (
            <Reveal>
              <BeforeAfter
                beforeSrc={`/api/gallery/${transformation.id}/before`}
                afterSrc={`/api/gallery/${transformation.id}/after`}
                beforeAlt={transformation.altBefore}
                afterAlt={transformation.altAfter}
                beforeLabel={t("common.before")}
                afterLabel={t("common.after")}
                sliderLabel={t("a11y.beforeAfterSlider")}
                width={transformation.width}
                height={transformation.height}
                priority
              />
              <div className="mt-8 max-w-3xl">
                <p className="eyebrow text-stone">{transformation.title}</p>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-graphite">
                  {transformation.workDescription}
                </p>
              </div>
            </Reveal>
          ) : (
            <div className="flex aspect-[3/2] items-center justify-center rounded-sm border border-line bg-sand text-[0.9375rem] text-stone">
              {t("home.beforeAfter.unavailable")}
            </div>
          )}
        </div>
      </Container>
    </Section>
  );
}
