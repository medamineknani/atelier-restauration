"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orders } from "@/server/db/schema";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import {
  consumeMagicLink,
  issueMagicLink,
  orderForUser,
  requestAccountDeletion,
  sendClientMessage,
  signInWithPassword,
  updatePreferences,
} from "@/server/services/accounts";
import { claimGuestOrders } from "@/server/services/accounts";
import { logAudit } from "@/server/services/audit";

const localeSchema = z.enum(["fr", "en", "ar"]);
const emailSchema = z.string().trim().toLowerCase().email();

/* -------------------------------------------------------------------------- */
/* Connexion                                                                   */
/* -------------------------------------------------------------------------- */

export type AuthState = {
  ok: boolean;
  error?: string;
  sent?: boolean;
  /** Lien de connexion renvoyé en développement (le mail ne part pas). */
  devLink?: string;
};

/** Lien de connexion par email — crée le compte s'il n'existe pas. */
export async function requestLoginLink(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  let locale: Locale = "fr";
  try {
    locale = localeSchema.parse(formData.get("locale") ?? "fr");
    const email = emailSchema.safeParse(formData.get("email"));
    if (!email.success) return { ok: false, error: "invalidEmail" };

    const result = await issueMagicLink(email.data, locale);

    await logAudit({
      action: "auth.magic_link_requested",
      entityType: "user",
      metadata: { email: result.email },
    });

    return {
      ok: true,
      sent: true,
      devLink: process.env.NODE_ENV === "production" ? undefined : result.link,
    };
  } catch (error) {
    console.error("[account] lien de connexion", error);
    return { ok: false, error: "generic" };
  }
}

/** Connexion par mot de passe (clients qui en ont défini un). */
export async function signInWithPasswordAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const locale = localeSchema.parse(formData.get("locale") ?? "fr");

  try {
    const email = emailSchema.safeParse(formData.get("email"));
    const password = z.string().min(1).safeParse(formData.get("password"));

    if (!email.success || !password.success) return { ok: false, error: "invalidCredentials" };

    const user = await signInWithPassword(email.data, password.data);
    if (!user) return { ok: false, error: "invalidCredentials" };

    await createSession(user.id, user.role === "admin" || user.role === "superadmin");
    await claimGuestOrders(user.id, user.email);

    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "auth.signed_in",
      entityType: "user",
      entityId: user.id,
    });
  } catch (error) {
    console.error("[account] connexion", error);
    return { ok: false, error: "generic" };
  }

  redirect(localePath(locale, "/compte"));
}

export async function signOutAction(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale") ?? "fr");
  const user = await getCurrentUser();
  if (user) {
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "auth.signed_out",
      entityType: "user",
      entityId: user.id,
    });
  }
  await destroySession();
  redirect(localePath(locale, "/"));
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                    */
/* -------------------------------------------------------------------------- */

export type MessageState = { ok: boolean; error?: string };

export async function sendOrderMessage(
  _previous: MessageState,
  formData: FormData,
): Promise<MessageState> {
  try {
    const locale = localeSchema.parse(formData.get("locale") ?? "fr");
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "unauthorized" };

    const reference = z.string().min(1).parse(formData.get("reference"));
    const body = z.string().trim().min(1).max(2000).safeParse(formData.get("body"));
    if (!body.success) return { ok: false, error: "empty" };

    const order = await orderForUser(reference, user.id);
    if (!order) return { ok: false, error: "notFound" };

    await sendClientMessage(order.id, user.id, body.data);
    revalidatePath(localePath(locale, `/compte/commandes/${reference}`));
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
  }
}

/* -------------------------------------------------------------------------- */
/* Préférences & suppression                                                   */
/* -------------------------------------------------------------------------- */

export async function savePreferences(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale") ?? "fr");
  const user = await getCurrentUser();
  if (!user) redirect(localePath(locale, "/connexion"));

  const values = {
    name: z.string().trim().max(80).optional().parse(formData.get("name") ?? undefined) || undefined,
    phone: z.string().trim().max(30).optional().parse(formData.get("phone") ?? undefined) || undefined,
    preferredLocale: localeSchema.optional().parse(formData.get("preferredLocale") ?? undefined),
    notifyEmail: formData.get("notifyEmail") === "on",
  };

  await updatePreferences(user.id, values);
  revalidatePath(localePath(locale, "/compte/parametres"));
}

export async function deleteAccountAction(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale") ?? "fr");
  const user = await getCurrentUser();
  if (!user) redirect(localePath(locale, "/connexion"));

  const confirmation = z.string().optional().parse(formData.get("confirmation") ?? undefined);
  const t = createTranslator(locale);
  if (confirmation !== t("account.deleteConfirmWord")) {
    redirect(`${localePath(locale, "/compte/parametres")}?erreur=confirmation`);
  }

  await requestAccountDeletion(user.id);
  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "account.deleted",
    entityType: "user",
    entityId: user.id,
  });

  await destroySession();
  redirect(localePath(locale, "/"));
}

/* -------------------------------------------------------------------------- */
/* Utilitaires serveur                                                         */
/* -------------------------------------------------------------------------- */

/** Consomme un lien de connexion — appelé par la page `/connexion/lien`. */
export async function verifyLoginToken(token: string) {
  const user = await consumeMagicLink(token);
  if (!user) return false;

  await createSession(user.id, false);

  // Une commande passée en invité avec la même adresse doit se retrouver
  // dans l'espace client dès la première connexion.
  const claimed = await claimGuestOrders(user.id, user.email);
  if (claimed > 0) {
    await db
      .update(orders)
      .set({ guestAccessTokenHash: null })
      .where(eq(orders.userId, user.id));
  }

  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "auth.magic_link_used",
    entityType: "user",
    entityId: user.id,
    metadata: { claimed },
  });

  return true;
}
