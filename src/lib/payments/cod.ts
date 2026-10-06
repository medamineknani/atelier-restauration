import { priceLabel } from "@/lib/utils";
import type { PaymentDriver, PaymentStartInput, PaymentStartResult } from "./types";
import type { TranslationKey } from "@/lib/i18n";

/**
 * Paiement à la livraison (contre-remboursement).
 *
 * Ce n'est pas une variante du virement : c'est le seul moyen de règlement où
 * l'atelier **avance le travail avant d'être payé**. Deux conséquences, et
 * elles ne sont pas négociables :
 *
 *  1. la commande ne doit pas attendre dans « en attente de paiement » — il
 *     n'y a rien à attendre, l'argent vient avec le colis ;
 *  2. `paidAt` reste vide jusqu'à l'encaissement effectif, sinon la facture
 *     et les indicateurs mentent.
 *
 * Sur le marché tunisien, c'est souvent le moyen le plus demandé : il lève la
 * défiance envers le paiement en ligne, le client paie en main propre.
 */
export const codDriver: PaymentDriver = {
  id: "cod",
  labelKey: "checkout.codTitle",
  descriptionKey: "checkout.codBody",
  isOnline: false,

  async start(input: PaymentStartInput): Promise<PaymentStartResult> {
    const rows: { labelKey: TranslationKey; value: string; copyable?: boolean }[] = [
      {
        labelKey: "checkout.codAmountToPrepare",
        value: priceLabel(input.order.totalMillimes, input.locale),
        copyable: true,
      },
      {
        labelKey: "checkout.orderReference",
        value: input.order.reference,
        copyable: true,
      },
    ];

    return {
      kind: "instructions",
      instructions: {
        titleKey: "checkout.codTitle",
        bodyKey: "checkout.codBody",
        noteKey: "checkout.codNote",
        rows,
      },
    };
  },

  async parseWebhook() {
    // Aucun prestataire : l'encaissement est constaté par l'atelier, dans le
    // back-office, au moment de la remise du colis.
    return null;
  },
};
