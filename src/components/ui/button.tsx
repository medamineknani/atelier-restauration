import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "danger";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md border text-center font-sans no-underline transition-editorial disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-champagne";

const variants: Record<Variant, string> = {
  primary: "border-ink bg-ink text-paper hover:bg-ink-soft active:translate-y-px",
  secondary: "border-line-strong bg-transparent text-ink hover:border-ink hover:bg-cream",
  ghost: "border-transparent bg-transparent text-ink underline-offset-4 hover:underline",
  accent: "border-champagne bg-champagne text-ink hover:bg-champagne-deep hover:border-champagne-deep hover:text-paper",
  danger: "border-danger/40 bg-transparent text-danger hover:border-danger",
};

const sizes: Record<Size, string> = {
  // 52 px sur mobile (cible tactile), 44 px à partir de md
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-[52px] px-7 text-[0.9375rem] md:h-12",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

export function Button({ variant = "primary", size = "md", fullWidth, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={buttonClasses(variant, size, cn(fullWidth && "w-full", className))}
    />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  ...props
}: ButtonLinkProps) {
  return <Link {...props} className={buttonClasses(variant, size, cn(fullWidth && "w-full", className))} />;
}
