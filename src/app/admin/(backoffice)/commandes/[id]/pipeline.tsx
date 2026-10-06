import type { OrderStatusCode } from "@/server/db/schema";
import type { orderStatusEvents } from "@/server/db/schema";
import { formatShortDate } from "@/lib/utils";

/**
 * Avancement de la commande.
 *
 * Les jalons franchis portent leur date : l'opérateur voit d'un coup d'œil
 * depuis combien de temps une commande stagne. Un jalon non atteint reste
 * neutre — il ne dit pas « en retard », il dit « pas encore ».
 */
export function OrderPipeline({
  steps,
  events,
  current,
}: {
  steps: { status: OrderStatusCode; label: string }[];
  events: (typeof orderStatusEvents.$inferSelect)[];
  current: OrderStatusCode;
}) {
  // Dernière date connue pour chaque statut atteint.
  const reached = new Map<OrderStatusCode, Date>();
  for (const event of events) {
    const existing = reached.get(event.toStatus);
    if (!existing || event.createdAt > existing) reached.set(event.toStatus, event.createdAt);
  }

  const cancelled = ["cancelled", "refunded"].includes(current);
  const onHold = current === "on_hold";

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <ol className="flex min-w-max items-start gap-1">
        {steps.map((step, index) => {
          const date = reached.get(step.status);
          const active = step.status === current;
          const done = Boolean(date) && !active;

          return (
            <li key={step.status} className="flex min-w-[92px] flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <span
                  className={`h-px flex-1 ${index === 0 ? "bg-transparent" : done || active ? "bg-champagne" : "bg-line"}`}
                />
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    active
                      ? "bg-champagne ring-4 ring-champagne-soft"
                      : done
                        ? "bg-champagne/60"
                        : "bg-line"
                  }`}
                />
                <span
                  className={`h-px flex-1 ${
                    index === steps.length - 1
                      ? "bg-transparent"
                      : reached.has(steps[index + 1]!.status)
                        ? "bg-champagne"
                        : "bg-line"
                  }`}
                />
              </div>

              <p
                className={`mt-2 text-center text-[0.75rem] ${
                  active ? "font-medium text-ink" : done ? "text-graphite" : "text-muted"
                }`}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-center text-[0.6875rem] text-muted">
                {date ? formatShortDate(date, "fr") : "—"}
              </p>
            </li>
          );
        })}
      </ol>

      {cancelled || onHold ? (
        <p className="mt-4 text-[0.8125rem] text-warning">
          {onHold
            ? "Commande en attente d’une réponse du client."
            : "Commande annulée ou remboursée — le pipeline est arrêté."}
        </p>
      ) : null}
    </div>
  );
}
