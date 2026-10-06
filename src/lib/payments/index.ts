import { env } from "@/config/env";
import type { PaymentDriver } from "./types";
import { manualDriver } from "./manual";
import { codDriver } from "./cod";

export type { PaymentDriver, PaymentInstructions, PaymentStartResult, WebhookEvent } from "./types";

/**
 * Registre des moyens de paiement.
 *
 * Un pilote n'est actif que s'il est listé dans `PAYMENT_PROVIDERS` : on peut
 * donc activer une passerelle en production par simple variable
 * d'environnement, sans redéploiement de code, et la désactiver en une seconde
 * si le prestataire est indisponible.
 */
const registry: PaymentDriver[] = [manualDriver, codDriver];

export function listPaymentDrivers(): PaymentDriver[] {
  const enabled = new Set(env.PAYMENT_PROVIDERS);
  return registry.filter((driver) => enabled.has(driver.id));
}

export function getPaymentDriver(id: string): PaymentDriver | null {
  const driver = registry.find((candidate) => candidate.id === id);
  if (!driver) return null;
  return env.PAYMENT_PROVIDERS.includes(driver.id) ? driver : null;
}

/** Premier moyen disponible — utilisé quand la commande n'en précise aucun. */
export function defaultPaymentDriver(): PaymentDriver {
  return listPaymentDrivers()[0] ?? manualDriver;
}

export function isCodDriver(driver: Pick<PaymentDriver, "id">): boolean {
  return driver.id === codDriver.id;
}

export { codDriver };
