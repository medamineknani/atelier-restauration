"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { assets, orderItems, productExtras } from "@/server/db/schema";
import type { Locale } from "@/lib/i18n";
import { localePath } from "@/lib/i18n";
import { writeDraftCookie, readDraftOrderId, clearDraftCookie } from "@/lib/draft";
import {
  changeStatus,
  createDraft,
  getOrderById,
  issueGuestToken,
  recalculate,
  refreshPhotosCount,
  saveCustomer,
  setExtras as applyExtras,
  setPack as applyPack,
  submitOrder,
} from "@/server/services/orders";
import { getProductBySlug, getSetting } from "@/server/services/catalog";
import { defaultPaymentDriver, getPaymentDriver } from "@/lib/payments";
import { softDeleteAsset } from "@/server/services/assets";
import { logAudit } from "@/server/services/audit";

/* -------------------------------------------------------------------------- */
/* Garde d'accès : toute mutation vérifie l'appartenance du brouillon          */
/* -------------------------------------------------------------------------- */

async function requireDraft(): Promise<string> {
  const orderId = await readDraftOrderId();
  if (!orderId) throw new Error("NO_DRAFT");
  const order = await getOrderById(orderId);
  if (!order || order.status !== "draft") throw new Error("NO_DRAFT");
  return orderId;
}

const localeSchema = z.enum(["fr", "en", "ar"]);

/* -------------------------------------------------------------------------- */
/* Étape 1 — Service                                                           */
/* -------------------------------------------------------------------------- */

export async function startOrder(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale") ?? "fr");
  const kind = z.enum(["digital", "photobook"]).parse(formData.get("kind") ?? "digital");
  const packSlug = z.string().optional().parse(formData.get("pack") ?? undefined) || null;

  const order = await createDraft({ kind, locale });

  if (packSlug) {
    const product = await getProductBySlug(packSlug, locale);
    if (product) await applyPack(order.id, product.id, locale);
  }

  await writeDraftCookie(order.id);
  redirect(localePath(locale, packSlug ? "/commande/extras" : "/commande/pack"));
}

/* -------------------------------------------------------------------------- */
/* Étape 2 — Pack                                                             */
/* -------------------------------------------------------------------------- */

export async function choosePack(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale") ?? "fr");
  const packSlug = z.string().min(1).parse(formData.get("pack"));
  const orderId = await requireDraft();

  const product = await getProductBySlug(packSlug, locale);
  if (!product || product.kind !== "pack") throw new Error("PACK_NOT_FOUND");

  await applyPack(orderId, product.id, locale);
  revalidatePath(localePath(locale, "/commande/extras"));
  redirect(localePath(locale, "/commande/extras"));
}

/* -------------------------------------------------------------------------- */
/* Étape 3 — Extras                                                           */
/* -------------------------------------------------------------------------- */

export async function saveExtras(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale") ?? "fr");
  const orderId = await requireDraft();

  // Le navigateur propose des quantités ; le serveur décide. On borne chaque
  // valeur et on refuse tout produit qui n'est pas une option du pack retenu.
  const allowed = new Set(
    (await db
      .select({ productId: orderItems.productId })
      .from(orderItems)
      .where(and(eq(orderItems.orderId, orderId), eq(orderItems.itemType, "pack")))
      .limit(1)
      .then(async (rows) => {
        const packId = rows[0]?.productId;
        if (!packId) return [];
        const options = await db
          .select({ extraId: productExtras.extraId })
          .from(productExtras)
          .where(eq(productExtras.packId, packId));
        return options.map((option) => option.extraId);
      })) ?? [],
  );

  const extras: { productId: string; quantity: number }[] = [];

  const payload = formData.get("extrasPayload");
  if (typeof payload === "string" && payload.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      parsed = null;
    }
    if (parsed && typeof parsed === "object") {
      for (const [productId, value] of Object.entries(parsed as Record<string, unknown>)) {
        const quantity = Number(value);
        if (!Number.isFinite(quantity) || quantity <= 0) continue;
        if (allowed.size > 0 && !allowed.has(productId)) continue;
        extras.push({ productId, quantity: Math.min(Math.trunc(quantity), 999) });
      }
    }
  }

  // Compatibilité avec des champs `extra:<id>` (formulaires sans JavaScript).
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("extra:")) continue;
    const productId = key.slice("extra:".length);
    if (extras.some((extra) => extra.productId === productId)) continue;
    if (allowed.size > 0 && !allowed.has(productId)) continue;
    const quantity = Number(value);
    if (Number.isFinite(quantity) && quantity > 0) {
      extras.push({ productId, quantity: Math.min(Math.trunc(quantity), 999) });
    }
  }

  await applyExtras(orderId, extras, locale);
  redirect(localePath(locale, "/commande/photos"));
}

export async function skipExtras(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale") ?? "fr");
  await requireDraft();
  redirect(localePath(locale, "/commande/photos"));
}

/* -------------------------------------------------------------------------- */
/* Étape 4 — Photos                                                           */
/* -------------------------------------------------------------------------- */

export async function removeUploadedPhoto(formData: FormData) {
  const assetId = z.string().min(1).parse(formData.get("assetId"));
  const orderId = await requireDraft();

  // On vérifie que le fichier appartient bien au brouillon courant :
  // sans cela, un client pourrait supprimer la photo d'une autre commande.
  const rows = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.orderId, orderId)))
    .limit(1);
  if (!rows[0]) throw new Error("ASSET_NOT_FOUND");

  await softDeleteAsset(assetId);
  await refreshPhotosCount(orderId);
  revalidatePath("/commande/photos");
}

export async function goToDetails(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale") ?? "fr");
  await requireDraft();
  redirect(localePath(locale, "/commande/coordonnees"));
}

/* -------------------------------------------------------------------------- */
/* Étape 5 — Coordonnées                                                      */
/* -------------------------------------------------------------------------- */

const customerSchema = z.object({
  firstName: z.string().trim().min(1, "firstName").max(80),
  lastName: z.string().trim().min(1, "lastName").max(80),
  email: z.string().trim().email("email"),
  phone: z.string().trim().min(8, "phone").max(30),
  line1: z.string().trim().max(160).optional().or(z.literal("")),
  line2: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  governorate: z.string().trim().max(80).optional().or(z.literal("")),
  postalCode: z.string().trim().max(12).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  newsletter: z.string().optional(),
});

export type DetailsState = { ok: boolean; error?: string };

export async function saveDetails(
  _previous: DetailsState,
  formData: FormData,
): Promise<DetailsState> {
  let locale: Locale = "fr";
  try {
    locale = localeSchema.parse(formData.get("locale") ?? "fr");
    const orderId = await requireDraft();

    const parsed = customerSchema.safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      line1: formData.get("line1") ?? "",
      line2: formData.get("line2") ?? "",
      city: formData.get("city") ?? "",
      governorate: formData.get("governorate") ?? "",
      postalCode: formData.get("postalCode") ?? "",
      notes: formData.get("notes") ?? "",
      newsletter: formData.get("newsletter") ?? undefined,
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };
    }

    const data = parsed.data;
    await saveCustomer(orderId, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      line1: data.line1 || undefined,
      line2: data.line2 || undefined,
      city: data.city || undefined,
      governorate: data.governorate || undefined,
      postalCode: data.postalCode || undefined,
      country: "TN",
      notes: data.notes || undefined,
      newsletter: data.newsletter === "on",
    });
  } catch {
    return { ok: false, error: "invalid" };
  }

  redirect(localePath(locale, "/commande/recapitulatif"));
}

/* -------------------------------------------------------------------------- */
/* Étape 6 — Soumission                                                       */
/* -------------------------------------------------------------------------- */

export async function confirmOrder(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale") ?? "fr");
  const requested = z.string().min(1).default("manual").parse(formData.get("provider") ?? "manual");
  const orderId = await requireDraft();

  // Le moyen de règlement est validé côté serveur : un formulaire falsifié ne
  // peut pas activer un prestataire qui n'est pas autorisé.
  const driver = getPaymentDriver(requested) ?? defaultPaymentDriver();
  const provider = driver.id;

  let order = await getOrderById(orderId);
  if (!order) throw new Error("NOT_FOUND");
  if (order.photosCount === 0 && (await getSetting("require_photos_before_submit", false))) {
    redirect(localePath(locale, "/commande/photos"));
  }

  await submitOrder(orderId, provider);
  const token = await issueGuestToken(orderId);

  // Confirmation par email.
  //
  // L'email est mis en file, puis la file est vidée **après** l'envoi de la
  // réponse (`after`) : si le service d'envoi est lent ou indisponible, le
  // client voit sa confirmation immédiatement et le message partira au
  // prochain passage du planificateur.
  try {
    const { queueOrderConfirmation, processEmailQueue } = await import(
      "@/server/services/notifications"
    );
    await queueOrderConfirmation(orderId, token);
    after(async () => {
      try {
        await processEmailQueue(5);
      } catch (error) {
        console.error("[checkout] traitement de la file d'emails", error);
      }
    });
  } catch (error) {
    console.error("[checkout] mise en file de l'email de confirmation", error);
  }

  // Rafraîchi après soumission : la référence et le total sont définitifs.
  order = (await getOrderById(orderId)) ?? order;

  const confirmationUrl = `${localePath(locale, `/commande/confirmation/${order.reference}`)}?t=${token}`;

  const started = await driver.start({
    order,
    locale,
    returnUrl: confirmationUrl,
  });

  await logAudit({
    action: "order.submitted",
    entityType: "order",
    entityId: orderId,
    metadata: { reference: order.reference, provider, total: order.totalMillimes },
  });

  // Le brouillon devient une commande : on libère le cookie.
  await clearDraftCookie();

  // Encaissement en ligne : le client part sur la page du prestataire, la
  // confirmation s'affichera à son retour.
  if (started.kind === "redirect") redirect(started.url);

  redirect(confirmationUrl);
}

/* -------------------------------------------------------------------------- */
/* Annulation                                                                  */
/* -------------------------------------------------------------------------- */

export async function abandonDraft(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale") ?? "fr");
  const orderId = await readDraftOrderId();
  if (orderId) {
    await changeStatus(orderId, "cancelled", { actorId: null, notify: false });
    await logAudit({ action: "order.abandoned", entityType: "order", entityId: orderId });
  }
  await clearDraftCookie();
  redirect(localePath(locale, "/"));
}

/** Reprend un brouillon existant depuis n'importe quelle page. */
export async function resumeDraft(locale: Locale) {
  const orderId = await readDraftOrderId();
  if (!orderId) redirect(localePath(locale, "/commande/service"));
  const order = await getOrderById(orderId);
  if (!order || order.status !== "draft") redirect(localePath(locale, "/commande/service"));
  redirect(localePath(locale, "/commande/photos"));
}

export async function recalcDraft() {
  const orderId = await requireDraft();
  const order = await getOrderById(orderId);
  if (order) await recalculate(orderId, order.locale);
}

export async function getDraftPhotos() {
  const orderId = await requireDraft();
  const rows = await db
    .select()
    .from(assets)
    .where(and(eq(assets.orderId, orderId), eq(assets.kind, "original")))
    .orderBy(assets.position);
  return rows.filter((row) => !row.deletedAt);
}
