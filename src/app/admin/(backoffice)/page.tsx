import Link from "next/link";
import { createTranslator } from "@/lib/i18n";
import { priceLabel } from "@/lib/utils";
import { assetCounts, dashboardStats, PIPELINE } from "@/server/services/admin";
import { EmptyRow, Panel, Stat } from "@/components/admin/ui";
import { OrderRow, OrderTableHeader } from "@/components/admin/order-row";
import { StatusPill } from "@/components/admin/status-pill";
import type { OrderStatusCode } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const PIPELINE_LABEL: Partial<Record<OrderStatusCode, string>> = {
  received: "Reçue",
  processing: "Traitement",
  restoring: "Restauration",
  checking: "Vérification",
  ready: "Prête",
};

const WORKFLOW: OrderStatusCode[] = ["received", "processing", "restoring", "checking"];

function daysSince(date: Date | null) {
  if (!date) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

/**
 * Tableau de bord.
 *
 * Il répond à une seule question : **sur quoi l'atelier doit-il travailler
 * maintenant ?** Tout le reste — indicateurs, dernières commandes — est
 * secondaire et placé plus bas.
 */
export default async function AdminDashboardPage() {
  const t = createTranslator("fr");
  const { distribution, queue, waiting, recent, month } = await dashboardStats();

  const counts = await assetCounts([...queue, ...waiting, ...recent].map((order) => order.id));

  const inProgress = WORKFLOW.map((status) => ({
    status,
    count: distribution.get(status) ?? 0,
  }));

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-display text-[1.5rem] text-ink">{t("admin.dashboard")}</h1>
        <p className="mt-1 text-[0.875rem] text-stone">
          {queue.length > 0
            ? `${queue.length} commande${queue.length > 1 ? "s" : ""} dans la file de production.`
            : "Aucune commande en production. La file est vide."}
        </p>
      </div>

      {/* Indicateurs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Commandes du mois" value={String(month.orders)} />
        <Stat label="Chiffre d’affaires" value={priceLabel(month.revenueMillimes, "fr")} />
        <Stat label="Panier moyen" value={priceLabel(month.averageMillimes, "fr")} />
        <Stat
          label="Part photobook"
          value={`${Math.round(month.photobookShare * 100)} %`}
          hint={`${PIPELINE.length} statuts suivis`}
        />
      </div>

      {/* File de production */}
      <Panel
        title={t("admin.toDoToday")}
        action={
          <Link href="/admin/commandes" className="text-[0.8125rem] text-graphite underline underline-offset-4 hover:text-ink">
            Tout voir
          </Link>
        }
      >
        {queue.length === 0 ? (
          <EmptyRow>{t("admin.noOrders")}</EmptyRow>
        ) : (
          <div>
            <OrderTableHeader />
            {queue.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                photos={counts.get(order.id)?.originals}
                since={daysSince(order.submittedAt ?? order.createdAt)}
              />
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Répartition */}
        <Panel title={t("admin.inProgress")}>
          {inProgress.every((entry) => entry.count === 0) ? (
            <EmptyRow>{t("admin.noOrders")}</EmptyRow>
          ) : (
            <ul className="grid gap-3">
              {inProgress.map((entry) => (
                <li key={entry.status} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-3">
                    <StatusPill status={entry.status} />
                    <span className="text-[0.8125rem] text-stone">
                      {PIPELINE_LABEL[entry.status] ?? entry.status}
                    </span>
                  </span>
                  <span className="font-display text-[1.125rem] tabular-nums text-ink">
                    {entry.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* En attente client */}
        <Panel title={t("admin.waitingClient")}>
          {waiting.length === 0 ? (
            <EmptyRow>Rien en attente.</EmptyRow>
          ) : (
            <ul className="grid gap-2">
              {waiting.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/commandes/${order.id}`}
                    className="flex items-center justify-between gap-3 rounded-[3px] px-2 py-1.5 transition-fast hover:bg-cream"
                  >
                    <span className="truncate font-mono text-[0.8125rem] text-ink">
                      {order.reference}
                    </span>
                    <StatusPill status={order.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Dernières commandes */}
      <Panel title={t("admin.recentOrders")}>
        {recent.length === 0 ? (
          <EmptyRow>{t("admin.noOrders")}</EmptyRow>
        ) : (
          <div>
            <OrderTableHeader />
            {recent.map((order) => (
              <OrderRow key={order.id} order={order} photos={counts.get(order.id)?.originals} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
