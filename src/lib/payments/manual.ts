import { env } from "@/config/env";
import { priceLabel } from "@/lib/utils";
import type { PaymentDriver, PaymentStartInput, PaymentStartResult } from "./types";
import type { TranslationKey } from "@/lib/i18n";

/**
 * Règlement différé — virement, espèces à l'atelier, ou paiement à la livraison.
 *
 * C'est le moyen de paiement par défaut : il correspond aux habitudes réelles
 * du marché tunisien, où le paiement à la livraison et le virement restent
 * majoritaires. Aucun encaissement automatique : la commande passe en
 * `awaiting_payment` et l'atelier démarre à réception des fonds.
 */
export const manualDriver: PaymentDriver = {
  id: "manual",
  labelKey: "checkout.manualTitle",
  descriptionKey: "checkout.manualBody",
  isOnline: false,

  async start(input: PaymentStartInput): Promise<PaymentStartResult> {
    const iban = env.PAYMENT_MANUAL_IBAN || (await setting("payment_manual_iban", ""));
    const bank = env.PAYMENT_MANUAL_BANK || (await setting("payment_manual_bank", ""));
    const holder = await setting("payment_manual_holder", "Atelier Restauration");

    const rows: { labelKey: TranslationKey; value: string; copyable?: boolean }[] = [
      { labelKey: "checkout.manualBank", value: bank || "—", copyable: false },
      { labelKey: "checkout.manualIban", value: iban || "—", copyable: !!iban },
      { labelKey: "checkout.orderReference", value: input.order.reference, copyable: true },
      {
        labelKey: "checkout.amountToPay",
        value: priceLabel(input.order.totalMillimes, input.locale),
        copyable: true,
      },
    ];

    if (holder) rows.unshift({ labelKey: "checkout.manualHolder", value: holder });

    return {
      kind: "instructions",
      instructions: {
        titleKey: "checkout.manualTitle",
        bodyKey: "checkout.manualBody",
        noteKey: "checkout.payLaterNote",
        rows,
      },
    };
  },

  async parseWebhook() {
    // Pas de prestataire : aucun appel entrant.
    return null;
  },
};

async function setting(key: string, fallback: string): Promise<string> {
  try {
    const { getSetting } = await import("@/server/services/catalog");
    return (await getSetting<string>(key, fallback)) || fallback;
  } catch {
    return fallback;
  }
}
