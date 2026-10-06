import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */

export function Container({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "header" | "footer" | "article" | "main" | "nav";
}) {
  return <Tag className={cn("container-editorial", className)}>{children}</Tag>;
}

/* -------------------------------------------------------------------------- */

export function Section({
  children,
  className,
  tone = "paper",
  id,
}: {
  children: ReactNode;
  className?: string;
  tone?: "paper" | "cream" | "ink";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "section-y",
        tone === "cream" && "bg-cream",
        tone === "ink" && "bg-ink text-paper",
        tone === "paper" && "bg-paper",
        className,
      )}
    >
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

export function Eyebrow({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "onDark" | "muted";
}) {
  return (
    <span
      className={cn(
        "eyebrow block",
        tone === "default" && "text-champagne-deep",
        tone === "onDark" && "text-champagne",
        tone === "muted" && "text-stone",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "start",
  tone = "default",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "start" | "center";
  tone?: "default" | "onDark";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <Eyebrow tone={tone === "onDark" ? "onDark" : "default"} className="mb-5">
          {eyebrow}
        </Eyebrow>
      ) : null}
      <h2 className={cn("heading-2", tone === "onDark" && "text-paper")}>{title}</h2>
      {lede ? (
        <p
          className={cn(
            "mt-5 body-lg max-w-[62ch]",
            tone === "onDark" ? "text-paper/70" : "text-graphite",
          )}
        >
          {lede}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function Card({
  children,
  className,
  featured = false,
}: {
  children: ReactNode;
  className?: string;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-paper p-6 transition-editorial md:p-8",
        featured ? "border-champagne shadow-md" : "border-line hover:border-line-strong hover:shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function Badge({
  children,
  className,
  tone = "champagne",
}: {
  children: ReactNode;
  className?: string;
  tone?: "champagne" | "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.14em]",
        tone === "champagne" && "bg-champagne-soft text-champagne-deep",
        tone === "neutral" && "bg-sand text-stone",
        tone === "success" && "bg-success/10 text-success",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "danger" && "bg-danger/10 text-danger",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

/** Filet fin — le séparateur signature du design system. */
export function Rule({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

/* -------------------------------------------------------------------------- */

export function Price({
  millimes,
  className,
  size = "md",
}: {
  millimes: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const value = millimes / 1000;
  const hasDecimals = millimes % 1000 !== 0;
  const formatted = new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: hasDecimals ? 3 : 0,
    maximumFractionDigits: hasDecimals ? 3 : 0,
  }).format(value);

  return (
    <span
      className={cn(
        "font-display font-light tabular-nums text-ink",
        size === "sm" && "text-[1.375rem]",
        size === "md" && "text-price",
        size === "lg" && "text-[2.75rem] leading-none",
        className,
      )}
    >
      {formatted}
      <span className="ms-1.5 font-sans text-[0.8125rem] font-normal tracking-wide text-stone">
        DT
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */

export function CheckItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <li className={cn("flex gap-3 text-[0.9375rem] leading-relaxed text-graphite", className)}>
      <CheckIcon />
      <span>{children}</span>
    </li>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={cn("mt-[0.35rem] h-3.5 w-3.5 shrink-0 text-champagne", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8.5 6 12l7.5-8" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={cn("h-4 w-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 10h12M11 5.5 15.5 10 11 14.5" />
    </svg>
  );
}

/* Réexporté ici pour garder un point d'entrée unique aux primitives. */
export { Reveal } from "./reveal";
