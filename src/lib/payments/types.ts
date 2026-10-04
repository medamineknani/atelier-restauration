import type { Order } from "@/server/db/schema";
import type { Locale, TranslationKey } from "@/lib/i18n";

/**
 * Interface de paiement — **volontairement abstraite**.
 *
 * Aucun prestataire n'est figé dans le code marchand : chaque moyen de
 * règlement est un pilote qui implémente ce contrat et se déclare dans le
 * registre. Ajouter Konnect, Flouci ou une passerelle internationale plus tard
 * revient à écrire un fichier de plus, sans toucher au tunnel de commande.
 *
 * Règle absolue : le montant n'est **jamais** fourni par le navigateur. Il est
 * relu depuis la commande côté serveur à chaque appel.
 */

export type PaymentStartInput = {
  order: Order;
  locale: Locale;
  /** URL de retour communiquée au prestataire. */
  returnUrl: string;
};

/** Ce que le pilote renvoie une fois le règlement amorcé. */
export type PaymentStartResult =
  /** Redirection vers la page de paiement du prestataire. */
  | { kind: "redirect"; url: string }
  /** Aucun encaissement en ligne : on affiche des instructions au client. */
  | { kind: "instructions"; instructions: PaymentInstructions }
  /** Formulaire à soumettre en POST (passerelles « hosted form »). */
  | { kind: "form"; action: string; fields: Record<string, string> };

export type PaymentInstructions = {
  /** Clé i18n du titre affiché au client. */
  titleKey: TranslationKey;
  /** Clé i18n du corps. */
  bodyKey: TranslationKey;
  /** Paires libellé / valeur affichées dans un tableau sobre. */
  rows: { labelKey: TranslationKey; value: string; copyable?: boolean }[];
  noteKey?: TranslationKey;
};

export type WebhookEvent = {
  providerRef: string;
  status: "paid" | "failed" | "refunded";
  amountMillimes?: number;
  raw?: unknown;
};

export interface PaymentDriver {
  id: string;
  /** Clé de traduction du libellé (`checkout.manualTitle`…). */
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  /** `true` = encaissement immédiat en ligne. */
  isOnline: boolean;
  start(input: PaymentStartInput): Promise<PaymentStartResult>;
  /** Analyse un appel entrant du prestataire. */
  parseWebhook(request: Request): Promise<WebhookEvent | null>;
  refund?(input: { order: Order; amountMillimes: number }): Promise<void>;
}
