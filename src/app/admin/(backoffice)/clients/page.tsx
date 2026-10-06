import Link from "next/link";
import { createTranslator } from "@/lib/i18n";
import { formatShortDate, priceLabel } from "@/lib/utils";
import { listClients } from "@/server/services/admin";
import { EmptyRow, Panel } from "@/components/admin/ui";
import { ClientsSearch } from "./search";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const t = createTranslator("fr");
  const { q } = await searchParams;
  const clients = await listClients(q);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[1.5rem] text-ink">{t("admin.clients")}</h1>
        <p className="text-[0.8125rem] text-stone">{clients.length} compte(s)</p>
      </div>

      <ClientsSearch value={q ?? ""} />

      <Panel className="!p-0">
        {clients.length === 0 ? (
          <EmptyRow>{t("admin.noEntries")}</EmptyRow>
        ) : (
          <div>
            <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_100px_120px_110px] gap-4 border-b border-line px-4 py-2.5 text-[0.6875rem] uppercase tracking-[0.12em] text-muted md:grid">
              <span>Client</span>
              <span>Email</span>
              <span>Commandes</span>
              <span>Dépenses</span>
              <span>Depuis</span>
            </div>

            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line/60 px-4 py-3 transition-fast last:border-0 hover:bg-cream md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_100px_120px_110px] md:gap-4"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[0.875rem] text-ink">
                    {client.name || "—"}
                  </span>
                  <span className="block truncate text-[0.75rem] text-muted md:hidden">
                    {client.email}
                  </span>
                </span>

                <span className="hidden min-w-0 truncate text-[0.8125rem] text-stone md:block">
                  {client.email}
                </span>

                <span className="hidden text-[0.8125rem] tabular-nums text-stone md:block">
                  {client.ordersCount}
                </span>

                <span className="text-[0.875rem] tabular-nums text-ink">
                  {priceLabel(client.spentMillimes, "fr")}
                </span>

                <span className="hidden text-[0.75rem] text-muted md:block">
                  {formatShortDate(client.createdAt, "fr")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
