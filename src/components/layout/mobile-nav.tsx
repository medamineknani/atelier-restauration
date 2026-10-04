"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/button";
import { ArrowIcon } from "@/components/ui/primitives";

type NavItem = { href: string; label: string };

/**
 * Menu mobile : plein écran, liens larges, CTA en bas — accessible au pouce.
 * Le défilement de la page est verrouillé pendant l'ouverture.
 */
export function MobileNav({
  items,
  ctaLabel,
  ctaHref,
  openLabel,
  closeLabel,
  locale,
}: {
  items: NavItem[];
  ctaLabel: string;
  ctaHref: string;
  openLabel: string;
  closeLabel: string;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);

  // Fermeture au clic sur un lien plutôt que par un effet sur `pathname` :
  // le menu se referme immédiatement, sans attendre la fin de la navigation.
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={openLabel}
        aria-expanded={open}
        className="inline-flex h-11 w-11 items-center justify-center text-ink transition-fast hover:text-champagne-deep md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.25">
          <path d="M3.5 7h17M3.5 12h17M3.5 17h17" strokeLinecap="round" />
        </svg>
      </button>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-paper transition-opacity duration-300 md:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <span className="font-display text-lg">{locale === "en" ? "Menu" : "Menu"}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={closeLabel}
              className="inline-flex h-11 w-11 items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.25">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-5 py-6">
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    className="block border-b border-line py-4 font-display text-xl text-ink transition-fast hover:text-champagne-deep"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-line px-5 py-6">
            <ButtonLink href={ctaHref} size="lg" fullWidth onClick={close}>
              {ctaLabel}
              <ArrowIcon />
            </ButtonLink>
          </div>
        </div>
      </div>
    </>
  );
}
