import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Petites briques du back-office.
 *
 * Volontairement distinctes des composants publics : ici on optimise la
 * densité et la lisibilité sur de longues sessions, pas la mise en scène.
 */

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-md border border-line bg-paper", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
          <h2 className="text-[0.75rem] uppercase tracking-[0.14em] text-stone">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-line bg-paper px-5 py-4">
      <p className="text-[0.75rem] uppercase tracking-[0.14em] text-stone">{label}</p>
      <p className="mt-2 font-display text-[1.5rem] leading-none tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-2 text-[0.8125rem] text-muted">{hint}</p> : null}
    </div>
  );
}

export function AdminButton({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-ink text-paper hover:bg-ink-soft disabled:opacity-40",
    secondary: "border border-line-strong bg-paper text-ink hover:border-champagne hover:bg-cream",
    ghost: "text-graphite hover:bg-cream hover:text-ink",
    danger: "border border-danger/40 text-danger hover:bg-danger/5",
  }[variant];

  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-[0.875rem] font-medium transition-fast disabled:cursor-not-allowed",
        styles,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AdminLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="text-[0.8125rem] font-medium text-ink">{children}</span>
      {hint ? <span className="mt-1 block text-[0.75rem] text-muted">{hint}</span> : null}
    </label>
  );
}

export const adminInputClass =
  "w-full rounded-sm border border-line bg-paper px-3 py-2 text-[0.875rem] text-ink placeholder:text-muted focus:border-champagne focus:outline-none disabled:bg-sand disabled:text-stone";

export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="px-1 py-8 text-center text-[0.875rem] text-muted">{children}</p>;
}

/** Ligne « libellé → valeur », pour les fiches de synthèse. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2.5 last:border-0">
      <dt className="text-[0.8125rem] text-stone">{label}</dt>
      <dd className="text-right text-[0.875rem] text-ink">{children}</dd>
    </div>
  );
}
