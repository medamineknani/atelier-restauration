import { createTranslator, type Locale } from "@/lib/i18n";
import type { OrderStatusCode } from "@/server/db/schema";

/**
 * Pastille de statut.
 *
 * Jamais de rouge vif : le back-office signale, il n'alarme pas. L'ambre
 * pour « en retard », le brique pour « très en retard », tout le reste en
 * neutre ou champagne.
 */
const TONE: Record<OrderStatusCode, string> = {
  draft: "bg-sand text-stone",
  awaiting_payment: "bg-champagne-soft/60 text-champagne-deep",
  received: "bg-champagne-soft/60 text-champagne-deep",
  processing: "bg-champagne-soft/70 text-champagne-deep",
  restoring: "bg-champagne-soft/70 text-champagne-deep",
  checking: "bg-champagne-soft/70 text-champagne-deep",
  ready: "bg-success/10 text-success",
  shipped: "bg-success/10 text-success",
  completed: "bg-sand text-graphite",
  on_hold: "bg-warning/12 text-warning",
  cancelled: "bg-sand text-muted",
  refunded: "bg-sand text-muted",
};

export function StatusPill({
  status,
  locale = "fr",
  className,
}: {
  status: OrderStatusCode;
  locale?: Locale;
  className?: string;
}) {
  const t = createTranslator(locale);
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[3px] px-2 py-0.5 text-[0.75rem] font-medium ${TONE[status]} ${className ?? ""}`}
    >
      {t(`status.${status}` as "status.received")}
    </span>
  );
}
