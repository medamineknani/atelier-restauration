import type { auditLogs } from "@/server/db/schema";
import { createTranslator } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import { EmptyRow, Panel } from "@/components/admin/ui";

/**
 * Journal de la commande — lecture seule.
 *
 * Qui a téléchargé quoi, quand, et qui a changé le statut. Personne, pas
 * même un superadmin, ne peut effacer une ligne : c'est ce qui rend la
 * traçabilité crédible.
 */
export function JournalTab({ entries }: { entries: (typeof auditLogs.$inferSelect)[] }) {
  const t = createTranslator("fr");

  return (
    <Panel title={t("admin.journal")}>
      {entries.length === 0 ? (
        <EmptyRow>{t("admin.noEntries")}</EmptyRow>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-start text-[0.8125rem]">
            <thead>
              <tr className="border-b border-line text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                <th className="py-2 pe-4 text-start font-medium">{t("admin.date")}</th>
                <th className="py-2 pe-4 text-start font-medium">{t("admin.action")}</th>
                <th className="py-2 pe-4 text-start font-medium">{t("admin.actor")}</th>
                <th className="py-2 text-start font-medium">{t("admin.details")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-line/50 last:border-0">
                  <td className="whitespace-nowrap py-2.5 pe-4 align-top text-muted">
                    {formatDateTime(entry.createdAt, "fr")}
                  </td>
                  <td className="py-2.5 pe-4 align-top text-ink">{entry.action}</td>
                  <td className="py-2.5 pe-4 align-top text-stone">
                    {entry.actorEmail ?? "—"}
                  </td>
                  <td className="py-2.5 align-top text-muted">
                    {entry.metadata ? (
                      <code className="text-[0.75rem]">
                        {JSON.stringify(entry.metadata).slice(0, 160)}
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
  );
}
