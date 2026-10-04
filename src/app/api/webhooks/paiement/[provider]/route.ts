import { and, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { orders, payments } from "@/server/db/schema";
import { getPaymentDriver } from "@/lib/payments";
import { logAudit } from "@/server/services/audit";
import { changeStatus } from "@/server/services/orders";

/**
 * Point d'entrée des passerelles de paiement.
 *
 * Une seule route pour tous les prestataires : c'est le pilote — et lui seul —
 * qui sait lire et authentifier le corps de la requête. Ajouter Konnect ou
 * Flouci plus tard n'ajoute aucune route, aucun contrôleur, aucune branche
 * dans le tunnel de commande.
 *
 * Deux règles tiennent à la sécurité de cet endroit :
 *  1. le montant n'est **jamais** lu depuis la requête — il est relu depuis la
 *     commande en base ;
 *  2. une requête non reconnue répond `200`, pas `400` : un prestataire qui
 *     reçoit une erreur réessaie en boucle, et finirait par nous noyer.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const driver = getPaymentDriver(provider);

  if (!driver) {
    return Response.json({ received: false, reason: "unknown_provider" }, { status: 404 });
  }

  let event;
  try {
    event = await driver.parseWebhook(request);
  } catch (error) {
    console.error(`[webhook:${provider}] lecture du corps`, error);
    return Response.json({ received: false, reason: "unreadable" }, { status: 400 });
  }

  if (!event) {
    return Response.json({ received: false, reason: "ignored" }, { status: 200 });
  }

  const rows = await db
    .select()
    .from(payments)
    .where(and(eq(payments.provider, provider), eq(payments.providerRef, event.providerRef)))
    .orderBy(desc(payments.createdAt))
    .limit(1);

  const payment = rows[0];
  if (!payment) {
    console.warn(
      `[webhook:${provider}] référence inconnue ${event.providerRef} — rien à rapprocher`,
    );
    return Response.json({ received: true, matched: false }, { status: 202 });
  }

  const status = event.status === "paid" ? "succeeded" : event.status;

  await db
    .update(payments)
    .set({
      status,
      rawPayload: event.raw ?? null,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id));

  await logAudit({
    action: `payment.${status}`,
    entityType: "payment",
    entityId: payment.id,
    metadata: {
      provider,
      providerRef: event.providerRef,
      amountMillimes: event.amountMillimes ?? payment.amountMillimes,
    },
  });

  // Encaissement confirmé : la commande quitte l'attente de règlement.
  if (status === "succeeded") {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, payment.orderId))
      .limit(1);

    // Contrôle anti-fraude : le prestataire annonce un montant, on le compare
    // à celui de la commande. Un écart, même d'un millime, reste en attente.
    const mismatch =
      event.amountMillimes !== undefined && event.amountMillimes !== payment.amountMillimes;

    if (order && order.status === "awaiting_payment" && !mismatch) {
      await changeStatus(order.id, "received", {
        actorId: null,
        message: `Règlement confirmé par ${provider}`,
        notify: false,
      });
    } else if (mismatch) {
      console.warn(
        `[webhook:${provider}] montant annoncé ${event.amountMillimes} ≠ ${payment.amountMillimes} pour ${order?.reference}`,
      );
    }
  }

  return Response.json({ received: true, matched: true, status }, { status: 200 });
}
