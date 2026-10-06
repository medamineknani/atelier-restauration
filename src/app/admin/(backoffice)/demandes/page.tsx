import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import { adminListContactRequests } from "@/server/services/admin";
import { markContactHandled } from "@/server/actions/admin-content";
import { EmptyRow, Panel } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  new: "bg-champagne-soft/60 text-champagne-deep",
  read: "bg-sand text-stone",
  handled: "bg-success/10 text-success",
  spam: "bg-sand text-muted",
};

const STATUS_LABEL: Record<string, string> = {
  new: "nouvelle",
  read: "lue",
  handled: "traitée",
  spam: "indésirable",
};

/**
 * Demandes reçues.
 *
 * Sans cet écran, un message envoyé depuis le formulaire de contact n'a
 * nulle part où aller : il part en email et disparaît. Une boîte de
 * réception, même modeste, évite de répondre deux fois — ou pas du tout.
 */
export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string }>;
}) {
  const { filtre } = await searchParams;
  const onlyNew = filtre === "nouvelles";
  const requests = await adminListContactRequests(onlyNew ? "new" : "all");

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-[1.5rem] text-ink">Demandes reçues</h1>
          <p className="mt-1 text-[0.8125rem] text-stone">
            {requests.length} message(s){onlyNew ? " non traités" : ""}
          </p>
        </div>

        <Link
          href={onlyNew ? "/admin/demandes" : "/admin/demandes?filtre=nouvelles"}
          className="text-[0.8125rem] text-graphite underline underline-offset-4 hover:text-ink"
        >
          {onlyNew ? "Voir toutes" : "Voir les non traitées"}
        </Link>
      </div>

      <Panel className="!p-0">
        {requests.length === 0 ? (
          <EmptyRow>Aucune demande.</EmptyRow>
        ) : (
          <ul>
            {requests.map((request) => (
              <li key={request.id} className="border-b border-line/60 px-4 py-4 last:border-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.9375rem] text-ink">{request.name}</span>
                      <span
                        className={`rounded-[3px] px-1.5 py-0.5 text-[0.6875rem] ${
                          STATUS_TONE[request.status] ?? "bg-sand text-muted"
                        }`}
                      >
                        {STATUS_LABEL[request.status] ?? request.status}
                      </span>
                    </p>
                    <p className="mt-1 text-[0.8125rem] text-stone">
                      {request.email}
                      {request.phone ? ` · ${request.phone}` : ""}
                    </p>
                    <p className="mt-0.5 text-[0.75rem] text-muted">
                      {formatDateTime(request.createdAt, "fr")}
                      {request.subject ? ` · ${request.subject}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <a
                      href={`mailto:${request.email}`}
                      className="rounded-sm border border-line-strong px-3 py-1.5 text-[0.75rem] text-ink transition-fast hover:border-champagne hover:bg-cream"
                    >
                      Répondre
                    </a>
                    {request.status !== "handled" ? (
                      <form action={markContactHandled}>
                        <input type="hidden" name="id" value={request.id} />
                        <input type="hidden" name="status" value="handled" />
                        <button
                          type="submit"
                          className="rounded-sm bg-ink px-3 py-1.5 text-[0.75rem] font-medium text-paper transition-fast hover:bg-ink-soft"
                        >
                          Marquer traitée
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-line text-[0.875rem] leading-relaxed text-graphite">
                  {request.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
