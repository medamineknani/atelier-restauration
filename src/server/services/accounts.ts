import "server-only";

import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import { randomToken, sha256 } from "@/lib/crypto";
import { db } from "@/server/db";
import {
  addresses,
  invoices,
  orderNotes,
  orders,
  users,
  verificationTokens,
  type Order,
} from "@/server/db/schema";
import type { Locale } from "@/lib/i18n";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

/* -------------------------------------------------------------------------- */
/* Comptes                                                                     */
/* -------------------------------------------------------------------------- */

const MAGIC_LINK_MINUTES = 60;

export async function findUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(sql`lower(${users.email})`, email.trim().toLowerCase()), isNull(users.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Connexion sans mot de passe.
 *
 * Le lien est le seul secret : le compte est créé s'il n'existe pas, ce qui
 * évite d'imposer un mot de passe à quelqu'un qui vient de confier ses photos
 * et veut simplement savoir où elles en sont.
 */
export async function issueMagicLink(email: string, locale: Locale) {
  const normalized = email.trim().toLowerCase();
  let user = await findUserByEmail(normalized);

  if (!user) {
    const [created] = await db
      .insert(users)
      .values({ email: normalized, emailVerified: false, preferredLocale: locale })
      .returning();
    user = created!;
  }

  const token = randomToken(32);
  await db.insert(verificationTokens).values({
    email: normalized,
    tokenHash: sha256(token),
    purpose: "magic_link",
    expiresAt: new Date(Date.now() + MAGIC_LINK_MINUTES * 60 * 1000),
  });

  const { site } = await import("@/config/site");
  const { localePath } = await import("@/lib/i18n");
  const link = `${site.url}${localePath(locale, "/connexion/lien")}?t=${token}`;

  const { sendMagicLink } = await import("./notifications");
  await sendMagicLink(normalized, link, locale);

  return { token, email: normalized, link };
}

export async function consumeMagicLink(token: string) {
  const hash = sha256(token);
  const rows = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.tokenHash, hash))
    .limit(1);

  const record = rows[0];
  if (!record || record.consumedAt || record.expiresAt < new Date()) return null;

  const user = await findUserByEmail(record.email);
  if (!user) return null;

  await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(verificationTokens.id, record.id));

  await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, user.id));

  return user;
}

export async function signInWithPassword(email: string, password: string) {
  const user = await findUserByEmail(email);
  // Message unique : ne jamais révéler si l'adresse existe.
  if (!user?.passwordHash) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}

export async function setPassword(userId: string, password: string) {
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/* -------------------------------------------------------------------------- */
/* Rattachement des commandes invitées                                         */
/* -------------------------------------------------------------------------- */

/**
 * Rattache les commandes passées en invité à un compte qui vient d'être créé.
 *
 * Sans cela, un client qui commande sans compte puis se connecte avec la même
 * adresse ne retrouverait rien : ses photos existeraient, invisibles.
 */
export async function claimGuestOrders(userId: string, email: string) {
  const normalized = email.trim().toLowerCase();

  const claimed = await db
    .update(orders)
    .set({ userId, updatedAt: new Date() })
    .where(
      and(
        isNull(orders.userId),
        or(
          eq(sql`lower(${orders.guestEmail})`, normalized),
          eq(sql`lower(${orders.customerSnapshot}->>'email')`, normalized),
        ),
      ),
    )
    .returning({ id: orders.id, reference: orders.reference });

  for (const order of claimed) {
    await db.insert(orderNotes).values({
      orderId: order.id,
      authorId: userId,
      authorName: "Système",
      body: "Commande rattachée à un compte client.",
      isInternal: true,
    });
  }

  return claimed.length;
}

/* -------------------------------------------------------------------------- */
/* Lecture                                                                     */
/* -------------------------------------------------------------------------- */

export async function ordersForUser(userId: string) {
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), isNull(orders.deletedAt), sql`${orders.status} <> 'draft'`))
    .orderBy(desc(orders.createdAt));
}

export async function orderForUser(reference: string, userId: string) {
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.reference, reference), eq(orders.userId, userId), isNull(orders.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function visibleMessages(orderId: string) {
  return db
    .select()
    .from(orderNotes)
    .where(and(eq(orderNotes.orderId, orderId), eq(orderNotes.isInternal, false)))
    .orderBy(desc(orderNotes.createdAt));
}

export async function sendClientMessage(orderId: string, userId: string, body: string) {
  const rows = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);

  await db.insert(orderNotes).values({
    orderId,
    authorId: userId,
    authorName: rows[0]?.name || "Client",
    body: body.trim(),
    isInternal: false,
  });
}

/* -------------------------------------------------------------------------- */
/* Préférences                                                                 */
/* -------------------------------------------------------------------------- */

export async function updatePreferences(
  userId: string,
  values: { preferredLocale?: Locale; notifyEmail?: boolean; name?: string; phone?: string },
) {
  await db
    .update(users)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function addressesForUser(userId: string) {
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(asc(addresses.createdAt));
}

/* -------------------------------------------------------------------------- */
/* Facture                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Facture à la volée, figée dans un instantané.
 *
 * Le numéro est attribué une seule fois (contrainte d'unicité) ; les montants
 * et le détail sont copiés dans `snapshot` au moment de l'émission, si bien
 * qu'une modification ultérieure du catalogue ne réécrit jamais l'histoire
 * comptable.
 */
export async function ensureInvoice(order: Order): Promise<{ number: string; issuedAt: Date }> {
  const existing = await db
    .select()
    .from(invoices)
    .where(eq(invoices.orderId, order.id))
    .limit(1);

  if (existing[0]) {
    return { number: existing[0].number, issuedAt: existing[0].issuedAt };
  }

  const { nextInvoiceNumber } = await import("./orders");
  const number = await nextInvoiceNumber();

  await db.insert(invoices).values({
    orderId: order.id,
    number,
    amountMillimes: order.totalMillimes,
    snapshot: {
      reference: order.reference,
      issuedAt: new Date().toISOString(),
      customer: order.customerSnapshot,
      subtotalMillimes: order.subtotalMillimes,
      shippingMillimes: order.shippingMillimes,
      discountMillimes: order.discountMillimes,
      totalMillimes: order.totalMillimes,
      currency: order.currency,
    },
  });

  return { number, issuedAt: new Date() };
}

/* -------------------------------------------------------------------------- */
/* Suppression de compte (RGPD)                                               */
/* -------------------------------------------------------------------------- */

/**
 * Suppression « douce » : le compte devient invisible et les fichiers partent
 * au prochain passage du job de rétention. On ne supprime jamais une commande
 * dont la facture doit être conservée dix ans.
 */
export async function requestAccountDeletion(userId: string) {
  await db
    .update(users)
    .set({
      deletedAt: new Date(),
      email: sql`${users.email} || '.supprime.' || ${Date.now()}`,
      passwordHash: null,
      phone: null,
      name: "",
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
