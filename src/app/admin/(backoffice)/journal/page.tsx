import Link from "next/link";
import { createTranslator } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import { listAudit } from "@/server/services/admin";
import { EmptyRow, Panel } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const ACTIONS = [
  "order.status_changed",
  "order.results_published",
  "order.results_unpublished",
  "order.message_sent",
  "order.note_added",
  "asset.originals_downloaded",
  "asset.restored_uploaded",
  "asset.deleted",
  "invoice.regenerated",
  "admin.signed_in",
  "admin.sign_in_failed",
  "account.deleted",
];

/**
 * Journal d'audit global — lecture seule.
 *
 * Aucune action ne permet d'effacer une ligne, pour personne. C'est la
 * condition pour que la traçabilité ait une valeur : un journal qu'on peut
 * réécrire ne prouve rien.
 */
export default async function AdminJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const t = createTranslator("fr");
  const { action, page } = await searchParams;

  const { rows, total, page: current, perPage } = await listAudit({
    action,
    page: Number(page ?? "1") || 1,
  });

  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[1.5rem] text-ink">{t("admin.auditTitle")}</h1>
        <p className="text-[0.8125rem] text-stone">{total} entrée(s)</p>
      </div>

      <form className="flex flex-wrap gap-2">
        <select
          name="action"
          defaultValue={action ?? ""}
          className="rounded-sm border border-line bg-paper px-3 py-2 text-[0.8125rem] text-ink focus:border-champagne focus:outline-none"
        >
          <option value="">Toutes les actions</option>
          {ACTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-sm bg-ink px-4 py-2 text-[0.8125rem] font-medium text-paper transition-fast hover:bg-ink-soft"
        >
          Filtrer
        </button>
      </form>

      <Panel className="!p-0">
        {rows.length === 0 ? (
          <EmptyRow>{t("admin.noEntries")}</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-start text-[0.8125rem]">
              <thead>
                <tr className="border-b border-line text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                  <th className="py-2.5 pe-4 ps-4 text-start font-medium">{t("admin.date")}</th>
                  <th className="py-2.5 pe-4 text-start font-medium">{t("admin.action")}</th>
                  <th className="py-2.5 pe-4 text-start font-medium">{t("admin.actor")}</th>
                  <th className="py-2.5 pe-4 text-start font-medium">{t("admin.entity")}</th>
                  <th className="py-2.5 pe-4 text-start font-medium">{t("admin.details")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.id} className="border-b border-line/50 last:border-0">
                    <td className="whitespace-nowrap py-2.5 pe-4 ps-4 align-top text-muted">
                      {formatDateTime(entry.createdAt, "fr")}
                    </td>
                    <td className="py-2.5 pe-4 align-top text-ink">{entry.action}</td>
                    <td className="py-2.5 pe-4 align-top text-stone">{entry.actorEmail ?? "—"}</td>
                    <td className="py-2.5 pe-4 align-top text-muted">
                      {entry.entityType ? (
                        entry.entityType === "order" && entry.entityId ? (
                          <Link
                            href={`/admin/commandes/${entry.entityId}`}
                            className="underline underline-offset-2 hover:text-ink"
                          >
                            {entry.entityType}
                          </Link>
                        ) : (
                          entry.entityType
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 pe-4 align-top text-muted">
                      {entry.metadata ? (
                        <code className="text-[0.75rem]">
                          {JSON.stringify(entry.metadata).slice(0, 140)}
                        </code>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {pages > 1 ? (
        <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
          {Array.from({ length: Math.min(pages, 12) }, (_, index) => index + 1).map((value) => (
            <Link
              key={value}
              href={`/admin/journal?${new URLSearchParams({
                ...(action ? { action } : {}),
                page: String(value),
              }).toString()}`}
              aria-current={value === current ? "page" : undefined}
              className={
                value === current
                  ? "rounded-[3px] bg-ink px-3 py-1.5 text-[0.8125rem] text-paper"
                  : "rounded-[3px] px-3 py-1.5 text-[0.8125rem] text-graphite hover:bg-sand"
              }
            >
              {value}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
