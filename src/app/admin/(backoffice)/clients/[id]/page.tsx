import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslator } from "@/lib/i18n";
import { formatShortDate, priceLabel } from "@/lib/utils";
import { clientDetail } from "@/server/services/admin";
import { DetailRow, EmptyRow, Panel, Stat } from "@/components/admin/ui";
import { StatusPill } from "@/components/admin/status-pill";
import { OrderTableHeader } from "@/components/admin/order-row";

export const dynamic = "force-dynamic";

/**
 * Fiche client.
 *
 * L'information la plus utile figure en bas : les commandes passées en invité
 * avec la même adresse et jamais rattachées. C'est presque toujours la raison
 * pour laquelle un client appelle en disant ne rien retrouver.
 */
export default async function AdminClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = createTranslator("fr");

  const data = await clientDetail(id);
  if (!data) notFound();

  const { client, history, guestOrders } = data;
  const spent = history
    .filter((order) => !["cancelled", "refunded"].includes(order.status))
    .reduce((sum, order) => sum + order.totalMillimes, 0);

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin/clients"
          className="text-[0.8125rem] text-stone underline underline-offset-4 hover:text-ink"
        >
          Clients
        </Link>
        <h1 className="mt-4 font-display text-[1.5rem] text-ink">{client.name || client.email}</h1>
        <p className="mt-1 text-[0.875rem] text-stone">
          {client.email}
          {client.phone ? ` · ${client.phone}` : ""}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Commandes" value={String(history.length)} />
        <Stat label="Dépenses" value={priceLabel(spent, "fr")} />
        <Stat
          label="Depuis"
          value={formatShortDate(client.createdAt, "fr")}
          hint={client.lastLoginAt ? `Vu le ${formatShortDate(client.lastLoginAt, "fr")}` : "Jamais connecté"}
        />
      </div>

      <Panel title={t("admin.preferences")}>
        <dl>
          <DetailRow label={t("admin.localePreferred")}>
            {client.preferredLocale?.toUpperCase() ?? "FR"}
          </DetailRow>
          <DetailRow label={t("admin.notificationsEmail")}>
            {client.notifyEmail ? t("admin.on") : t("admin.off")}
          </DetailRow>
          <DetailRow label="Rôle">{client.role}</DetailRow>
        </dl>
      </Panel>

      <Panel title={t("admin.ordersCount", { count: history.length })} className="!p-0">
        {history.length === 0 ? (
          <EmptyRow>{t("admin.noOrdersClient")}</EmptyRow>
        ) : (
          <div>
            <OrderTableHeader />
            {history.map((order) => (
              <Link
                key={order.id}
                href={`/admin/commandes/${order.id}`}
                className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line/60 px-4 py-3 transition-fast last:border-0 hover:bg-cream md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_90px_120px_minmax(0,1fr)] md:gap-4"
              >
                <span className="truncate font-mono text-[0.8125rem] text-ink">
                  {order.reference}
                </span>
                <span className="hidden text-[0.8125rem] text-stone md:block">
                  {formatShortDate(order.createdAt, "fr")}
                </span>
                <span className="hidden md:block" />
                <span className="text-[0.875rem] tabular-nums text-ink">
                  {priceLabel(order.totalMillimes, "fr")}
                </span>
                <span className="flex justify-end">
                  <StatusPill status={order.status} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {guestOrders.length > 0 ? (
        <Panel title={t("admin.guestOrdersTitle")}>
          <p className="mb-4 text-[0.8125rem] text-muted">{t("admin.guestOrdersHint")}</p>
          <ul className="grid gap-2">
            {guestOrders.map((order) => (
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
        </Panel>
      ) : null}
    </div>
  );
}
