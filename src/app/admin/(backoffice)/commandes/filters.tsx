"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { OrderStatusCode } from "@/server/db/schema";
import { createTranslator } from "@/lib/i18n";
import { adminInputClass } from "@/components/admin/ui";

/**
 * Filtres de la liste de commandes.
 *
 * La soumission se fait en `GET` : une URL filtrée se copie, se partage et
 * survit à un rechargement. C'est un outil interne, pas une démonstration
 * d'interactivité.
 */
export function OrdersFilters({
  statuses,
  selected,
  kind,
  search,
  overdue,
}: {
  statuses: OrderStatusCode[];
  selected: OrderStatusCode[];
  kind: string;
  search: string;
  overdue: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = createTranslator("fr");

  const submit = (formData: FormData) => {
    const query = new URLSearchParams();
    const picked = formData.getAll("statut").map(String);
    if (picked.length) query.set("statut", picked.join(","));
    const type = String(formData.get("type") ?? "");
    if (type) query.set("type", type);
    const q = String(formData.get("q") ?? "").trim();
    if (q) query.set("q", q);
    if (formData.get("retard") === "on") query.set("retard", "1");

    startTransition(() => {
      router.push(`/admin/commandes${query.toString() ? `?${query.toString()}` : ""}`);
    });
  };

  return (
    <form
      action={submit}
      className="grid gap-4 rounded-md border border-line bg-paper p-4 md:grid-cols-[1fr_auto_auto]"
    >
      <div className="grid gap-2">
        <label htmlFor="q" className="sr-only">
          Recherche
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={search}
          placeholder={t("admin.search")}
          className={adminInputClass}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          name="type"
          defaultValue={kind}
          className={`${adminInputClass} w-auto`}
          aria-label={t("admin.allTypes")}
        >
          <option value="">{t("admin.allTypes")}</option>
          <option value="digital">Numérique</option>
          <option value="photobook">Photobook</option>
        </select>

        <label className="flex items-center gap-2 text-[0.8125rem] text-graphite">
          <input
            type="checkbox"
            name="retard"
            defaultChecked={overdue}
            className="h-4 w-4 accent-champagne-deep"
          />
          {t("admin.overdue")}
        </label>
      </div>

      <div className="flex items-center gap-3">
        <details className="md:ml-auto">
          <summary className="cursor-pointer select-none text-[0.8125rem] text-graphite underline underline-offset-4">
            {selected.length > 0 ? `${selected.length} statut(s)` : t("admin.allStatuses")}
          </summary>
          <div className="absolute z-20 mt-2 grid max-h-72 w-56 gap-1 overflow-y-auto rounded-md border border-line bg-paper p-3 shadow-sm">
            {statuses.map((status) => (
              <label
                key={status}
                className="flex items-center gap-2 text-[0.8125rem] text-graphite"
              >
                <input
                  type="checkbox"
                  name="statut"
                  value={status}
                  defaultChecked={selected.includes(status)}
                  className="h-4 w-4 accent-champagne-deep"
                />
                {t(`status.${status}` as "status.received")}
              </label>
            ))}
          </div>
        </details>

        <button
          type="submit"
          disabled={pending}
          className="rounded-sm bg-ink px-4 py-2 text-[0.8125rem] font-medium text-paper transition-fast hover:bg-ink-soft disabled:opacity-50"
        >
          Filtrer
        </button>
      </div>
    </form>
  );
}
