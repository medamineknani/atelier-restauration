import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  jobs,
  orderItems,
  orders,
  type Order,
  type OrderStatusCode,
} from "@/server/db/schema";
import { site } from "@/config/site";
import { emailLayout, getMailer, htmlToText, type MailMessage } from "@/lib/mailer";
import { localePath, type Locale } from "@/lib/i18n";
import { formatDate, priceLabel } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* File d'attente (table `jobs`, traitée par /api/jobs/run)                    */
/* -------------------------------------------------------------------------- */

export async function enqueue(type: string, payload: Record<string, unknown>) {
  await db.insert(jobs).values({ type, payload });
}

/* -------------------------------------------------------------------------- */
/* Textes                                                                      */
/* -------------------------------------------------------------------------- */

const STATUS_LABEL: Record<OrderStatusCode, { fr: string; en: string }> = {
  draft: { fr: "Brouillon", en: "Draft" },
  awaiting_payment: { fr: "En attente de paiement", en: "Awaiting payment" },
  received: { fr: "Commande reçue", en: "Order received" },
  processing: { fr: "Photos en traitement", en: "Being processed" },
  restoring: { fr: "Restauration en cours", en: "Restoration in progress" },
  checking: { fr: "Vérification", en: "Quality check" },
  ready: { fr: "Prêt", en: "Ready" },
  shipped: { fr: "Expédié", en: "Shipped" },
  completed: { fr: "Terminé", en: "Completed" },
  on_hold: { fr: "En attente de votre réponse", en: "Waiting for your reply" },
  cancelled: { fr: "Annulé", en: "Cancelled" },
  refunded: { fr: "Remboursé", en: "Refunded" },
};

const NEXT_STEP: Record<string, { fr: string; en: string }> = {
  awaiting_payment: {
    fr: "Réglez votre commande en indiquant votre numéro de commande. Nous commençons dès réception du paiement.",
    en: "Please settle your order quoting your order number. We start as soon as payment arrives.",
  },
  received: {
    fr: "Vos photos sont arrivées. Nous les examinons une par une et vous écrivons sous 24 heures.",
    en: "Your photographs have arrived. We examine them one by one and write to you within 24 hours.",
  },
  processing: {
    fr: "Nous préparons vos fichiers avant d'attaquer la restauration.",
    en: "We are preparing your files before starting the restoration.",
  },
  restoring: {
    fr: "Le travail de restauration est en cours, photo par photo.",
    en: "The restoration work is under way, photograph by photograph.",
  },
  checking: {
    fr: "Nous revoyons chaque image avant de vous la livrer.",
    en: "We review every image before delivering it to you.",
  },
  ready: {
    fr: "Vos photographies restaurées sont disponibles au téléchargement.",
    en: "Your restored photographs are available to download.",
  },
  shipped: {
    fr: "Votre photobook est en route vers vous.",
    en: "Your photobook is on its way to you.",
  },
  completed: {
    fr: "Votre commande est terminée. Merci de votre confiance.",
    en: "Your order is completed. Thank you for your trust.",
  },
  on_hold: {
    fr: "Nous avons besoin d'une information de votre part pour continuer.",
    en: "We need information from you to continue.",
  },
};

function label(status: OrderStatusCode, locale: Locale) {
  return STATUS_LABEL[status]?.[locale === "en" ? "en" : "fr"] ?? status;
}

function nextStep(status: OrderStatusCode, locale: Locale) {
  const entry = NEXT_STEP[status];
  return entry ? entry[locale === "en" ? "en" : "fr"] : "";
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                    */
/* -------------------------------------------------------------------------- */

function wrap(locale: Locale, subject: string, body: string, to: string): MailMessage {
  const html = emailLayout({ title: subject, preheader: subject, body });
  return { to, subject, html, text: htmlToText(html) };
}

/**
 * Lien de suivi envoyé par email.
 *
 * Le jeton est **indispensable** : sans lui, un client sans compte tomberait
 * sur une page introuvable. Chaque email emporte donc son propre jeton.
 */
function trackingLink(order: Order, locale: Locale, token: string) {
  const path = localePath(locale, `/commande/suivi/${order.reference}`);
  return token ? `${site.url}${path}?t=${token}` : `${site.url}${path}`;
}

/** Nom réel du pack retenu, pas le type de commande. */
async function packName(order: Order, locale: Locale) {
  const rows = await db
    .select({ name: orderItems.nameSnapshot })
    .from(orderItems)
    .where(and(eq(orderItems.orderId, order.id), eq(orderItems.itemType, "pack")))
    .limit(1);
  if (rows[0]?.name) return rows[0].name;
  return order.kind === "photobook"
    ? locale === "en"
      ? "Photobook"
      : "Photobook"
    : locale === "en"
      ? "Digital restoration"
      : "Restauration numérique";
}

export async function sendOrderConfirmation(order: Order, locale: Locale, guestToken: string) {
  const isEn = locale === "en";
  const customer = order.customerSnapshot;
  const pack = await packName(order, locale);
  const instructions = await bankInstructions(order, locale);
  const subject = isEn
    ? `Your order ${order.reference} has been recorded`
    : `Votre commande ${order.reference} est enregistrée`;

  const paymentBlock =
    order.status === "awaiting_payment" && instructions.length > 0
      ? `<div style="margin:24px 0;padding:20px;background:#EDE7DB;border:1px solid #DED7C9;">
          <p style="margin:0 0 8px;font-weight:600;">${isEn ? "Payment" : "Paiement"}</p>
          <p style="margin:0;font-size:14px;line-height:1.7;">
            ${instructions
              .map(
                (row) =>
                  `${row.label} : <strong>${row.value}</strong>`,
              )
              .join("<br>")}
            <br>
            ${isEn
              ? "Please quote your order number as the transfer reference."
              : "Indiquez votre numéro de commande en motif du virement."}
          </p>
        </div>`
      : "";

  const body = `
    <p>${isEn ? "Hello" : "Bonjour"} ${customer.firstName || (isEn ? "and thank you" : "et merci")},</p>
    <p>${
      isEn
        ? "Your order has been recorded. Here is what happens next."
        : "Votre commande est enregistrée. Voici ce qui va se passer maintenant."
    }</p>
    <table role="presentation" width="100%" style="margin:24px 0;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:6px 0;color:#6E6862;">${isEn ? "Order" : "Commande"}</td><td style="padding:6px 0;text-align:right;"><strong>${order.reference}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6E6862;">${isEn ? "Pack" : "Formule"}</td><td style="padding:6px 0;text-align:right;">${pack}</td></tr>
      <tr><td style="padding:6px 0;color:#6E6862;">${isEn ? "Total" : "Total"}</td><td style="padding:6px 0;text-align:right;"><strong>${priceLabel(order.totalMillimes, locale)}</strong></td></tr>
    </table>
    ${paymentBlock}
    <p>${nextStep(order.status, locale)}</p>
    <p style="margin:28px 0;">
      <a href="${trackingLink(order, locale, guestToken)}" style="display:inline-block;padding:14px 28px;background:#100F0D;color:#FDFCF9;text-decoration:none;font-size:14px;">
        ${isEn ? "Track my order" : "Suivre ma commande"}
      </a>
    </p>
    <p style="font-size:13px;color:#6E6862;">
      ${
        isEn
          ? "Your photographs stay private. They are never shared, never sold, and are deleted 90 days after delivery."
          : "Vos photos restent privées. Jamais partagées, jamais vendues, supprimées 90 jours après la livraison."
      }
    </p>`;

  await getMailer().send(wrap(locale, subject, body, customer.email));
  return guestToken;
}

export async function sendStatusUpdate(
  order: Order,
  to: OrderStatusCode,
  locale: Locale,
  message: string | null,
  guestToken = "",
) {
  const isEn = locale === "en";
  const subject = `${order.reference} · ${label(to, locale)}`;
  const body = `
    <p>${isEn ? "Hello" : "Bonjour"} ${order.customerSnapshot.firstName},</p>
    <p>
      ${
        isEn
          ? `The status of your order is now : <strong>${label(to, locale)}</strong>.`
          : `Le statut de votre commande est maintenant : <strong>${label(to, locale)}</strong>.`
      }
    </p>
    ${message ? `<blockquote style="margin:20px 0;padding:12px 16px;border-left:2px solid #B99B62;background:#EDE7DB;">${message}</blockquote>` : ""}
    <p>${nextStep(to, locale)}</p>
    <p style="margin:28px 0;">
      <a href="${trackingLink(order, locale, guestToken)}" style="display:inline-block;padding:14px 28px;background:#100F0D;color:#FDFCF9;text-decoration:none;font-size:14px;">
        ${isEn ? "See my order" : "Voir ma commande"}
      </a>
    </p>`;

  await getMailer().send(wrap(locale, subject, body, order.customerSnapshot.email));
}

export async function sendResultsReady(order: Order, locale: Locale, link: string) {
  const isEn = locale === "en";
  const subject = isEn ? `Your restored photographs are ready` : `Vos photographies restaurées sont prêtes`;
  const body = `
    <p>${isEn ? "Hello" : "Bonjour"} ${order.customerSnapshot.firstName},</p>
    <p>${
      isEn
        ? "The work is finished. Your restored photographs are waiting for you."
        : "Le travail est terminé. Vos photographies restaurées vous attendent."
    }</p>
    <p style="margin:28px 0;">
      <a href="${link}" style="display:inline-block;padding:14px 28px;background:#100F0D;color:#FDFCF9;text-decoration:none;font-size:14px;">
        ${isEn ? "Download my photographs" : "Télécharger mes photos"}
      </a>
    </p>
    <p style="font-size:13px;color:#6E6862;">${
      isEn
        ? "The link stays active for 12 months. Your originals are deleted 90 days from now."
        : "Le lien reste actif 12 mois. Vos originaux sont supprimés dans 90 jours."
    }</p>`;
  await getMailer().send(wrap(locale, subject, body, order.customerSnapshot.email));
}

export async function sendMagicLink(email: string, link: string, locale: Locale) {
  const isEn = locale === "en";
  const subject = isEn ? "Your sign-in link" : "Votre lien de connexion";
  const body = `
    <p>${isEn ? "Hello," : "Bonjour,"}</p>
    <p>${
      isEn
        ? "Here is the link to access your orders. It is valid for one hour."
        : "Voici le lien pour accéder à vos commandes. Il est valable une heure."
    }</p>
    <p style="margin:28px 0;">
      <a href="${link}" style="display:inline-block;padding:14px 28px;background:#100F0D;color:#FDFCF9;text-decoration:none;font-size:14px;">
        ${isEn ? "Open my account" : "Ouvrir mon espace"}
      </a>
    </p>
    <p style="font-size:13px;color:#6E6862;">${
      isEn
        ? "If you did not request this link, simply ignore this email."
        : "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email."
    }</p>`;
  await getMailer().send(wrap(locale, subject, body, email));
}

export async function notifyAdminNewOrder(order: Order) {
  const subject = `Nouvelle commande ${order.reference}`;
  const body = `
    <p>Une nouvelle commande vient d'être enregistrée.</p>
    <table role="presentation" width="100%" style="font-size:14px;">
      <tr><td style="padding:6px 0;color:#6E6862;">Référence</td><td><strong>${order.reference}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6E6862;">Client</td><td>${order.customerSnapshot.firstName} ${order.customerSnapshot.lastName}</td></tr>
      <tr><td style="padding:6px 0;color:#6E6862;">Email</td><td>${order.customerSnapshot.email}</td></tr>
      <tr><td style="padding:6px 0;color:#6E6862;">Téléphone</td><td>${order.customerSnapshot.phone ?? "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#6E6862;">Photos</td><td>${order.photosCount} / ${order.photosQuota}</td></tr>
      <tr><td style="padding:6px 0;color:#6E6862;">Montant</td><td><strong>${priceLabel(order.totalMillimes)}</strong></td></tr>
    </table>
    <p style="margin:24px 0;">
      <a href="${site.url}/admin/commandes/${order.id}" style="display:inline-block;padding:14px 28px;background:#100F0D;color:#FDFCF9;text-decoration:none;font-size:14px;">
        Ouvrir la commande
      </a>
    </p>`;
  await getMailer().send(wrap("fr", subject, body, site.email));
}

/* -------------------------------------------------------------------------- */
/* Mise en file                                                               */
/* -------------------------------------------------------------------------- */

export async function queueOrderStatusEmail(
  orderId: string,
  to: OrderStatusCode,
  message: string | null,
) {
  const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) return;
  await enqueue("email.status_changed", { orderId, status: to, message });
}

export async function queueOrderConfirmation(orderId: string, guestToken: string) {
  await enqueue("email.order_confirmation", { orderId, guestToken });
}

/** Traite la file d'emails (appelé par /api/jobs/run). */
export async function processEmailQueue(limit = 25) {
  const pending = await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, "queued"))
    .orderBy(desc(jobs.createdAt))
    .limit(limit);

  let processed = 0;
  for (const job of pending) {
    try {
      const payload = job.payload as Record<string, string | null>;
      if (job.type === "email.status_changed") {
        const rows = await db.select().from(orders).where(eq(orders.id, String(payload.orderId))).limit(1);
        const order = rows[0];
        if (order) {
          // Un jeton frais par email : les liens déjà envoyés restent valides.
          const { issueGuestToken } = await import("./orders");
          const guestToken = await issueGuestToken(order.id, "suivi de commande");
          await sendStatusUpdate(
            order,
            payload.status as OrderStatusCode,
            order.locale,
            payload.message ?? null,
            guestToken,
          );
          if (payload.status === "ready") {
            await sendResultsReady(
              order,
              order.locale,
              trackingLink(order, order.locale, guestToken),
            );
          }
        }
      } else if (job.type === "email.order_confirmation") {
        const rows = await db.select().from(orders).where(eq(orders.id, String(payload.orderId))).limit(1);
        const order = rows[0];
        if (order) {
          const token =
            (payload.guestToken as string | undefined) ??
            (await (await import("./orders")).issueGuestToken(order.id));
          await sendOrderConfirmation(order, order.locale, token);
          await notifyAdminNewOrder(order);
        }
      }

      await db.update(jobs).set({ status: "done", completedAt: new Date() }).where(eq(jobs.id, job.id));
      processed += 1;
    } catch (error) {
      await db
        .update(jobs)
        .set({
          status: "failed",
          attempts: job.attempts + 1,
          lastError: error instanceof Error ? error.message : String(error),
        })
        .where(eq(jobs.id, job.id));
    }
  }
  return processed;
}

/**
 * Coordonnées bancaires à afficher dans l'email.
 * Elles viennent du module de paiement (réglages éditables, puis variables
 * d'environnement) : jamais écrites en dur dans un message.
 */
async function bankInstructions(
  order: Order,
  locale: Locale,
): Promise<{ label: string; value: string }[]> {
  try {
    const { defaultPaymentDriver } = await import("@/lib/payments");
    const result = await defaultPaymentDriver().start({
      order,
      locale,
      returnUrl: site.url,
    });
    if (result.kind !== "instructions") return [];
    const { createTranslator } = await import("@/lib/i18n");
    const t = createTranslator(locale);
    return result.instructions.rows
      .filter((row) => row.value && row.value !== "—")
      .map((row) => ({ label: t(row.labelKey), value: row.value }));
  } catch {
    return [];
  }
}

export { formatDate };
