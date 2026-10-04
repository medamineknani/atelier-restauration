import Link from "next/link";
import type { Order } from "@/server/db/schema";
import { formatShortDate, priceLabel } from "@/lib/utils";
import { createTranslator } from "@/lib/i18n";
import { StatusPill } from "./status-pill";

/**
 * Ligne de commande, commune au tableau de bord et à la liste.
 *
 * Dense par défaut : un opérateur parcourt des dizaines de lignes par
 * session. Chaque ligne répond à la même question — qui, quoi, depuis quand,
 * où en est-on — sans ouvrir la commande.
 */
export function OrderRow({
  order,
  photos,
  since,
}: {
  order: Order;
  photos?: number;
  /** Durée écoulée depuis l'entrée dans le statut courant, en jours. */
  since?: number;
}) {
  const t = createTranslator("fr");
  const customer = order.customerSnapshot;
  const name = `${customer.firstName} ${customer.lastName}`.trim() || order.guestEmail || "—";

  const late =
    order.estimatedReadyAt &&
    order.estimatedReadyAt < new Date() &&
    !["completed", "cancelled", "refunded"].includes(order.status);

  return (
    <Link
      href={`/admin/commandes/${order.id}`}
      className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line/60 px-4 py-3 transition-fast last:border-0 hover:bg-cream md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_90px_120px_minmax(0,1fr)] md:gap-4"
    >
      <div className="min-w-0">
        <p className="truncate font-mono text-[0.8125rem] text-ink">{order.reference}</p>
        <p className="mt-0.5 truncate text-[0.8125rem] text-stone md:hidden">{name}</p>
      </div>

      <div className="hidden min-w-0 md:block">
        <p className="truncate text-[0.8125rem] text-ink">{name}</p>
        <p className="truncate text-[0.75rem] text-muted">{customer.email}</p>
      </div>

      <p className="hidden text-[0.8125rem] tabular-nums text-stone md:block">
        {photos !== undefined ? `${photos}` : order.photosCount}
      </p>

      <p className="text-right text-[0.875rem] tabular-nums text-ink md:text-left">
        {priceLabel(order.totalMillimes, "fr")}
      </p>

      <div className="col-span-2 flex items-center justify-end gap-3 md:col-span-1 md:justify-between">
        <span className="hidden text-[0.75rem] text-muted md:block">
          {since !== undefined ? `depuis ${since} j` : formatShortDate(order.createdAt, "fr")}
        </span>
        <span className="flex items-center gap-2">
          {late ? (
            <span
              title={t("admin.overdue")}
              className="h-1.5 w-1.5 rounded-full bg-warning"
              aria-label={t("admin.overdue")}
            />
          ) : null}
          <StatusPill status={order.status} />
        </span>
      </div>
    </Link>
  );
}

export function OrderTableHeader() {
  return (
    <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_90px_120px_minmax(0,1fr)] gap-4 border-b border-line px-4 py-2.5 text-[0.6875rem] uppercase tracking-[0.12em] text-muted md:grid">
      <span>Référence</span>
      <span>Client</span>
      <span>Photos</span>
      <span>Montant</span>
      <span>Statut</span>
    </div>
  );
}
