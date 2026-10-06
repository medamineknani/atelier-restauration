import type { Locale } from "@/lib/i18n/config";

/**
 * Identité de la marque. Une seule source de vérité : ce fichier + les tables
 * de traduction / `settings` pour ce qui est éditable en back-office.
 */
export const site = {
  name: "Atelier Restauration",
  shortName: "Atelier",
  tagline: "Restauration et préservation de photographies",
  description:
    "Nous restaurons à la main vos photographies anciennes, abîmées ou décolorées, et les relions dans des photobooks premium. Tunisie.",
  url: "https://atelier-restauration.tn",
  areaServed: "TN",
  email: "bonjour@atelier-restauration.tn",
  phone: "+216 71 000 000",
  phoneHref: "+21671000000",
  whatsapp: "+216 20 000 000",
  address: {
    street: "12, rue de la Photographie",
    city: "Tunis",
    region: "Tunis",
    postalCode: "1000",
    country: "TN",
  },
  openingHours: "Du lundi au vendredi · 9h – 18h",
  social: {
    instagram: "https://instagram.com/atelier.restauration",
    facebook: "https://facebook.com/atelier.restauration",
  },
  defaults: {
    locale: "fr" as Locale,
    currency: "TND",
  },
} as const;

/** Devise : tout montant est stocké en millimes entiers (99000 = 99,000 DT). */
export const CURRENCY = {
  code: "TND",
  symbol: "DT",
  decimals: 3,
} as const;

export const CONTACT_SUBJECTS = [
  "renseignement",
  "commande-en-cours",
  "photobook",
  "devis",
  "partenariat",
] as const;
