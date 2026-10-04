"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { defaultLocale, type Locale, type PartialDictionary, type TranslationKey, type TranslateParams } from "@/lib/i18n";
import { createTranslator } from "@/lib/i18n";

type I18nValue = {
  locale: Locale;
  t: (key: TranslationKey, params?: TranslateParams) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Fournit les traductions aux îlots client.
 * Les pages (Server Components) appellent `createTranslator` directement :
 * aucun dictionnaire ne part vers le navigateur pour elles.
 */
export function I18nProvider({
  locale = defaultLocale,
  dict,
  children,
}: {
  locale?: Locale;
  dict?: PartialDictionary;
  children: ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, t: createTranslator(locale, dict) }),
    [locale, dict],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n doit être utilisé dans un I18nProvider");
  return ctx;
}
