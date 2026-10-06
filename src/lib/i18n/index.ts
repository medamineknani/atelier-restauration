import frJson from "../../../messages/fr.json";
import enJson from "../../../messages/en.json";
import { activeLocales, defaultLocale, type Locale } from "./config";

export { activeLocales, defaultLocale, isLocale, isRtl, localePath, locales, htmlLang, ogLocale } from "./config";
export type { Locale } from "./config";

/* -------------------------------------------------------------------------- */
/* Dictionnaire                                                                */
/* -------------------------------------------------------------------------- */

export type Dictionary = typeof frJson;

const dictionaries: Record<string, Dictionary> = {
  fr: frJson,
  en: enJson as unknown as Dictionary,
};

/**
 * Retourne le dictionnaire d'une locale.
 * Toute clé absente retombe sur le français : une traduction manquante ne
 * provoque jamais d'erreur d'affichage en production.
 */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? frJson;
}

/** Découpe un dictionnaire pour n'envoyer au client que les clés nécessaires. */
export function pickNamespaces<K extends keyof Dictionary>(
  dict: Dictionary,
  namespaces: readonly K[],
): Pick<Dictionary, K> {
  const out = {} as Pick<Dictionary, K>;
  for (const ns of namespaces) out[ns] = dict[ns];
  return out;
}

export type PartialDictionary = Partial<Dictionary>;

/* -------------------------------------------------------------------------- */
/* Traduction                                                                  */
/* -------------------------------------------------------------------------- */

function resolvePath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

export type TranslateParams = Record<string, string | number>;

function interpolate(template: string, params?: TranslateParams) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}

/** Clés autorisées à l'appel : chemins à points vers une chaîne. */
type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends readonly unknown[]
      ? `${Prefix}${K}`
      : T[K] extends object
        ? Leaves<T[K], `${Prefix}${K}.`>
        : never;
}[keyof T & string];

export type TranslationKey = Leaves<Dictionary>;

export type Translator = <K extends TranslationKey>(
  key: K,
  params?: TranslateParams,
) => string;

/**
 * Crée une fonction de traduction liée à un dictionnaire.
 * Repli automatique sur le français si la clé est absente de la locale.
 * Si la valeur résolue n'est pas une chaîne (tableau, objet), la clé est
 * renvoyée telle quelle — les tableaux se récupèrent via `raw()`.
 */
export function createTranslator(locale: Locale, dict?: PartialDictionary): Translator {
  const source = dict ?? getDictionary(locale);
  return ((key: string, params?: TranslateParams) => {
    let value = resolvePath(source, key);
    if (typeof value !== "string" && locale !== defaultLocale) {
      value = resolvePath(frJson, key);
    }
    if (typeof value !== "string") return key;
    return interpolate(value, params);
  }) as Translator;
}

/** Récupère une valeur non textuelle (tableau, objet) d'un dictionnaire. */
export function raw<T = unknown>(locale: Locale, key: string, dict?: PartialDictionary): T {
  const source = dict ?? getDictionary(locale);
  let value = resolvePath(source, key);
  if (value === undefined && locale !== defaultLocale) value = resolvePath(frJson, key);
  return value as T;
}

export async function getTranslator(locale: Locale) {
  return createTranslator(locale);
}

/** Locales pour lesquelles générer les pages (`generateStaticParams`). */
export function activeLocaleParams() {
  return activeLocales.map((locale) => ({ locale }));
}
