"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";

import { env } from "@/config/env";
import { getCurrentUser, requireAdmin } from "@/lib/auth/session";
import { logAudit } from "@/server/services/audit";
import { db } from "@/server/db";
import { sessions, users } from "@/server/db/schema";
import { setPassword } from "@/server/services/accounts";
import { getMailer } from "@/lib/mailer";
import {
  saveSettings,
  getCommercialSettings,
  getStorageSettings,
} from "@/server/services/settings";

/* -------------------------------------------------------------------------- */
/* Utilitaires                                                                 */
/* -------------------------------------------------------------------------- */

/** Recharge tout ce qui dépend des réglages : site public et back-office. */
function revalidateSettings() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/parametres");
}

function back(section: string, state: "ok" | "error" = "ok") {
  redirect(`/admin/parametres?section=${section}&etat=${state}`);
}

/**
 * Garde des sections sensibles.
 *
 * Un administrateur qui tente d'atteindre ces actions n'a rien fait de mal :
 * il a peut-être simplement suivi un lien. On le ramène donc sur l'écran avec
 * un message plutôt que de lever une erreur — une 500 sur un refus de
 * permission est un défaut de conception, pas une sécurité.
 */
async function requireSuperadminOrBack(section: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "superadmin") {
    redirect(`/admin/parametres?section=${section}&etat=permissions`);
  }
  return user;
}

/** Millimes depuis un champ « dinars » saisi avec trois décimales. */
function millimes(value: FormDataEntryValue | null, fallback: number) {
  const raw = String(value ?? "").replace(",", ".").trim();
  if (raw === "") return fallback;
  const dinars = Number(raw);
  return Number.isFinite(dinars) ? Math.round(dinars * 1000) : fallback;
}

function intField(value: FormDataEntryValue | null, fallback: number) {
  const raw = String(value ?? "").trim();
  if (raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/* -------------------------------------------------------------------------- */
/* Marque                                                                      */
/* -------------------------------------------------------------------------- */

export async function saveBrandSettings(formData: FormData) {
  const admin = await requireAdmin();
  const phone = String(formData.get("phone") ?? "").trim();

  await saveSettings(
    {
      brand_name: String(formData.get("name") ?? "").trim(),
      brand_email: String(formData.get("email") ?? "").trim().toLowerCase(),
      brand_phone: phone,
      // Le lien `tel:` n'accepte que des chiffres et un « + » : on le dérive
      // du numéro affiché plutôt que de demander une seconde saisie.
      brand_phone_href: phone.replace(/[^+0-9]/g, ""),
      brand_whatsapp: String(formData.get("whatsapp") ?? "").trim(),
      brand_street: String(formData.get("street") ?? "").trim(),
      brand_postal_code: String(formData.get("postalCode") ?? "").trim(),
      brand_city: String(formData.get("city") ?? "").trim(),
      brand_region: String(formData.get("region") ?? "").trim(),
      brand_country: String(formData.get("country") ?? "").trim(),
      brand_opening_hours: String(formData.get("openingHours") ?? "").trim(),
      brand_instagram: String(formData.get("instagram") ?? "").trim(),
      brand_facebook: String(formData.get("facebook") ?? "").trim(),
    },
    admin.id,
  );

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "settings.brand_updated",
    entityType: "settings",
    entityId: "brand",
  });

  revalidateSettings();
  back("marque");
}

/* -------------------------------------------------------------------------- */
/* Commercial                                                                  */
/* -------------------------------------------------------------------------- */

export async function saveCommercialSettings(formData: FormData) {
  const admin = await requireAdmin();
  const current = await getCommercialSettings();

  const formats = String(formData.get("acceptedFormats") ?? "")
    .split(/[\s,]+/)
    .map((f) => f.trim())
    .filter(Boolean);

  await saveSettings(
    {
      shipping_flat_millimes: Math.max(0, millimes(formData.get("shippingFlat"), current.shippingFlatMillimes)),
      require_photos_before_submit: formData.get("requirePhotos") === "on",
      accepted_formats: formats.length ? formats : current.acceptedFormats,
    },
    admin.id,
  );

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "settings.commercial_updated",
    entityType: "settings",
    entityId: "commercial",
    metadata: { shippingFlatMillimes: millimes(formData.get("shippingFlat"), 0) },
  });

  revalidateSettings();
  back("commercial");
}

/* -------------------------------------------------------------------------- */
/* Paiement — réservé au superadministrateur                                   */
/* -------------------------------------------------------------------------- */

export async function savePaymentSettings(formData: FormData) {
  const admin = await requireSuperadminOrBack("paiement");

  await saveSettings(
    {
      payment_manual_holder: String(formData.get("manualHolder") ?? "").trim(),
      payment_manual_bank: String(formData.get("manualBank") ?? "").trim(),
      payment_manual_iban: String(formData.get("manualIban") ?? "").trim(),
      payment_provider_order: String(formData.get("providerOrder") ?? "")
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
    admin.id,
  );

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "settings.payment_updated",
    entityType: "settings",
    entityId: "payment",
    // On journalise l'intention, jamais les coordonnées bancaires.
    metadata: { fields: ["manualHolder", "manualBank", "manualIban", "providerOrder"] },
  });

  revalidateSettings();
  back("paiement");
}

/* -------------------------------------------------------------------------- */
/* Stockage — réservé au superadministrateur                                   */
/* -------------------------------------------------------------------------- */

export async function saveStorageSettings(formData: FormData) {
  const admin = await requireSuperadminOrBack("stockage");
  const current = await getStorageSettings();

  // Planchers raisonnables : descendre sous 5 Mo ou 1 fichier casserait le
  // tunnel de commande pour tout le monde.
  await saveSettings(
    {
      max_file_size_bytes: Math.max(
        5 * 1024 * 1024,
        intField(formData.get("maxFileSizeMb"), Math.round(current.maxFileSizeBytes / 1024 / 1024)) *
          1024 *
          1024,
      ),
      max_files_per_order: Math.max(1, intField(formData.get("maxFilesPerOrder"), current.maxFilesPerOrder)),
      retention_originals_days: Math.max(1, intField(formData.get("retentionOriginals"), current.retentionOriginalsDays)),
      retention_restored_days: Math.max(1, intField(formData.get("retentionRestored"), current.retentionRestoredDays)),
      retention_draft_days: Math.max(1, intField(formData.get("retentionDraft"), current.retentionDraftDays)),
    },
    admin.id,
  );

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "settings.storage_updated",
    entityType: "settings",
    entityId: "storage",
  });

  revalidateSettings();
  back("stockage");
}

/* -------------------------------------------------------------------------- */
/* Notifications : envoi de test                                               */
/* -------------------------------------------------------------------------- */

export async function sendTestEmail(formData: FormData) {
  const admin = await requireAdmin();
  const to = z.string().email().safeParse(String(formData.get("to") ?? "").trim());
  if (!to.success) redirect("/admin/parametres?section=notifications&etat=email-invalide");

  const mailer = getMailer();
  try {
    await mailer.send({
      to: to.data,
      subject: "Atelier Restauration · email de test",
      text: "Ceci est un email de test envoyé depuis le back-office.",
      html: `<div style="font-family:Georgia,serif;padding:32px;color:#100F0D">
        <p style="margin:0 0 16px">Ceci est un email de test envoyé depuis le back-office.</p>
        <p style="margin:0;color:#6B6357">Expéditeur : ${env.MAILER_FROM}</p>
      </div>`,
    });
  } catch {
    redirect("/admin/parametres?section=notifications&etat=echec");
  }

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "settings.test_email_sent",
    entityType: "settings",
    entityId: "notifications",
    metadata: { to: to.data },
  });

  redirect("/admin/parametres?section=notifications&etat=envoye");
}

/* -------------------------------------------------------------------------- */
/* Équipe — réservé au superadministrateur                                     */
/* -------------------------------------------------------------------------- */

const createMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1),
  role: z.enum(["admin", "superadmin"]),
  password: z.string().min(12),
});

/**
 * Crée un accès au back-office.
 *
 * Le rôle `client` n'est jamais proposé ici : un compte créé depuis cet écran
 * accède au back-office par définition.
 */
export async function createTeamMember(formData: FormData) {
  const admin = await requireSuperadminOrBack("equipe");

  const parsed = createMemberSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/admin/parametres?section=equipe&etat=invalide");

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, parsed.data.email), isNull(users.deletedAt)))
    .limit(1);

  if (existing.length > 0) redirect("/admin/parametres?section=equipe&etat=existant");

  let created: { id: string };
  try {
    const [row] = await db
      .insert(users)
      .values({
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        preferredLocale: "fr",
        emailVerified: true,
      })
      .returning({ id: users.id });

    if (!row) throw new Error("insertion sans retour");
    created = row;

    await setPassword(created.id, parsed.data.password);
  } catch (error) {
    console.error("[admin-settings] création de compte", error);
    redirect("/admin/parametres?section=equipe&etat=erreur");
  }

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "team.member_created",
    entityType: "user",
    entityId: created.id,
    metadata: { email: parsed.data.email, role: parsed.data.role },
  });

  revalidateSettings();
  redirect("/admin/parametres?section=equipe&etat=cree");
}

export async function changeTeamRole(formData: FormData) {
  const admin = await requireSuperadminOrBack("equipe");
  const id = String(formData.get("id") ?? "");
  const role = z.enum(["admin", "superadmin"]).safeParse(formData.get("role"));
  if (!id || !role.success) redirect("/admin/parametres?section=equipe&etat=invalide");

  // On ne se rétrograde jamais soi-même : c'est le piège classique qui laisse
  // une installation sans superadministrateur.
  if (id === admin.id) redirect("/admin/parametres?section=equipe&etat=soi-meme");

  await db
    .update(users)
    .set({ role: role.data, updatedAt: new Date() })
    .where(and(eq(users.id, id), isNull(users.deletedAt)));

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "team.role_changed",
    entityType: "user",
    entityId: id,
    metadata: { role: role.data },
  });

  revalidateSettings();
  redirect("/admin/parametres?section=equipe&etat=role");
}

/** Ferme toutes les sessions d'un compte : déconnexion immédiate partout. */
export async function revokeTeamSessions(formData: FormData) {
  const admin = await requireSuperadminOrBack("equipe");
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/parametres?section=equipe&etat=invalide");

  await db.delete(sessions).where(eq(sessions.userId, id));

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "team.sessions_revoked",
    entityType: "user",
    entityId: id,
  });

  revalidateSettings();
  redirect("/admin/parametres?section=equipe&etat=sessions");
}

/**
 * Désactive un accès.
 *
 * Suppression logique : les commandes, notes et entrées de journal qui
 * mentionnent ce compte restent lisibles et cohérentes.
 */
export async function disableTeamMember(formData: FormData) {
  const admin = await requireSuperadminOrBack("equipe");
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/parametres?section=equipe&etat=invalide");

  if (id === admin.id) redirect("/admin/parametres?section=equipe&etat=soi-meme");

  const remaining = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "superadmin"), isNull(users.deletedAt), ne(users.id, id)))
    .limit(1);

  if (remaining.length === 0) redirect("/admin/parametres?section=equipe&etat=dernier");

  await db
    .update(users)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, id));
  await db.delete(sessions).where(eq(sessions.userId, id));

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "team.member_disabled",
    entityType: "user",
    entityId: id,
  });

  revalidateSettings();
  redirect("/admin/parametres?section=equipe&etat=desactive");
}

/** Rétablit un accès désactivé (erreur de manipulation, retour de congé…). */
export async function enableTeamMember(formData: FormData) {
  const admin = await requireSuperadminOrBack("equipe");
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/parametres?section=equipe&etat=invalide");

  await db
    .update(users)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(users.id, id));

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "team.member_enabled",
    entityType: "user",
    entityId: id,
  });

  revalidateSettings();
  redirect("/admin/parametres?section=equipe&etat=active");
}
