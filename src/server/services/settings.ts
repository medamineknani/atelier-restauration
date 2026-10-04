import "server-only";

import { inArray, sql } from "drizzle-orm";

import { site } from "@/config/site";
import { db } from "@/server/db";
import { settings } from "@/server/db/schema";

/* -------------------------------------------------------------------------- */
/* Lecture groupée                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Lit plusieurs clés d'un coup.
 *
 * Les réglages sont stockés en `jsonb` dans une table clé/valeur : ajouter un
 * réglage ne demande aucune migration, et la lecture reste un seul `SELECT`
 * même quand une section en compte quinze.
 */
async function readMany<T extends Record<string, unknown>>(keys: string[]): Promise<T> {
  if (keys.length === 0) return {} as T;
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, keys));
  const out: Record<string, unknown> = {};
  for (const row of rows) out[row.key] = row.value;
  return out as T;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function strArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string")
    ? (value as string[])
    : fallback;
}

/* -------------------------------------------------------------------------- */
/* Marque & coordonnées                                                        */
/* -------------------------------------------------------------------------- */

export type BrandSettings = {
  name: string;
  email: string;
  phone: string;
  phoneHref: string;
  whatsapp: string;
  street: string;
  postalCode: string;
  city: string;
  region: string;
  country: string;
  openingHours: string;
  instagram: string;
  facebook: string;
};

const BRAND_KEYS = [
  "brand_name",
  "brand_email",
  "brand_phone",
  "brand_phone_href",
  "brand_whatsapp",
  "brand_street",
  "brand_postal_code",
  "brand_city",
  "brand_region",
  "brand_country",
  "brand_opening_hours",
  "brand_instagram",
  "brand_facebook",
];

/**
 * Identité et coordonnées de l'atelier.
 *
 * `src/config/site.ts` fournit les valeurs par défaut ; tout ce qui est
 * renseigné en base prend le dessus. Une base vide redonne donc exactement le
 * site livré — aucun réglage n'est indispensable au démarrage.
 */
export async function getBrandSettings(): Promise<BrandSettings> {
  const raw = await readMany<Record<string, unknown>>(BRAND_KEYS);
  const phone = str(raw.brand_phone, site.phone);
  return {
    name: str(raw.brand_name, site.name),
    email: str(raw.brand_email, site.email),
    phone,
    phoneHref: str(raw.brand_phone_href, site.phoneHref),
    whatsapp: str(raw.brand_whatsapp, site.whatsapp),
    street: str(raw.brand_street, site.address.street),
    postalCode: str(raw.brand_postal_code, site.address.postalCode),
    city: str(raw.brand_city, site.address.city),
    region: str(raw.brand_region, site.address.region),
    country: str(raw.brand_country, site.address.country),
    openingHours: str(raw.brand_opening_hours, site.openingHours),
    instagram: str(raw.brand_instagram, site.social.instagram),
    facebook: str(raw.brand_facebook, site.social.facebook),
  };
}

/* -------------------------------------------------------------------------- */
/* Commercial                                                                  */
/* -------------------------------------------------------------------------- */

export type CommercialSettings = {
  /** Frais de port forfaitaires, en millimes (0 = offerts). */
  shippingFlatMillimes: number;
  /** Exige au moins une photo avant de pouvoir valider une commande. */
  requirePhotosBeforeSubmit: boolean;
  /** Formats acceptés à l'upload. */
  acceptedFormats: string[];
};

const COMMERCIAL_KEYS = [
  "shipping_flat_millimes",
  "require_photos_before_submit",
  "accepted_formats",
];

export async function getCommercialSettings(): Promise<CommercialSettings> {
  const raw = await readMany<Record<string, unknown>>(COMMERCIAL_KEYS);
  return {
    shippingFlatMillimes: num(raw.shipping_flat_millimes, 0),
    requirePhotosBeforeSubmit: bool(raw.require_photos_before_submit, true),
    acceptedFormats: strArray(raw.accepted_formats, [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/tiff",
    ]),
  };
}

/* -------------------------------------------------------------------------- */
/* Paiement                                                                    */
/* -------------------------------------------------------------------------- */

export type PaymentSettings = {
  /** Titulaire du compte pour les règlements hors ligne. */
  manualHolder: string;
  manualBank: string;
  manualIban: string;
  /** Ordre d'affichage des moyens de paiement. */
  providerOrder: string[];
};

const PAYMENT_KEYS = [
  "payment_manual_holder",
  "payment_manual_bank",
  "payment_manual_iban",
  "payment_provider_order",
];

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const raw = await readMany<Record<string, unknown>>(PAYMENT_KEYS);
  return {
    manualHolder: str(raw.payment_manual_holder, "Atelier Restauration"),
    manualBank: str(raw.payment_manual_bank, ""),
    manualIban: str(raw.payment_manual_iban, ""),
    providerOrder: strArray(raw.payment_provider_order, ["manual"]),
  };
}

/* -------------------------------------------------------------------------- */
/* Stockage & rétention                                                        */
/* -------------------------------------------------------------------------- */

export type StorageSettings = {
  maxFileSizeBytes: number;
  maxFilesPerOrder: number;
  retentionOriginalsDays: number;
  retentionRestoredDays: number;
  retentionDraftDays: number;
};

const STORAGE_KEYS = [
  "max_file_size_bytes",
  "max_files_per_order",
  "retention_originals_days",
  "retention_restored_days",
  "retention_draft_days",
];

export async function getStorageSettings(): Promise<StorageSettings> {
  const raw = await readMany<Record<string, unknown>>(STORAGE_KEYS);
  return {
    maxFileSizeBytes: num(raw.max_file_size_bytes, 60 * 1024 * 1024),
    maxFilesPerOrder: num(raw.max_files_per_order, 200),
    retentionOriginalsDays: num(raw.retention_originals_days, 90),
    retentionRestoredDays: num(raw.retention_restored_days, 365),
    retentionDraftDays: num(raw.retention_draft_days, 30),
  };
}

/* -------------------------------------------------------------------------- */
/* Écriture                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Enregistre un jeu de réglages.
 *
 * Chaque clé est écrite individuellement : une section partiellement remplie
 * ne provoque jamais la perte des clés voisines, et le journal d'audit peut
 * nommer précisément ce qui a changé.
 */
export async function saveSettings(
  values: Record<string, unknown>,
  updatedBy?: string,
): Promise<void> {
  const entries = Object.entries(values);
  if (entries.length === 0) return;

  await db
    .insert(settings)
    .values(
      entries.map(([key, value]) => ({
        key,
        value,
        updatedBy: updatedBy ?? null,
        updatedAt: new Date(),
      })),
    )
    .onConflictDoUpdate({
      target: settings.key,
      // `excluded` désigne la ligne proposée à l'insertion : on écrit la
      // nouvelle valeur et on garde la trace de son auteur.
      set: {
        value: sql`excluded.value`,
        updatedBy: sql`excluded.updated_by`,
        updatedAt: new Date(),
      },
    });
}
