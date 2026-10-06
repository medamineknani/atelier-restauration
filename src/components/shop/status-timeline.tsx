import { createTranslator, type Locale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";

export type TimelineStep = { status: string; at: Date; note: string | null };

/**
 * Suivi de commande.
 *
 * Chaque étape est datée : le client ne devrait jamais avoir à écrire pour
 * savoir où en sont ses photographies.
 */
export function StatusTimeline({
  steps,
  locale,
  title,
}: {
  steps: TimelineStep[];
  locale: Locale;
  title: string;
}) {
  const t = createTranslator(locale);
  if (steps.length === 0) return null;

  const last = steps.length - 1;

  return (
    <section>
      <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-stone">{title}</h2>

      <ol className="mt-6">
        {steps.map((step, index) => {
          const isLast = index === last;
          return (
            <li key={`${step.status}-${step.at.toISOString()}`} className="relative flex gap-4 pb-7">
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[5px] top-4 h-full w-px bg-line"
                />
              ) : null}

              <span
                aria-hidden="true"
                className={
                  isLast
                    ? "relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full bg-champagne ring-4 ring-champagne-soft"
                    : "relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full bg-line-strong"
                }
              />

              <div className="min-w-0 -mt-0.5">
                <p
                  className={
                    isLast
                      ? "text-[0.9375rem] font-medium text-ink"
                      : "text-[0.9375rem] text-graphite"
                  }
                >
                  {t(`status.${statusKey(step.status)}` as "status.draft")}
                </p>
                <p className="mt-0.5 text-[0.8125rem] text-muted">
                  {formatDateTime(step.at, locale)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Les brouillons ne s'affichent jamais au client : on les ramène à « reçue ». */
function statusKey(status: string) {
  return status === "draft" ? "received" : status;
}
