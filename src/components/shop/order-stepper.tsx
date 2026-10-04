"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const WIZARD_STEPS = [
  "service",
  "pack",
  "extras",
  "photos",
  "coordonnees",
  "recapitulatif",
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

/**
 * Fil d'Ariane du tunnel de commande.
 *
 * Il s'affiche sous l'en-tête, discrètement : le client doit savoir où il est
 * sans que le tunnel ne ressemble à un formulaire administratif. Les étapes
 * déjà franchies restent cliquables — revenir en arrière pour changer de pack
 * est un geste normal, pas une erreur.
 */
export function OrderStepper({
  labels,
  base = "",
}: {
  labels: Record<WizardStep, string>;
  /** Préfixe de locale (`""` pour le français, `"/en"` sinon). */
  base?: string;
}) {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  // /fr/commande/pack  ->  "pack"
  const current = segments[segments.length - 1] as WizardStep;

  const index = WIZARD_STEPS.indexOf(current);
  if (index < 0) return null;

  return (
    <nav
      aria-label="Étapes de la commande"
      className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-sm"
    >
      <div className="container-editorial">
        {/* Mobile : étape courante + progression */}
        <div className="flex items-center gap-4 py-3 md:hidden">
          <span className="text-[0.75rem] uppercase tracking-[0.16em] text-stone">
            {index + 1} / {WIZARD_STEPS.length}
          </span>
          <div className="h-px flex-1 overflow-hidden bg-line">
            <div
              className="h-full bg-champagne transition-[width] duration-[520ms]"
              style={{ width: `${((index + 1) / WIZARD_STEPS.length) * 100}%` }}
            />
          </div>
          <span className="font-display text-[0.9375rem] text-ink">{labels[current]}</span>
        </div>

        {/* Desktop : toutes les étapes */}
        <ol className="hidden items-center gap-1 py-3 md:flex">
          {WIZARD_STEPS.map((step, position) => {
            const done = position < index;
            const active = position === index;

            return (
              <li key={step} className="flex items-center gap-1">
                {done ? (
                  <Link
                    href={`${base}/commande/${step}`}
                    className="group flex items-center gap-2 rounded-xs px-2 py-1.5 text-[0.8125rem] text-stone transition-fast hover:text-ink"
                  >
                    <CheckMark />
                    <span>{labels[step]}</span>
                  </Link>
                ) : (
                  <span
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 text-[0.8125rem] transition-fast",
                      active ? "text-ink" : "text-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-4 w-4 items-center justify-center rounded-full border text-[0.625rem] tabular-nums",
                        active
                          ? "border-champagne bg-champagne text-ink"
                          : "border-line-strong text-muted",
                      )}
                    >
                      {position + 1}
                    </span>
                    <span className={active ? "font-medium" : undefined}>{labels[step]}</span>
                  </span>
                )}

                {position < WIZARD_STEPS.length - 1 ? (
                  <span aria-hidden="true" className="px-1 text-line-strong">
                    —
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

function CheckMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 text-champagne"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8.5 6 12l7.5-8" />
    </svg>
  );
}
