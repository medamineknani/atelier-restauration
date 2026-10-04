import Link from "next/link";
import { createTranslator } from "@/lib/i18n";
import { assetCounts, listOrdersAdmin } from "@/server/services/admin";
import type { OrderStatusCode } from "@/server/db/schema";
import { EmptyRow, Panel } from "@/components/admin/ui";
import { OrderRow, OrderTableHeader } from "@/components/admin/order-row";
import { OrdersFilters } from "./filters";

export const dynamic = "force-dynamic";

const ALL_STATUSES: OrderStatusCode[] = [
  "awaiting_payment",
  "received",
  "processing",
  "restoring",
  "checking",
  "ready",
  "shipped",
  "completed",
  "on_hold",
  "cancelled",
  "refunded",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    statut?: string;
    type?: string;
    q?: string;
    retard?: string;
    page?: string;
  }>;
}) {
  const t = createTranslator("fr");
  const params = await searchParams;

  const statuses = (params.statut?.split(",").filter(Boolean) ?? []).filter((value): value is OrderStatusCode =>
    ALL_STATUSES.includes(value as OrderStatusCode),
  );

  const { rows, total, page, perPage } = await listOrdersAdmin({
    statuses: statuses.length ? statuses : undefined,
    kind: params.type,
    search: params.q,
    overdueOnly: params.retard === "1",
    page: Number(params.page ?? "1") || 1,
  });

  const counts = await assetCounts(rows.map((order) => order.id));
  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[1.5rem] text-ink">{t("admin.orders")}</h1>
        <p className="text-[0.8125rem] text-stone">
          {total} commande{total > 1 ? "s" : ""}
        </p>
      </div>

      <OrdersFilters
        statuses={ALL_STATUSES}
        selected={statuses}
        kind={params.type ?? ""}
        search={params.q ?? ""}
        overdue={params.retard === "1"}
      />

      <Panel className="!p-0">
        {rows.length === 0 ? (
          <EmptyRow>{t("admin.noOrders")}</EmptyRow>
        ) : (
          <div>
            <OrderTableHeader />
            {rows.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                photos={counts.get(order.id)?.originals}
              />
            ))}
          </div>
        )}
      </Panel>

      {pages > 1 ? (
        <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
          {Array.from({ length: pages }, (_, index) => index + 1).map((value) => {
            const query = new URLSearchParams();
            if (params.statut) query.set("statut", params.statut);
            if (params.type) query.set("type", params.type);
            if (params.q) query.set("q", params.q);
            if (params.retard) query.set("retard", params.retard);
            query.set("page", String(value));

            return (
              <Link
                key={value}
                href={`/admin/commandes?${query.toString()}`}
                aria-current={value === page ? "page" : undefined}
                className={
                  value === page
                    ? "rounded-[3px] bg-ink px-3 py-1.5 text-[0.8125rem] text-paper"
                    : "rounded-[3px] px-3 py-1.5 text-[0.8125rem] text-graphite hover:bg-sand"
                }
              >
                {value}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
