import "server-only";

import { and, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db";
import {
  assets,
  auditLogs,
  invoices,
  orderItems,
  orderNotes,
  orderStatusEvents,
  orders,
  payments,
  users,
} from "@/server/db/schema";
import type { OrderStatusCode } from "@/server/db/schema";

/* -------------------------------------------------------------------------- */
/* File de production                                                          */
/* -------------------------------------------------------------------------- */

export const PIPELINE: OrderStatusCode[] = [
  "awaiting_payment",
  "received",
  "processing",
  "restoring",
  "checking",
  "ready",
  "shipped",
  "completed",
];

/** Statuts qui demandent une action humaine, et donc qu'on retrouve en tête. */
const WORK_QUEUE: OrderStatusCode[] = ["received", "processing", "restoring", "checking"];
const ATTENTION: OrderStatusCode[] = ["awaiting_payment", "on_hold"];

export type DashboardStats = Awaited<ReturnType<typeof dashboardStats>>;

export async function dashboardStats() {
  // Répartition par statut : une seule requête groupée, pas douze.
  const byStatus = await db
    .select({ status: orders.status, count: count() })
    .from(orders)
    .where(and(isNull(orders.deletedAt), sql`${orders.status} <> 'draft'`))
    .groupBy(orders.status);

  const distribution = new Map(byStatus.map((row) => [row.status, Number(row.count)]));

  // File de production : les plus anciennes d'abord.
  const queue = await db
    .select()
    .from(orders)
    .where(and(isNull(orders.deletedAt), inArray(orders.status, WORK_QUEUE)))
    .orderBy(sql`${orders.submittedAt} asc nulls last`, orders.createdAt)
    .limit(12);

  const waiting = await db
    .select()
    .from(orders)
    .where(and(isNull(orders.deletedAt), inArray(orders.status, ATTENTION)))
    .orderBy(orders.createdAt)
    .limit(12);

  const recent = await db
    .select()
    .from(orders)
    .where(and(isNull(orders.deletedAt), sql`${orders.status} <> 'draft'`))
    .orderBy(desc(orders.createdAt))
    .limit(10);

  // Indicateurs du mois en cours.
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const [month] = await db
    .select({
      orders: count(),
      revenue: sql<number>`coalesce(sum(${orders.totalMillimes}), 0)::int`,
      photobooks: sql<number>`count(*) filter (where ${orders.kind} = 'photobook')::int`,
    })
    .from(orders)
    .where(
      and(
        isNull(orders.deletedAt),
        sql`${orders.status} <> 'draft'`,
        sql`${orders.createdAt} >= ${start.toISOString()}`,
      ),
    );

  const totalOrders = Number(month?.orders ?? 0);

  return {
    distribution,
    queue,
    waiting,
    recent,
    month: {
      orders: totalOrders,
      revenueMillimes: Number(month?.revenue ?? 0),
      averageMillimes: totalOrders > 0 ? Math.round(Number(month?.revenue ?? 0) / totalOrders) : 0,
      photobookShare: totalOrders > 0 ? Number(month?.photobooks ?? 0) / totalOrders : 0,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Liste des commandes                                                         */
/* -------------------------------------------------------------------------- */

export type OrderListFilters = {
  statuses?: OrderStatusCode[];
  kind?: string;
  search?: string;
  overdueOnly?: boolean;
  page?: number;
  perPage?: number;
};

/** Recherche insensible à la casse sur référence, nom, email et téléphone. */
function searchCondition(term: string): SQL | undefined {
  const like = `%${term}%`;
  return or(
    ilike(orders.reference, like),
    ilike(orders.guestEmail, like),
    sql`lower(${orders.customerSnapshot}->>'email') like lower(${like})`,
    sql`lower(${orders.customerSnapshot}->>'firstName') like lower(${like})`,
    sql`lower(${orders.customerSnapshot}->>'lastName') like lower(${like})`,
    sql`${orders.customerSnapshot}->>'phone' like ${like}`,
  );
}

export async function listOrdersAdmin(filters: OrderListFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(100, Math.max(10, filters.perPage ?? 25));

  const clauses: (SQL | undefined)[] = [isNull(orders.deletedAt), sql`${orders.status} <> 'draft'`];

  if (filters.statuses?.length) clauses.push(inArray(orders.status, filters.statuses));
  if (filters.kind) clauses.push(eq(orders.kind, filters.kind as "digital"));
  if (filters.search?.trim()) clauses.push(searchCondition(filters.search.trim()));
  if (filters.overdueOnly) {
    clauses.push(
      sql`${orders.estimatedReadyAt} is not null and ${orders.estimatedReadyAt} < now() and ${orders.status} not in ('completed', 'cancelled', 'refunded')`,
    );
  }

  const where = and(...clauses);

  const rows = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(perPage)
    .offset((page - 1) * perPage);

  const [total] = await db.select({ count: count() }).from(orders).where(where);

  return { rows, total: Number(total?.count ?? 0), page, perPage };
}

/** Nombre de photos et de résultats, en une requête, pour toute une page. */
export async function assetCounts(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, { originals: number; restored: number }>();

  const rows = await db
    .select({
      orderId: assets.orderId,
      kind: assets.kind,
      count: count(),
    })
    .from(assets)
    .where(and(inArray(assets.orderId, orderIds), isNull(assets.deletedAt)))
    .groupBy(assets.orderId, assets.kind);

  const map = new Map<string, { originals: number; restored: number }>();
  for (const row of rows) {
    if (!row.orderId) continue;
    const entry = map.get(row.orderId) ?? { originals: 0, restored: 0 };
    if (row.kind === "original") entry.originals = Number(row.count);
    if (row.kind === "restored") entry.restored = Number(row.count);
    map.set(row.orderId, entry);
  }
  return map;
}

/* -------------------------------------------------------------------------- */
/* Détail d'une commande                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Tout l'écran en une seule fonction.
 *
 * Le back-office vit sur un écran unique : multiplier les allers-retours
 * base de données ferait perdre le bénéfice. Les lectures sont parallèles et
 * aucune n'est bloquante pour les autres.
 */
export async function orderDetail(id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;

  const [items, events, notes, originals, restored, invoiceRows, paymentRows, audit, client] =
    await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(orderItems.id),
      db
        .select()
        .from(orderStatusEvents)
        .where(eq(orderStatusEvents.orderId, id))
        .orderBy(orderStatusEvents.createdAt),
      db.select().from(orderNotes).where(eq(orderNotes.orderId, id)).orderBy(desc(orderNotes.createdAt)),
      db
        .select()
        .from(assets)
        .where(and(eq(assets.orderId, id), eq(assets.kind, "original"), isNull(assets.deletedAt)))
        .orderBy(assets.position, assets.createdAt),
      db
        .select()
        .from(assets)
        .where(and(eq(assets.orderId, id), eq(assets.kind, "restored"), isNull(assets.deletedAt)))
        .orderBy(assets.position, assets.createdAt),
      db.select().from(invoices).where(eq(invoices.orderId, id)).orderBy(desc(invoices.issuedAt)).limit(1),
      db.select().from(payments).where(eq(payments.orderId, id)).orderBy(desc(payments.createdAt)),
      db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(60),
      order.userId
        ? db.select().from(users).where(eq(users.id, order.userId)).limit(1)
        : Promise.resolve([]),
    ]);

  // Calculé ici, pas dans le composant : « maintenant » est une donnée, pas
  // une valeur de rendu.
  const estimated = order.estimatedReadyAt;
  const isLate = Boolean(
    estimated &&
      estimated < new Date() &&
      !["completed", "cancelled", "refunded"].includes(order.status),
  );

  return {
    order,
    lateDays: isLate && estimated ? Math.floor((Date.now() - estimated.getTime()) / 86_400_000) : 0,
    isLate,
    items,
    events,
    notes,
    originals,
    restored,
    invoice: invoiceRows[0] ?? null,
    payments: paymentRows,
    audit,
    client: client[0] ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Clients                                                                     */
/* -------------------------------------------------------------------------- */

export async function listClients(search?: string, limit = 50) {
  const clauses = [isNull(users.deletedAt)];
  if (search?.trim()) {
    const like = `%${search.trim()}%`;
    clauses.push(or(ilike(users.email, like), ilike(users.name, like), ilike(users.phone, like))!);
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      phone: users.phone,
      role: users.role,
      preferredLocale: users.preferredLocale,
      notifyEmail: users.notifyEmail,
      emailVerified: users.emailVerified,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      ordersCount: sql<number>`(
        select count(*)::int from ${orders}
        where ${orders.userId} = ${users.id} and ${orders.deletedAt} is null
          and ${orders.status} <> 'draft'
      )`,
      spentMillimes: sql<number>`(
        select coalesce(sum(${orders.totalMillimes}), 0)::int from ${orders}
        where ${orders.userId} = ${users.id} and ${orders.deletedAt} is null
          and ${orders.status} not in ('draft', 'cancelled', 'refunded')
      )`,
    })
    .from(users)
    .where(and(...clauses))
    .orderBy(desc(users.createdAt))
    .limit(limit);

  return rows;
}

export async function clientDetail(id: string) {
  const [client] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!client) return null;

  const history = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, id), isNull(orders.deletedAt), sql`${orders.status} <> 'draft'`))
    .orderBy(desc(orders.createdAt));

  // Les commandes passées en invité avec la même adresse, non rattachées :
  // c'est le signal qui manque le plus souvent quand un client appelle.
  const guestOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        isNull(orders.userId),
        isNull(orders.deletedAt),
        sql`${orders.status} <> 'draft'`,
        or(
          sql`lower(${orders.guestEmail}) = lower(${client.email})`,
          sql`lower(${orders.customerSnapshot}->>'email') = lower(${client.email})`,
        ),
      ),
    )
    .orderBy(desc(orders.createdAt));

  return { client, history, guestOrders };
}

/* -------------------------------------------------------------------------- */
/* Journal                                                                     */
/* -------------------------------------------------------------------------- */

export async function listAudit(filters: { action?: string; entityType?: string; page?: number } = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = 60;

  const clauses: (SQL | undefined)[] = [];
  if (filters.action) clauses.push(eq(auditLogs.action, filters.action));
  if (filters.entityType) clauses.push(eq(auditLogs.entityType, filters.entityType));

  const where = clauses.length ? and(...clauses) : undefined;

  const rows = await db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(perPage)
    .offset((page - 1) * perPage);

  const [total] = await db.select({ count: count() }).from(auditLogs).where(where);

  return { rows, total: Number(total?.count ?? 0), page, perPage };
}
