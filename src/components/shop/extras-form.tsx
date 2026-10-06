"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { priceLabel } from "@/lib/utils";
import { SubmitButton } from "./submit-button";

export type ExtraOption = {
  id: string;
  name: string;
  tagline: string | null;
  priceMillimes: number;
  maxQuantity: number;
  pricingMode: string;
};

/**
 * Étape 3 — les options.
 *
 * Rien n'est pré-coché : proposer des options déjà sélectionnées est le genre
 * de détail qui fait douter du prix final. Le client ajoute, voit le total
 * évoluer dans le récapitulatif, et décide.
 *
 * Les quantités sont sérialisées dans un champ unique : la Server Action
 * relit et borne chaque valeur côté serveur, le navigateur ne fait que
 * proposer.
 */
export function ExtrasForm({
  extras,
  initial,
  locale,
  action,
  labels,
}: {
  extras: ExtraOption[];
  initial: Record<string, number>;
  locale: string;
  action: (formData: FormData) => Promise<void>;
  labels: {
    continue: string;
    skip: string;
    saving: string;
    perPhoto: string;
    quantity: string;
  };
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>(initial);
  const selectedCount = Object.values(quantities).filter((value) => value > 0).length;

  const update = (id: string, value: number, max: number) => {
    const next = Math.max(0, Math.min(max || 99, Number.isFinite(value) ? Math.trunc(value) : 0));
    setQuantities((current) => ({ ...current, [id]: next }));
  };

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="extrasPayload" value={JSON.stringify(quantities)} />

      {extras.map((extra) => {
        const quantity = quantities[extra.id] ?? 0;
        const max = extra.maxQuantity ?? 99;
        const active = quantity > 0;
        // Un pas-à-pas est agréable jusqu'à dix ; au-delà on saisit un nombre.
        const stepper = max <= 10;

        return (
          <div
            key={extra.id}
            className={cn(
              "rounded-md border bg-paper p-5 transition-editorial md:p-6",
              active ? "border-champagne" : "border-line hover:border-line-strong",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0 max-w-lg">
                <h3 className="font-display text-[1.125rem] text-ink">{extra.name}</h3>
                {extra.tagline ? (
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-stone">{extra.tagline}</p>
                ) : null}
                <p className="mt-3 text-[0.875rem] text-graphite">
                  {priceLabel(extra.priceMillimes, locale)}
                  {extra.pricingMode === "per_photo" ? (
                    <span className="ms-1.5 text-muted">/ {labels.perPhoto}</span>
                  ) : null}
                </p>
              </div>

              {stepper ? (
                <div className="flex items-center gap-1 rounded-sm border border-line-strong">
                  {/* Champ réel : le formulaire fonctionne aussi sans
                      JavaScript, la Server Action relit `extra:<id>`. */}
                  <input type="hidden" name={`extra:${extra.id}`} value={quantity} />
                  <StepButton
                    sign="−"
                    label="−"
                    disabled={quantity === 0}
                    onClick={() => update(extra.id, quantity - 1, max)}
                  />
                  <span
                    aria-live="polite"
                    className="w-10 text-center text-[0.9375rem] tabular-nums text-ink"
                  >
                    {quantity}
                  </span>
                  <StepButton
                    sign="+"
                    label="+"
                    disabled={quantity >= max}
                    onClick={() => update(extra.id, quantity + 1, max)}
                  />
                </div>
              ) : (
                <label className="flex items-center gap-3">
                  <span className="text-[0.8125rem] uppercase tracking-[0.1em] text-stone">
                    {labels.quantity}
                  </span>
                  <input
                    type="number"
                    name={`extra:${extra.id}`}
                    inputMode="numeric"
                    min={0}
                    max={max}
                    value={quantity}
                    onChange={(event) => update(extra.id, Number(event.target.value), max)}
                    className="w-20 rounded-sm border border-line-strong bg-paper px-3 py-2 text-center text-[0.9375rem] tabular-nums text-ink focus:border-champagne focus:outline-none"
                  />
                  <span className="text-[0.8125rem] text-muted">/ {max}</span>
                </label>
              )}
            </div>
          </div>
        );
      })}

      <div className="mt-6 flex flex-wrap gap-4">
        <SubmitButton
          label={selectedCount > 0 ? labels.continue : labels.skip}
          pendingLabel={labels.saving}
          size="lg"
        />
      </div>
    </form>
  );
}

function StepButton({
  sign,
  label,
  disabled,
  onClick,
}: {
  sign: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center text-[1.125rem] text-ink transition-fast hover:text-champagne-deep disabled:opacity-30"
    >
      {sign}
    </button>
  );
}
