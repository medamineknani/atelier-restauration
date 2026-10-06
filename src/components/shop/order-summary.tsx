import type { Order } from "@/server/db/schema";
import type { OrderWithItems } from "@/server/services/orders";
import { createTranslator, type Locale } from "@/lib/i18n";
import { cn, formatDate, priceLabel } from "@/lib/utils";

/**
 * Récapitulatif affiché à droite du tunnel.
 *
 * Il est **recalculé côté serveur** à chaque étape : le navigateur ne fait
 * qu'afficher le montant produit par `computeOrder`. Les prix sont figés dans
 * `order_items` au moment du choix, donc une modification du catalogue ne
 * change jamais le montant d'une commande en cours.
 */
export function OrderSummary({
  locale,
  order,
  showPhotos = true,
  className,
}: {
  locale: Locale;
  order: OrderWithItems | (Order & { items?: never });
  showPhotos?: boolean;
  className?: string;
}) {
  const t = createTranslator(locale);
  const items = "items" in order ? (order.items ?? []) : [];
  const pack = items.find((item) => item.itemType === "pack");
  const extras = items.filter((item) => item.itemType === "extra");

  return (
    <aside
      className={cn(
        "rounded-md border border-line bg-paper p-6 md:p-7",
        className,
      )}
    >
      <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-stone">
        {t("checkout.summaryTitle")}
      </h2>

      <div className="mt-6 flex flex-col gap-4">
        {pack ? (
          <Line
            label={pack.nameSnapshot}
            hint={pack.meta?.photosGranted ? `${pack.meta.photosGranted} ${t("common.photos")}` : undefined}
            amount={priceLabel(pack.totalMillimes, locale)}
            strong
          />
        ) : (
          <p className="text-[0.9375rem] text-muted">{t("checkout.noPackYet")}</p>
        )}

        {extras.map((extra) => (
          <Line
            key={extra.id}
            label={extra.nameSnapshot}
            hint={extra.quantity > 1 ? `× ${extra.quantity}` : undefined}
            amount={priceLabel(extra.totalMillimes, locale)}
          />
        ))}
      </div>

      <div className="my-6 h-px bg-line" />

      <div className="flex flex-col gap-3">
        <Line label={t("common.subtotal")} amount={priceLabel(order.subtotalMillimes, locale)} muted />
        {order.discountMillimes > 0 ? (
          <Line
            label={t("common.discount")}
            amount={`-${priceLabel(order.discountMillimes, locale)}`}
            muted
          />
        ) : null}
        {order.shippingMillimes > 0 ? (
          <Line label={t("common.shipping")} amount={priceLabel(order.shippingMillimes, locale)} muted />
        ) : null}
      </div>

      <div className="my-6 h-px bg-line" />

      <div className="flex items-baseline justify-between gap-4">
        <span className="font-display text-[1.125rem] text-ink">{t("common.total")}</span>
        <span className="font-display text-[1.75rem] font-light tabular-nums text-ink">
          {priceLabel(order.totalMillimes, locale)}
        </span>
      </div>

      {showPhotos ? (
        <p className="mt-5 text-[0.8125rem] leading-relaxed text-stone">
          {order.photosQuota > 0
            ? t("checkout.summaryPhotos", {
                count: order.photosCount,
                quota: order.photosQuota,
              })
            : t("checkout.noPhotosYet")}
        </p>
      ) : null}

      {order.estimatedReadyAt ? (
        <p className="mt-2 text-[0.8125rem] text-muted">
          {t("common.estimated")} — {formatDate(order.estimatedReadyAt, locale)}
        </p>
      ) : null}
    </aside>
  );
}

function Line({
  label,
  hint,
  amount,
  strong,
  muted,
}: {
  label: string;
  hint?: string | number;
  amount: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span
        className={cn(
          "text-[0.9375rem] leading-snug",
          strong ? "font-medium text-ink" : muted ? "text-stone" : "text-graphite",
        )}
      >
        {label}
        {hint ? <span className="ms-2 text-[0.8125rem] text-muted">{hint}</span> : null}
      </span>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          strong ? "text-[0.9375rem] text-ink" : "text-[0.875rem] text-graphite",
        )}
      >
        {amount}
      </span>
    </div>
  );
}
