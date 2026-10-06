"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type AdminNavItem = { href: string; label: string };

/**
 * Navigation du back-office.
 *
 * Latérale sur grand écran, en barre défilante sur mobile : l'admin répond
 * souvent à un client depuis un téléphone, et « voir une commande » doit
 * rester faisable à une main.
 */
export function AdminNav({
  items,
  secondary,
}: {
  items: AdminNavItem[];
  secondary: AdminNavItem[];
}) {
  const pathname = usePathname();

  const render = (item: AdminNavItem) => {
    const active =
      item.href === "/admin"
        ? pathname === "/admin"
        : pathname === item.href || pathname.startsWith(`${item.href}/`);

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "block whitespace-nowrap rounded-[3px] px-3 py-2 text-[0.875rem] transition-fast",
          active
            ? "bg-sand font-medium text-ink"
            : "text-graphite hover:bg-cream hover:text-ink",
        )}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <nav aria-label="Administration" className="grid gap-1">
      {items.map(render)}
      {secondary.length > 0 ? (
        <>
          <span className="mt-4 px-3 text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            Réglages
          </span>
          {secondary.map(render)}
        </>
      ) : null}
    </nav>
  );
}
