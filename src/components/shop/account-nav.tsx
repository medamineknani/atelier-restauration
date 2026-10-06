"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Onglets de l'espace client — l'onglet actif est souligné de champagne. */
export function AccountNav({
  items,
  locale,
}: {
  items: { href: string; label: string }[];
  locale: string;
}) {
  const pathname = usePathname();
  const bare = locale === "fr" ? pathname : pathname.replace(/^\/(en|ar)/, "");

  return (
    <nav aria-label="Espace client" className="-mb-px flex gap-6 overflow-x-auto no-scrollbar">
      {items.map((item) => {
        const active = bare === item.href || (item.href !== "/compte" && bare.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 pb-3 text-[0.9375rem] transition-fast",
              active
                ? "border-champagne font-medium text-ink"
                : "border-transparent text-stone hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
