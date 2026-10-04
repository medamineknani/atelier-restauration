import type { invoices, payments as paymentsTable } from "@/server/db/schema";
import type { OrderStatusCode } from "@/server/db/schema";
import { createTranslator } from "@/lib/i18n";
import { formatShortDate, priceLabel } from "@/lib/utils";
import { regenerateInvoice } from "@/server/actions/admin";
import { DetailRow, Panel } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";

const INVOICEABLE: OrderStatusCode[] = [
  "received",
  "processing",
  "restoring",
  "checking",
  "ready",
  "shipped",
  "completed",
];

/**
 * Facture.
 *
 * Le numéro est attribué une seule fois, au paiement, puis figé : une
 * facture déjà communiquée ne change plus, même si le catalogue bouge. On ne
 * peut que régénérer le document, jamais renuméroter.
 */
export function InvoiceTab({
  orderId,
  reference,
  invoice,
  payments,
  totalMillimes,
  status,
}: {
  orderId: string;
  reference: string;
  invoice: (typeof invoices.$inferSelect) | null;
  payments: (typeof paymentsTable.$inferSelect)[];
  totalMillimes: number;
  status: OrderStatusCode;
}) {
  const t = createTranslator("fr");

  return (
    <div className="grid gap-4">
      <Panel title={t("admin.invoice")}>
        {invoice ? (
          <div className="grid gap-4">
            <dl>
              <DetailRow label={t("admin.invoiceNumber", { number: invoice.number })}>
                {formatShortDate(invoice.issuedAt, "fr")}
              </DetailRow>
              <DetailRow label={t("common.total")}>
                {priceLabel(invoice.amountMillimes, "fr")}
              </DetailRow>
            </dl>

            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/compte/commandes/${reference}/facture`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-sm border border-line-strong px-4 py-2 text-[0.8125rem] text-ink transition-fast hover:border-champagne hover:bg-cream"
              >
                {t("admin.viewInvoice")}
              </a>

              <form action={regenerateInvoice}>
                <input type="hidden" name="orderId" value={orderId} />
                <ConfirmButton
                  label={t("admin.regenerateInvoice")}
                  confirm="Le numéro de facture reste identique. Continuer ?"
                  variant="secondary"
                />
              </form>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="text-[0.875rem] text-stone">
              {INVOICEABLE.includes(status)
                ? "Aucune facture éditée pour cette commande."
                : "La facture sera éditée à la réception du paiement."}
            </p>

            {INVOICEABLE.includes(status) ? (
              <form action={regenerateInvoice} className="flex">
                <input type="hidden" name="orderId" value={orderId} />
                <ConfirmButton
                  label={t("admin.regenerateInvoice")}
                  confirm={`Éditer la facture de ${priceLabel(totalMillimes, "fr")} ?`}
                />
              </form>
            ) : null}
          </div>
        )}
      </Panel>

      <Panel title={t("admin.paymentProvider")}>
        {payments.length === 0 ? (
          <p className="text-[0.875rem] text-muted">{t("admin.paymentNone")}</p>
        ) : (
          <dl>
            {payments.map((payment) => (
              <DetailRow
                key={payment.id}
                label={`${payment.provider} · ${formatShortDate(payment.createdAt, "fr")}`}
              >
                {priceLabel(payment.amountMillimes, "fr")} · {payment.status}
                {payment.providerRef ? ` · ${payment.providerRef}` : ""}
              </DetailRow>
            ))}
          </dl>
        )}
      </Panel>
    </div>
  );
}
