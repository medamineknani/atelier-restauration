import "server-only";

import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  assets,
  counters,
  orderAccessTokens,
  orderItems,
  orderNotes,
  orders,
  orderStatusEvents,
  payments,
  type Order,
  type OrderStatusCode,
} from "@/server/db/schema";
import type { Locale } from "@/lib/i18n";
import { addBusinessDays } from "@/lib/utils";
import { getProductById, getSetting } from "./catalog";
import { computeOrder, type OrderLineInput } from "./pricing";
import { isCodDriver } from "@/lib/payments";
import { logAudit } from "./audit";
import { sha256, randomToken } from "@/lib/crypto";

/* -------------------------------------------------------------------------- */
/* Références                                                                  */
/* -------------------------------------------------------------------------- */

async function nextCounter(key: "order" | "invoice") {
  const rows = await db
    .update(counters)
    .set({ value: sql`${counters.value} + 1` })
    .where(eq(counters.key, key))
    .returning({ value: counters.value });
  return rows[0]?.value ?? 1;
}

export async function nextOrderReference() {
  const value = await nextCounter("order");
  return `AR-${new Date().getFullYear()}-${String(value).padStart(4, "0")}`;
}

export async function nextInvoiceNumber() {
  const value = await nextCounter("invoice");
  return `F-${new Date().getFullYear()}-${String(value).padStart(4, "0")}`;
}

/* -------------------------------------------------------------------------- */
/* Cycle de vie                                                                */
/* -------------------------------------------------------------------------- */

export async function createDraft(input: {
  kind: Order["kind"];
  locale: Locale;
  userId?: string | null;
}) {
  const reference = await nextOrderReference();
  const [order] = await db
    .insert(orders)
    .values({
      reference,
      kind: input.kind,
      locale: input.locale,
      userId: input.userId ?? null,
      status: "draft",
      customerSnapshot: { firstName: "", lastName: "", email: "", phone: "" },
      draftExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .returning();
  return order!;
}

export async function getOrderById(id: string) {
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getOrderByReference(reference: string) {
  const rows = await db.select().from(orders).where(eq(orders.reference, reference)).limit(1);
  return rows[0] ?? null;
}

export type OrderWithItems = Order & { items: (typeof orderItems.$inferSelect)[] };

export async function getOrderWithItems(id: string): Promise<OrderWithItems | null> {
  const order = await getOrderById(id);
  if (!order) return null;
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .orderBy(asc(orderItems.itemType), asc(orderItems.id));
  return { ...order, items };
}

/* -------------------------------------------------------------------------- */
/* Composition de la commande                                                  */
/* -------------------------------------------------------------------------- */

export async function setPack(orderId: string, packId: string, locale: Locale) {
  const pack = await getProductById(packId, locale);
  if (!pack || pack.kind !== "pack") throw new Error("Pack introuvable");

  // Un seul pack par commande : on remplace l'ancien et ses extras.
  await db.delete(orderItems).where(eq(orderItems.orderId, orderId));

  await db.insert(orderItems).values({
    orderId,
    productId: pack.id,
    itemType: "pack",
    nameSnapshot: pack.name,
    unitPriceMillimes: pack.priceMillimes,
    quantity: 1,
    totalMillimes: pack.priceMillimes,
    meta: {
      photosGranted: pack.photosIncluded ?? pack.photosMax ?? 0,
      pagesGranted: pack.pagesIncluded ?? 0,
      requiresShipping: pack.requiresShipping,
      turnaroundDays: pack.turnaroundDaysMax,
    },
  });

  const [order] = await db
    .update(orders)
    .set({ kind: pack.family === "photobook" ? "photobook" : "digital", updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  await recalculate(orderId, locale);
  return order!;
}

export async function setExtras(
  orderId: string,
  extras: { productId: string; quantity: number }[],
  locale: Locale,
) {
  await db.delete(orderItems).where(and(eq(orderItems.orderId, orderId), eq(orderItems.itemType, "extra")));

  for (const extra of extras) {
    if (extra.quantity <= 0) continue;
    const product = await getProductById(extra.productId, locale);
    if (!product) continue;
    await db.insert(orderItems).values({
      orderId,
      productId: product.id,
      itemType: "extra",
      nameSnapshot: product.name,
      unitPriceMillimes: product.priceMillimes,
      quantity: extra.quantity,
      totalMillimes: product.priceMillimes * extra.quantity,
      meta: {
        photosGranted: product.extraPhotosGranted * extra.quantity,
        pagesGranted: product.extraPagesGranted * extra.quantity,
        pricingMode: product.pricingMode,
      },
    });
  }

  await recalculate(orderId, locale);
}

/** Recalcule montants, quota de photos, délai — uniquement depuis les données en base. */
export async function recalculate(orderId: string, locale: Locale) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const packItem = items.find((i) => i.itemType === "pack");
  const extraItems = items.filter((i) => i.itemType === "extra");

  const pack = packItem?.productId ? await getProductById(packItem.productId, locale) : null;
  const extras: OrderLineInput[] = [];
  for (const extra of extraItems) {
    if (!extra.productId) continue;
    const product = await getProductById(extra.productId, locale);
    if (product) extras.push({ product, quantity: extra.quantity });
  }

  const shippingFlat = await getSetting("shipping_flat_millimes", 0);
  const computed = computeOrder({
    pack,
    extras,
    shippingFlatMillimes: shippingFlat,
    discountMillimes: 0,
  });

  const [updated] = await db
    .update(orders)
    .set({
      subtotalMillimes: computed.subtotalMillimes,
      shippingMillimes: computed.shippingMillimes,
      discountMillimes: computed.discountMillimes,
      totalMillimes: computed.totalMillimes,
      photosQuota: computed.photosQuota,
      estimatedReadyAt: addBusinessDays(new Date(), computed.turnaroundDays),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .returning();

  return updated ?? null;
}

/* -------------------------------------------------------------------------- */
/* Client & soumission                                                         */
/* -------------------------------------------------------------------------- */

export type CustomerInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  line1?: string;
  line2?: string;
  city?: string;
  governorate?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  newsletter?: boolean;
};

export async function saveCustomer(orderId: string, customer: CustomerInput) {
  const [updated] = await db
    .update(orders)
    .set({
      customerSnapshot: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        line1: customer.line1,
        line2: customer.line2,
        city: customer.city,
        governorate: customer.governorate,
        postalCode: customer.postalCode,
        country: customer.country ?? "TN",
      },
      customerNotes: customer.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .returning();
  return updated ?? null;
}

/**
 * Jeton d'accès invité : jamais stocké en clair.
 *
 * Le jeton est conservé dans `order_access_tokens` en plus de la colonne
 * historique de la commande : plusieurs liens restent valides en même temps,
 * ce qui évite qu'un email plus ancien cesse de fonctionner.
 */
export async function issueGuestToken(orderId: string, label = "lien email") {
  const token = randomToken(24);

  await db
    .update(orders)
    .set({ guestAccessTokenHash: sha256(token), updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await db.insert(orderAccessTokens).values({
    orderId,
    tokenHash: sha256(token),
    label,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });

  return token;
}

export async function verifyGuestToken(order: Order, token: string) {
  if (!token) return false;

  const hash = sha256(token);
  if (order.guestAccessTokenHash === hash) return true;

  const rows = await db
    .select({ id: orderAccessTokens.id })
    .from(orderAccessTokens)
    .where(
      and(
        eq(orderAccessTokens.orderId, order.id),
        eq(orderAccessTokens.tokenHash, hash),
        isNull(orderAccessTokens.revokedAt),
      ),
    )
    .limit(1);

  if (!rows[0]) return false;

  await db
    .update(orderAccessTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(orderAccessTokens.id, rows[0].id));

  return true;
}

/**
 * Une commande est livrée si l'un de ses éléments l'exige — un photobook, ou
 * une restauration remise sur support physique.
 *
 * C'est ce qui rend le paiement à la livraison possible : sans colis, il n'y
 * a rien contre quoi remettre l'argent.
 */
export async function orderRequiresShipping(orderId: string): Promise<boolean> {
  const items = await db
    .select({ meta: orderItems.meta })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return items.some(
    (item) => (item.meta as { requiresShipping?: boolean } | null)?.requiresShipping === true,
  );
}

/**
 * Vérifie qu'un moyen de règlement est acceptable pour cette commande.
 *
 * Le formulaire ne propose déjà que les moyens valides, mais le choix arrive
 * du navigateur : il est revérifié ici.
 */
export async function assertPaymentAllowed(
  orderId: string,
  provider: string,
): Promise<void> {
  if (!isCodDriver({ id: provider })) return;

  if (!(await orderRequiresShipping(orderId))) {
    throw new Error("COD_UNAVAILABLE");
  }

  const limit = await getSetting<number>("payment_cod_max_millimes", 0);
  const order = await getOrderById(orderId);
  if (limit > 0 && order && order.totalMillimes > limit) {
    throw new Error("COD_OVER_LIMIT");
  }
}

/**
 * Bascule la commande du brouillon à la commande.
 *
 * Le statut d'arrivée dépend du moyen de règlement : un virement attend les
 * fonds, un paiement à la livraison n'attend rien.
 */
export async function submitOrder(orderId: string, provider: string) {
  const order = await getOrderById(orderId);
  if (!order) throw new Error("Commande introuvable");

  await assertPaymentAllowed(orderId, provider);

  await db
    .update(orders)
    .set({ submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await db.insert(payments).values({
    orderId,
    provider,
    amountMillimes: order.totalMillimes,
    currency: order.currency,
    status: "pending",
  });

  const isCod = isCodDriver({ id: provider });

  await changeStatus(orderId, isCod ? "received" : "awaiting_payment", {
    actorId: null,
    notify: false,
    // Contre-remboursement : la commande est reçue, mais rien n'est encaissé.
    markPaid: !isCod,
  });

  return getOrderById(orderId);
}

/* -------------------------------------------------------------------------- */
/* Contre-remboursement                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Constate l'encaissement à la livraison.
 *
 * C'est le seul endroit qui renseigne `paidAt` pour une commande en
 * contre-remboursement : la date de paiement doit être celle de la remise du
 * colis, pas celle de la commande.
 */
export async function markCodCollected(
  orderId: string,
  actor: { id: string; email: string },
): Promise<void> {
  const now = new Date();

  await db
    .update(payments)
    .set({ status: "succeeded", updatedAt: now })
    .where(and(eq(payments.orderId, orderId), eq(payments.provider, "cod")));

  await db
    .update(orders)
    .set({ paidAt: now, updatedAt: now })
    .where(and(eq(orders.id, orderId), isNull(orders.paidAt)));

  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "payment.cod_collected",
    entityType: "order",
    entityId: orderId,
    metadata: { at: now.toISOString() },
  });
}

/** Colis refusé ou client absent : on repart chercher l'argent. */
export async function markCodRefused(
  orderId: string,
  actor: { id: string; email: string },
): Promise<void> {
  await db
    .update(payments)
    .set({ status: "failed", failureReason: "refusé à la livraison", updatedAt: new Date() })
    .where(and(eq(payments.orderId, orderId), eq(payments.provider, "cod")));

  await db
    .update(orders)
    .set({ paidAt: null, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "payment.cod_refused",
    entityType: "order",
    entityId: orderId,
  });
}

/* -------------------------------------------------------------------------- */
/* Statuts                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Transitions autorisées.
 *
 * Exposé tel quel : le back-office ne doit proposer que les statuts
 * réellement atteints, jamais une liste complète qui laisserait l'opérateur
 * invalider la machine à états d'un clic distrait.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatusCode, OrderStatusCode[]> = {
  // `received` est atteignable depuis `draft` pour le paiement à la livraison :
  // il n'y a aucun règlement à attendre, la commande entre directement en
  // production. Toute autre soumission passe par `awaiting_payment`.
  draft: ["awaiting_payment", "received", "cancelled"],
  awaiting_payment: ["received", "cancelled", "on_hold"],
  received: ["processing", "on_hold", "cancelled", "refunded"],
  processing: ["restoring", "on_hold", "cancelled"],
  restoring: ["checking", "on_hold"],
  checking: ["ready", "restoring"],
  ready: ["shipped", "completed", "on_hold"],
  // `on_hold` après expédition : un colis refusé ou un encaissement manqué
  // doit pouvoir être mis de côté sans passer pour terminé.
  shipped: ["completed", "on_hold"],
  completed: [],
  on_hold: ["received", "processing", "restoring", "checking", "ready", "cancelled"],
  cancelled: [],
  refunded: [],
};

export function canTransition(from: OrderStatusCode, to: OrderStatusCode) {
  return from === to || (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export async function changeStatus(
  orderId: string,
  to: OrderStatusCode,
  options: {
    actorId?: string | null;
    message?: string | null;
    notify?: boolean;
    visibleToClient?: boolean;
    /**
     * `received` vaut normalement « nous avons l'argent, le travail commence ».
     * Le paiement à la livraison fait exception : la commande est reçue, mais
     * l'encaissement n'aura lieu qu'à la remise du colis.
     */
    markPaid?: boolean;
    tracking?: { carrier?: string; trackingNumber?: string } | null;
  } = {},
) {
  const order = await getOrderById(orderId);
  if (!order) throw new Error("Commande introuvable");
  if (!canTransition(order.status, to)) {
    throw new Error(`Transition interdite : ${order.status} → ${to}`);
  }

  const from = order.status;
  const markPaid = options.markPaid ?? true;

  await db
    .update(orders)
    .set({
      status: to,
      updatedAt: new Date(),
      paidAt: to === "received" && markPaid && !order.paidAt ? new Date() : order.paidAt,
      completedAt: to === "completed" ? new Date() : order.completedAt,
      shippingCarrier: options.tracking?.carrier ?? order.shippingCarrier,
      shippingTracking: options.tracking?.trackingNumber ?? order.shippingTracking,
    })
    .where(eq(orders.id, orderId));

  await db.insert(orderStatusEvents).values({
    orderId,
    fromStatus: from,
    toStatus: to,
    message: options.message ?? null,
    visibleToClient: options.visibleToClient ?? true,
    actorId: options.actorId ?? null,
  });

  if (options.message?.trim()) {
    await db.insert(orderNotes).values({
      orderId,
      authorId: options.actorId ?? null,
      authorName: "Atelier",
      body: options.message.trim(),
      isInternal: false,
    });
  }

  if (options.notify ?? true) {
    const { queueOrderStatusEmail } = await import("./notifications");
    await queueOrderStatusEmail(orderId, to, options.message ?? null);
  }

  return getOrderById(orderId);
}

export async function getStatusTimeline(orderId: string) {
  return db
    .select()
    .from(orderStatusEvents)
    .where(and(eq(orderStatusEvents.orderId, orderId), eq(orderStatusEvents.visibleToClient, true)))
    .orderBy(asc(orderStatusEvents.createdAt));
}

export async function listOrders(filters: {
  status?: OrderStatusCode;
  kind?: string;
  search?: string;
  limit?: number;
} = {}) {
  const conditions = [isNull(orders.deletedAt), sql`${orders.status} <> 'draft'`];
  if (filters.status) conditions.push(eq(orders.status, filters.status));
  if (filters.kind) conditions.push(eq(orders.kind, filters.kind as Order["kind"]));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        sql`${orders.reference} ilike ${term}`,
        sql`${orders.customerSnapshot}->>'email' ilike ${term}`,
        sql`${orders.customerSnapshot}->>'lastName' ilike ${term}`,
        sql`${orders.customerSnapshot}->>'firstName' ilike ${term}`,
        sql`${orders.customerSnapshot}->>'phone' ilike ${term}`,
      )!,
    );
  }

  return db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(filters.limit ?? 100);
}

export async function listOrdersForUser(userId: string) {
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), isNull(orders.deletedAt), sql`${orders.status} <> 'draft'`))
    .orderBy(desc(orders.createdAt));
}

/** Photos déjà envoyées, compteur maintenu à jour après chaque upload. */
export async function refreshPhotosCount(orderId: string) {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assets)
    .where(
      and(eq(assets.orderId, orderId), eq(assets.kind, "original"), isNull(assets.deletedAt)),
    );
  const count = rows[0]?.count ?? 0;
  await db.update(orders).set({ photosCount: count }).where(eq(orders.id, orderId));
  return count;
}
