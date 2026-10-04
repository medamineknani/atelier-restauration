"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  assets,
  invoices,
  orderNotes,
  priceHistory,
  productTranslations,
  products,
  type OrderStatusCode,
} from "@/server/db/schema";
import { createSession, destroySession } from "@/lib/auth/session";
import { currentAdmin } from "@/lib/auth/admin";
import { logAudit } from "@/server/services/audit";
import {
  ALLOWED_TRANSITIONS,
  changeStatus,
  getOrderById,
  markCodCollected as markCodPayment,
  markCodRefused as markCodFailure,
} from "@/server/services/orders";
import { signInWithPassword } from "@/server/services/accounts";
import { issueGuestToken } from "@/server/services/orders";
import { ensureInvoice } from "@/server/services/accounts";

/* -------------------------------------------------------------------------- */
/* Connexion                                                                   */
/* -------------------------------------------------------------------------- */

export type AdminAuthState = { ok: boolean; error?: string };

/**
 * Connexion au back-office.
 *
 * Volontairement séparée de la connexion client : un mot de passe fort est
 * exigé ici, et un compte client — même valide — n'ouvre jamais `/admin`.
 */
export async function adminSignIn(
  _previous: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  const password = z.string().min(1).safeParse(formData.get("password"));
  const next = z.string().optional().parse(formData.get("next") ?? undefined) || "/admin";

  if (!email.success || !password.success) return { ok: false, error: "invalid" };

  const user = await signInWithPassword(email.data, password.data);
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    await logAudit({
      actorEmail: email.data,
      action: "admin.sign_in_failed",
      metadata: { reason: user ? "not_admin" : "bad_credentials" },
    });
    return { ok: false, error: "invalid" };
  }

  await createSession(user.id, true);
  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: "admin.signed_in",
    entityType: "user",
    entityId: user.id,
  });

  redirect(next);
}

export async function adminSignOut() {
  const admin = await currentAdmin();
  if (admin) {
    await logAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: "admin.signed_out",
      entityType: "user",
      entityId: admin.id,
    });
  }
  await destroySession();
  redirect("/admin/connexion");
}

/* -------------------------------------------------------------------------- */
/* Commandes                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Change le statut d'une commande.
 *
 * Une seule action pour trois effets : statut changé, message éventuel
 * déposé dans le fil, email envoyé. C'est l'opération la plus fréquente du
 * back-office ; elle ne doit jamais demander deux écrans.
 */
/** Statuts depuis lesquels la publication est possible. */
const PUBLISHABLE: OrderStatusCode[] = ["received", "processing", "restoring", "checking"];

export async function changeOrderStatus(formData: FormData) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/connexion");

  const orderId = z.string().uuid().parse(formData.get("orderId"));
  const to = z.string().parse(formData.get("status")) as OrderStatusCode;
  const message = z.string().trim().max(2000).optional().parse(formData.get("message") ?? undefined);
  const notify = formData.get("notify") === "on";
  const carrier = z.string().trim().max(60).optional().parse(formData.get("carrier") ?? undefined);
  const tracking = z.string().trim().max(80).optional().parse(formData.get("tracking") ?? undefined);

  const order = await getOrderById(orderId);
  if (!order) redirect("/admin/commandes?erreur=introuvable");

  if (!ALLOWED_TRANSITIONS[order.status].includes(to)) {
    redirect(`/admin/commandes/${orderId}?erreur=transition`);
  }

  try {
    await changeStatus(orderId, to, {
      actorId: admin.id,
      message: message?.trim() ? message.trim() : null,
      notify,
      tracking:
        carrier || tracking
          ? { carrier: carrier || undefined, trackingNumber: tracking || undefined }
          : null,
    });
  } catch (error) {
    console.error("[admin] changement de statut", error);
    redirect(`/admin/commandes/${orderId}?erreur=transition`);
  }

  // La facture naît au paiement, pas avant : c'est le seul moment où le
  // montant est dû de façon certaine.
  if (to === "received") {
    await ensureInvoice(await getOrderById(orderId).then((o) => o!));
  }

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: "order.status_changed",
    entityType: "order",
    entityId: orderId,
    metadata: { from: order.status, to, notified: notify },
  });

  revalidatePath(`/admin/commandes/${orderId}`);
  revalidatePath("/admin");
  redirect(`/admin/commandes/${orderId}?ok=statut`);
}

/** Note interne ou message client — le fil est unique, l'audience change. */
export async function addOrderNote(formData: FormData) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/connexion");

  const orderId = z.string().uuid().parse(formData.get("orderId"));
  const body = z.string().trim().min(1).max(4000).safeParse(formData.get("body"));
  const audience = z.enum(["internal", "client"]).parse(formData.get("audience") ?? "internal");

  if (body.success) {
    await db.insert(orderNotes).values({
      orderId,
      authorId: admin.id,
      authorName: admin.name || admin.email,
      body: body.data,
      isInternal: audience === "internal",
    });

    await logAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: audience === "internal" ? "order.note_added" : "order.message_sent",
      entityType: "order",
      entityId: orderId,
    });
  }

  revalidatePath(`/admin/commandes/${orderId}`);
  redirect(`/admin/commandes/${orderId}?ok=note`);
}

/**
 * Publie les résultats.
 *
 * Irréversible au sens métier : le client reçoit un email et peut
 * télécharger. On exige donc au moins un fichier restauré et une
 * confirmation explicite côté interface.
 */
export async function publishResults(formData: FormData) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/connexion");

  const orderId = z.string().uuid().parse(formData.get("orderId"));
  const order = await getOrderById(orderId);
  if (!order) redirect("/admin/commandes");

  const restored = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.orderId, orderId), eq(assets.kind, "restored")));

  if (restored.length === 0) {
    redirect(`/admin/commandes/${orderId}?erreur=aucun-resultat`);
  }

  // On ne publie que depuis la file de production : une commande annulée,
  // remboursée ou déjà terminée ne remet pas de résultats en circulation.
  if (!PUBLISHABLE.includes(order.status)) {
    redirect(`/admin/commandes/${orderId}?erreur=transition`);
  }

  // Les jalons intermédiaires sont franchis, mais restent invisibles au
  // client : sa chronologie ne montre que l'étape qui compte pour lui —
  // « prête ». Le journal interne, lui, garde la trace complète.
  for (const step of ["processing", "restoring", "checking"] as const) {
    if (order.status === step) break;
    const current = await getOrderById(orderId);
    if (!current || !ALLOWED_TRANSITIONS[current.status].includes(step)) continue;
    await changeStatus(orderId, step, {
      actorId: admin.id,
      notify: false,
      visibleToClient: false,
    });
  }

  await db
    .update(assets)
    .set({ status: "ready", releasedAt: new Date() })
    .where(and(eq(assets.orderId, orderId), eq(assets.kind, "restored")));

  await changeStatus(orderId, "ready", { actorId: admin.id, message: null, notify: false });

  // Lien d'accès : le client connecté passe par son espace, l'invité par un
  // jeton à usage unique régénéré pour l'occasion.
  const guestToken = order.guestEmail ? await issueGuestToken(orderId, "résultats prêts") : "";

  const { sendResultsReady } = await import("@/server/services/notifications");
  await sendResultsReady(
    await getOrderById(orderId).then((o) => o!),
    order.locale,
    `/commande/suivi/${order.reference}${guestToken ? `?t=${guestToken}` : ""}`,
  );

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: "order.results_published",
    entityType: "order",
    entityId: orderId,
    metadata: { files: restored.length },
  });

  revalidatePath(`/admin/commandes/${orderId}`);
  revalidatePath("/admin");
  redirect(`/admin/commandes/${orderId}?ok=publie`);
}

/** Dépublication : possible tant que la commande n'est pas terminée. */
export async function unpublishResults(formData: FormData) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/connexion");

  const orderId = z.string().uuid().parse(formData.get("orderId"));
  const order = await getOrderById(orderId);
  if (!order || !["ready", "shipped"].includes(order.status)) {
    redirect(`/admin/commandes/${orderId}?erreur=transition`);
  }

  await db
    .update(assets)
    .set({ status: "ready", releasedAt: null })
    .where(and(eq(assets.orderId, orderId), eq(assets.kind, "restored")));

  await changeStatus(orderId, "checking", { actorId: admin.id, notify: false });

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: "order.results_unpublished",
    entityType: "order",
    entityId: orderId,
  });

  revalidatePath(`/admin/commandes/${orderId}`);
  redirect(`/admin/commandes/${orderId}?ok=depublie`);
}

/**
 * Suppression définitive d'un fichier.
 *
 * Réservée au superadmin : un original effacé est un souvenir perdu, la
 * confirmation ne peut pas être une formalité. Le fichier est marqué
 * supprimé, jamais purgé ici — la purge appartient au job de rétention.
 */
export async function deleteAsset(formData: FormData) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/connexion");

  const assetId = z.string().uuid().parse(formData.get("assetId"));
  const confirmation = z.string().optional().parse(formData.get("confirmation") ?? undefined);

  const rows = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  const asset = rows[0];
  if (!asset?.orderId) redirect("/admin/commandes");

  const { softDeleteAsset } = await import("@/server/services/assets");
  await softDeleteAsset(assetId);

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: "asset.deleted",
    entityType: "asset",
    entityId: assetId,
    metadata: { filename: asset.originalFilename, kind: asset.kind, confirmation },
  });

  revalidatePath(`/admin/commandes/${asset.orderId}`);
  redirect(`/admin/commandes/${asset.orderId}?ok=fichier`);
}

/**
 * Régénère la facture.
 *
 * Le numéro, une fois attribué, ne change plus : on ne recrée que le
 * document manquant, jamais une numérotation déjà communiquée au client.
 */
export async function regenerateInvoice(formData: FormData) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/connexion");

  const orderId = z.string().uuid().parse(formData.get("orderId"));
  const order = await getOrderById(orderId);
  if (!order) redirect("/admin/commandes");

  const existing = await db.select().from(invoices).where(eq(invoices.orderId, orderId)).limit(1);
  if (existing.length === 0) await ensureInvoice(order);

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: "invoice.regenerated",
    entityType: "order",
    entityId: orderId,
  });

  revalidatePath(`/admin/commandes/${orderId}`);
  redirect(`/admin/commandes/${orderId}?ok=facture`);
}

/* -------------------------------------------------------------------------- */
/* Contre-remboursement                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Constate l'encaissement à la livraison.
 *
 * L'opérateur qui réceptionne le bordereau du transporteur a besoin d'un seul
 * geste, et d'une trace : c'est ce qui déclenche la date de paiement, donc la
 * facture et les indicateurs de l'atelier.
 */
export async function markCodCollected(formData: FormData) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/connexion");

  const orderId = z.string().uuid().parse(formData.get("orderId"));
  const order = await getOrderById(orderId);
  if (!order) redirect("/admin/commandes");

  await markCodPayment(orderId, { id: admin.id, email: admin.email });

  revalidatePath(`/admin/commandes/${orderId}`);
  redirect(`/admin/commandes/${orderId}?onglet=facture&ok=encaisse`);
}

/** Colis refusé, client absent : l'argent n'est pas rentré. */
export async function markCodRefused(formData: FormData) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/connexion");

  const orderId = z.string().uuid().parse(formData.get("orderId"));
  const order = await getOrderById(orderId);
  if (!order) redirect("/admin/commandes");

  await markCodFailure(orderId, { id: admin.id, email: admin.email });

  revalidatePath(`/admin/commandes/${orderId}`);
  redirect(`/admin/commandes/${orderId}?onglet=facture&ok=impaye`);
}

/* -------------------------------------------------------------------------- */
/* Catalogue (superadmin)                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Enregistre un produit.
 *
 * Réservé au superadmin : un prix n'est pas un texte, c'est un engagement
 * envers le client. La variation de plus de 20 % est journalisée avec la
 * raison — c'est un garde-fou contre la faute de frappe, pas une contrainte.
 */
export async function saveProduct(formData: FormData) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/connexion");
  if (admin.role !== "superadmin") redirect("/admin/catalogue?erreur=permissions");

  const id = z.string().uuid().optional().parse(formData.get("id") ?? undefined) || null;
  const price = Math.round(Number(formData.get("priceDinars") ?? 0) * 1000);
  if (!Number.isFinite(price) || price < 0) redirect("/admin/catalogue?erreur=prix");

  const values = {
    slug: z.string().trim().min(1).parse(formData.get("slug")),
    kind: z.enum(["pack", "extra"]).parse(formData.get("kind")),
    family: z.enum(["digital", "photobook"]).parse(formData.get("family")),
    priceMillimes: price,
    photosIncluded: optionalInt(formData.get("photosIncluded")),
    photosMin: optionalInt(formData.get("photosMin")),
    photosMax: optionalInt(formData.get("photosMax")),
    turnaroundDaysMin: optionalInt(formData.get("turnaroundDaysMin")) ?? 5,
    turnaroundDaysMax: optionalInt(formData.get("turnaroundDaysMax")) ?? 7,
    pricingMode: z
      .enum(["flat", "per_photo", "per_page", "per_copy"])
      .parse(formData.get("pricingMode") ?? "flat"),
    maxQuantity: optionalInt(formData.get("maxQuantity")),
    requiresShipping: formData.get("requiresShipping") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    isActive: formData.get("isActive") === "on",
    sortOrder: optionalInt(formData.get("sortOrder")) ?? 0,
    updatedAt: new Date(),
  };

  let productId = id;
  let previousPrice: number | null = null;

  if (id) {
    const [current] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!current) redirect("/admin/catalogue?erreur=introuvable");
    previousPrice = current.priceMillimes;
    await db.update(products).set(values).where(eq(products.id, id));
  } else {
    const [created] = await db.insert(products).values(values).returning();
    productId = created!.id;
  }

  // Traductions : une ligne par langue, réécrite intégralement.
  for (const locale of ["fr", "en"] as const) {
    const name = String(formData.get(`name.${locale}`) ?? "").trim();
    if (!name) continue;

    const entry = {
      name,
      tagline: String(formData.get(`tagline.${locale}`) ?? "").trim() || null,
      description: String(formData.get(`description.${locale}`) ?? "").trim() || null,
      features: String(formData.get(`features.${locale}`) ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };

    await db
      .insert(productTranslations)
      .values({ productId: productId!, locale, ...entry })
      .onConflictDoUpdate({
        target: [productTranslations.productId, productTranslations.locale],
        set: entry,
      });
  }

  if (previousPrice !== null && previousPrice !== price) {
    await db.insert(priceHistory).values({
      productId: productId!,
      oldPriceMillimes: previousPrice,
      newPriceMillimes: price,
      changedBy: admin.id,
      reason: String(formData.get("reason") ?? "").trim() || null,
    });
  }

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: id ? "product.updated" : "product.created",
    entityType: "product",
    entityId: productId!,
    metadata: { priceMillimes: price, previousMillimes: previousPrice },
  });

  // Un prix change partout à la fois : pages de tarifs, tunnel, récapitulatif.
  // Le site est réécrit sous un préfixe de locale (`/tarifs` → `/fr/tarifs`) :
  // il faut donc invalider chaque variante, sinon le visiteur suivant lit
  // l'ancien prix — celui qu'on vient de corriger.
  revalidateCatalogPaths();
  redirect(`/admin/catalogue/${productId}?ok=1`);
}

/** Retirer un produit du catalogue sans l'effacer : les anciennes commandes gardent leur nom. */
export async function toggleProductActive(formData: FormData) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/connexion");
  if (admin.role !== "superadmin") redirect("/admin/catalogue?erreur=permissions");

  const id = z.string().uuid().parse(formData.get("id"));
  const [current] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!current) redirect("/admin/catalogue");

  await db
    .update(products)
    .set({ isActive: !current.isActive, updatedAt: new Date() })
    .where(eq(products.id, id));

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: current.isActive ? "product.deactivated" : "product.activated",
    entityType: "product",
    entityId: id,
  });

  revalidateCatalogPaths();
  redirect("/admin/catalogue");
}

/** Invalide les pages qui affichent des prix, dans chaque langue. */
function revalidateCatalogPaths() {
  revalidatePath("/", "layout");
  for (const locale of ["fr", "en", "ar"] as const) {
    revalidatePath(`/${locale}`, "layout");
  }
}

function optionalInt(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}
