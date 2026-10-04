import type { ReactNode } from "react";
import Link from "next/link";
import { createTranslator } from "@/lib/i18n";
import { requireAdminPage } from "@/lib/auth/admin";
import { adminSignOut } from "@/server/actions/admin";
import { AdminNav } from "@/components/admin/nav";

export const dynamic = "force-dynamic";

/**
 * Coque du back-office.
 *
 * L'autorisation est vérifiée ici, une seule fois : chaque écran du groupe
 * hérite de la garde. L'interface est en français et n'emprunte rien au site
 * public — c'est un outil de production, pas une vitrine.
 */
export default async function BackofficeLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdminPage("/admin");
  const t = createTranslator("fr");

  const items = [
    { href: "/admin", label: t("admin.dashboard") },
    { href: "/admin/commandes", label: t("admin.orders") },
    { href: "/admin/clients", label: t("admin.clients") },
    { href: "/admin/catalogue", label: t("admin.catalog") },
  ];
  const secondary = [{ href: "/admin/journal", label: t("admin.audit") }];

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div className="container-editorial flex h-14 items-center justify-between gap-4">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="font-display text-[1rem] text-ink">Atelier</span>
            <span className="text-[0.625rem] uppercase tracking-[0.2em] text-stone">
              Administration
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-[0.8125rem] text-stone sm:block">{admin.email}</span>
            <form action={adminSignOut}>
              <button
                type="submit"
                className="text-[0.8125rem] text-graphite underline underline-offset-4 hover:text-ink"
              >
                {t("admin.signOut")}
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="container-editorial grid gap-8 py-8 lg:grid-cols-[180px_1fr] lg:gap-10">
        {/* Sur mobile la navigation devient une barre horizontale défilante ;
            sur grand écran elle redevient une colonne. */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="-mx-6 overflow-x-auto px-6 no-scrollbar lg:mx-0 lg:overflow-visible lg:px-0">
            <AdminNav items={items} secondary={secondary} />
          </div>
        </div>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
