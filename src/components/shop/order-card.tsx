import Link from "next/link";
import type { Order } from "@/server/db/schema";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { formatDate, priceLabel } from "@/lib/utils";
import { Badge, ArrowIcon } from "@/components/ui/primitives";

/**
 * Carte de commande.
 *
 * Elle répond d'un coup d'œil aux trois questions que se pose le client :
 * combien de photos, à quel stade, pour quel montant.
 */
export function OrderCard({
  order,
  locale,
  packed = false,
}: {
  order: Order;
  locale: Locale;
  packed?: boolean;
}) {
  const t = createTranslator(locale);

  return (
    <Link
      href={localePath(locale, `/compte/commandes/${order.reference}`)}
      className="group flex flex-col gap-5 rounded-md border border-line bg-paper p-5 transition-editorial hover:border-champagne hover:shadow-sm md:flex-row md:items-center md:justify-between md:gap-8 md:p-6"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display text-[1.0625rem] text-ink">{order.reference}</span>
          <Badge tone={order.status === "completed" ? "neutral" : "champagne"}>
            {t(`status.${order.status}` as "status.draft")}
          </Badge>
        </div>

        <p className="mt-2 text-[0.875rem] text-stone">
          {t("account.orderDate", { date: formatDate(order.createdAt, locale) })}
          {" · "}
          {t("account.photosReceived", {
            count: order.photosCount,
            s: order.photosCount > 1 ? "s" : "",
          })}
        </p>

        <p className="mt-3 text-[0.875rem] leading-relaxed text-graphite">
          {t(`status.descriptions.${order.status}` as "status.descriptions.received")}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-5">
        <span className="font-display text-[1.125rem] tabular-nums text-ink">
          {priceLabel(order.totalMillimes, locale)}
        </span>
        {!packed ? (
          <ArrowIcon className="h-4 w-4 text-stone transition-transform duration-[280ms] group-hover:translate-x-1 group-hover:text-champagne-deep" />
        ) : null}
      </div>
    </Link>
  );
}
