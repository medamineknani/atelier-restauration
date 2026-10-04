export const locales = ["fr", "en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

/**
 * Locales réellement exposées au public.
 * L'infrastructure (`locales`, tables de traduction, RTL) couvre l'arabe dès
 * maintenant ; il suffit d'ajouter "ar" ici une fois les textes traduits.
 */
export const activeLocales = ["fr", "en"] as const satisfies readonly Locale[];
export type ActiveLocale = (typeof activeLocales)[number];

export const localeNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
};

export const htmlLang: Record<Locale, string> = {
  fr: "fr-TN",
  en: "en-GB",
  ar: "ar-TN",
};

export const ogLocale: Record<Locale, string> = {
  fr: "fr_TN",
  en: "en_GB",
  ar: "ar_TN",
};

export const isRtl = (locale: Locale) => locale === "ar";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Préfixe d'URL pour une locale (`fr` = défaut, sans préfixe). */
export function localePath(locale: Locale, path = "/") {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return clean === "" ? "/" : clean;
  return `/${locale}${clean}`;
}

export function stripLocale(pathname: string): { locale: Locale; path: string } {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first && isLocale(first) && first !== defaultLocale) {
    return { locale: first, path: `/${segments.slice(1).join("/")}` };
  }
  return { locale: defaultLocale, path: pathname };
}
