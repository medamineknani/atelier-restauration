import "server-only";

import { redirect } from "next/navigation";
import { localePath, type Locale } from "@/lib/i18n";
import { readDraftOrderId } from "@/lib/draft";
import { getOrderWithItems, type OrderWithItems } from "./orders";

/**
 * Brouillon courant, ou renvoi vers l'entrée du tunnel.
 *
 * Chaque étape du tunnel passe par ici : sans brouillon valide, on repart de
 * l'étape 1 plutôt que d'afficher une page cassée. Une commande déjà soumise
 * n'est plus un brouillon — elle se consulte depuis l'espace client.
 */
export async function currentDraft(locale: Locale): Promise<OrderWithItems> {
  const orderId = await readDraftOrderId();
  if (!orderId) redirect(localePath(locale, "/commande/service"));

  const order = await getOrderWithItems(orderId);
  if (!order || order.status !== "draft") redirect(localePath(locale, "/commande/service"));

  return order;
}
