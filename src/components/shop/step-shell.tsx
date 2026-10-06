import type { ReactNode } from "react";
import { Container, Eyebrow, Section } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Gabarit commun des étapes du tunnel.
 * Une colonne de contenu, un récapitulatif à part sur les grands écrans.
 */
export function StepShell({
  eyebrow,
  title,
  lede,
  children,
  aside,
  footer,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  children: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <Section tone="cream" className="!pt-12 md:!pt-16">
      <Container>
        <div
          className={cn(
            "grid gap-10",
            aside ? "lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16" : "",
            wide ? "" : "max-w-5xl",
            !aside && "mx-auto",
          )}
        >
          <div className={cn(!aside && !wide && "max-w-2xl")}>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="heading-2 mt-5 text-ink">{title}</h1>
            {lede ? <p className="mt-5 body-lg text-graphite">{lede}</p> : null}

            <div className="mt-10 md:mt-12">{children}</div>

            {footer ? <div className="mt-10">{footer}</div> : null}
          </div>

          {aside ? <div className="lg:sticky lg:top-24 lg:self-start">{aside}</div> : null}
        </div>
      </Container>
    </Section>
  );
}
