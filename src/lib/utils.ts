import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/* -------------------------------------------------------------------------- */
/* Argent — stocké en millimes entiers                                        */
/* -------------------------------------------------------------------------- */

export const CURRENCY_SYMBOL = "DT";

/** 99 DT -> 99000 */
export function toMillimes(dinars: number) {
  return Math.round(dinars * 1000);
}

/** 99000 -> { amount: "99", currency: "DT" } (pas de décimales si à zéro) */
export function formatPrice(millimes: number, locale = "fr") {
  // Affichage : un montant négatif n'a pas de sens sur un devis ou une
  // facture, même s'il provient d'une donnée corrompue.
  const safe = Math.max(0, Math.trunc(millimes));
  const value = safe / 1000;
  const hasDecimals = Math.round(safe % 1000) !== 0;
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-TN" : locale === "en" ? "en-US" : "fr-TN", {
    minimumFractionDigits: hasDecimals ? 3 : 0,
    maximumFractionDigits: hasDecimals ? 3 : 0,
  }).format(value);
  return { amount: formatted, currency: CURRENCY_SYMBOL };
}

/** Version compacte pour les badges : "99 DT" */
export function priceLabel(millimes: number, locale = "fr") {
  const { amount, currency } = formatPrice(millimes, locale);
  return `${amount} ${currency}`;
}

/* -------------------------------------------------------------------------- */
/* Dates                                                                      */
/* -------------------------------------------------------------------------- */

export function formatDate(date: Date | string, locale = "fr") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-TN" : locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatShortDate(date: Date | string, locale = "fr") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-TN" : locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "short",
  }).format(d);
}

export function formatDateTime(date: Date | string, locale = "fr") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-TN" : locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return d;
}

export function estimatedWindow(minDays: number, maxDays: number, locale = "fr") {
  const from = addBusinessDays(new Date(), minDays);
  const to = addBusinessDays(new Date(), maxDays);
  return { from, to, label: `${formatShortDate(from, locale)} – ${formatShortDate(to, locale)}` };
}

/* -------------------------------------------------------------------------- */
/* Divers                                                                      */
/* -------------------------------------------------------------------------- */

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function truncate(input: string, max: number) {
  return input.length <= max ? input : `${input.slice(0, max - 1).trimEnd()}…`;
}
