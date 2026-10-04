"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { assets, invoices, orderNotes, type OrderStatusCode } from "@/server/db/schema";
import { createSession, destroySession } from "@/lib/auth/session";
import { currentAdmin } from "@/lib/auth/admin";
import { logAudit } from "@/server/services/audit";
import { ALLOWED_TRANSITIONS, changeStatus, getOrderById } from "@/server/services/orders";
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
