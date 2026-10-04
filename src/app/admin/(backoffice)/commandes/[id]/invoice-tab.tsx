import type { invoices, payments as paymentsTable } from "@/server/db/schema";
import type { OrderStatusCode } from "@/server/db/schema";
import { createTranslator } from "@/lib/i18n";
import { formatShortDate, priceLabel } from "@/lib/utils";
import { DetailRow, Panel } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import {
  markCodCollected as markCodCollectedAction,
  markCodRefused as markCodRefusedAction,
  regenerateInvoice,
} from "@/server/actions/admin";

/** Libellés lisibles : « cod » ou « pending » n'aident personne au téléphone. */
const PROVIDER_LABELS: Record<string, string> = {
  cod: "Paiement à la livraison",
  manual: "Paiement différé (virement, espèces)",
};

const PAYMENT_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "en attente", tone: "text-warning" },
  succeeded: { label: "encaissé", tone: "text-success" },
  failed: { label: "échec", tone: "text-danger" },
  refunded: { label: "remboursé", tone: "text-stone" },
  partially_refunded: { label: "remboursé partiellement", tone: "text-stone" },
};

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
          <div className="grid gap-5">
            {payments.map((payment) => {
              const state = PAYMENT_STATUS[payment.status] ?? {
                label: payment.status,
                tone: "text-stone",
              };
              const isCod = payment.provider === "cod";
              const toCollect = isCod && payment.status === "pending";

              return (
                <div key={payment.id} className="grid gap-3">
                  <dl>
                    <DetailRow label="Moyen choisi">
                      {PROVIDER_LABELS[payment.provider] ?? payment.provider}
                    </DetailRow>
                    <DetailRow label="Montant">
                      {priceLabel(payment.amountMillimes, "fr")}
                    </DetailRow>
                    <DetailRow label="État">
                      <span className={state.tone}>{state.label}</span>
                    </DetailRow>
                    <DetailRow label="Créé le">
                      {formatShortDate(payment.createdAt, "fr")}
                    </DetailRow>
                    {payment.providerRef ? (
                      <DetailRow label="Référence prestataire">
                        {payment.providerRef}
                      </DetailRow>
                    ) : null}
                    {payment.failureReason ? (
                      <DetailRow label="Motif">{payment.failureReason}</DetailRow>
                    ) : null}
                  </dl>

                  {toCollect ? (
                    <div className="rounded-sm border border-warning/40 bg-warning/5 p-4">
                      <p className="text-[0.8125rem] text-ink">
                        {t("admin.codToCollect")} —{" "}
                        {priceLabel(payment.amountMillimes, "fr")}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <form action={markCodCollectedAction}>
                          <input type="hidden" name="orderId" value={orderId} />
                          <ConfirmButton
                            label={t("admin.codCollected")}
                            confirm={t("admin.codCollectConfirm", {
                              amount: priceLabel(payment.amountMillimes, "fr"),
                            })}
                          />
                        </form>
                        <form action={markCodRefusedAction}>
                          <input type="hidden" name="orderId" value={orderId} />
                          <ConfirmButton
                            label={t("admin.codRefused")}
                            confirm={t("admin.codRefuseConfirm")}
                            variant="danger"
                          />
                        </form>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
