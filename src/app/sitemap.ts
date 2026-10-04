import type { MetadataRoute } from "next";

import { site } from "@/config/site";
import { PHOTOBOOK_ENTRIES } from "@/lib/content/photobooks";
import { activeLocales, localePath, type Locale } from "@/lib/i18n";
import { getTransformations } from "@/server/services/content";

/**
 * Plan du site.
 *
 * Seules les pages **publiques et indexables** figurent ici. Le back-office,
 * l'espace client et le tunnel de commande sont volontairement exclus : ils
 * sont protégés par authentification ou sans intérêt pour un moteur.
 *
 * `hreflang` est renseigné pour chaque locale active, plus `x-default` sur le
 * français — la locale sans préfixe.
 */
export const dynamic = "force-dynamic";

/** Pages éditoriales statiques : chemin, fréquence et priorité relatives. */
const STATIC_PAGES: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/restauration-photo", changeFrequency: "monthly", priority: 0.9 },
  { path: "/restauration-photos-anciennes", changeFrequency: "monthly", priority: 0.9 },
  { path: "/restauration-photo-mariage", changeFrequency: "monthly", priority: 0.8 },
  { path: "/colorisation-photos", changeFrequency: "monthly", priority: 0.8 },
  { path: "/amelioration-photo", changeFrequency: "monthly", priority: 0.8 },
  { path: "/photobooks", changeFrequency: "monthly", priority: 0.9 },
  ...PHOTOBOOK_ENTRIES.map((e) => ({
    path: `/photobooks/${e.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
  { path: "/galerie", changeFrequency: "weekly", priority: 0.8 },
  { path: "/tarifs", changeFrequency: "monthly", priority: 0.9 },
  { path: "/a-propos", changeFrequency: "yearly", priority: 0.6 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.7 },
  { path: "/devis", changeFrequency: "yearly", priority: 0.7 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/conditions-vente", changeFrequency: "yearly", priority: 0.3 },
  { path: "/mentions-legales", changeFrequency: "yearly", priority: 0.3 },
  { path: "/confidentialite", changeFrequency: "yearly", priority: 0.3 },
  { path: "/politique-confidentialite", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cookies", changeFrequency: "yearly", priority: 0.3 },
];

function entry(
  path: string,
  locale: Locale,
  lastModified: Date | undefined,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
): MetadataRoute.Sitemap[number] {
  return {
    url: new URL(localePath(locale, path), site.url).toString(),
    lastModified,
    changeFrequency,
    priority,
    alternates: {
      languages: Object.fromEntries(
        activeLocales.map((l) => [
          l,
          new URL(localePath(l, path), site.url).toString(),
        ]),
      ),
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];
  for (const page of STATIC_PAGES) {
    for (const locale of activeLocales) {
      entries.push(entry(page.path, locale, now, page.changeFrequency, page.priority));
    }
  }

  // Fiches galerie : publiées uniquement.
  // Un échec de lecture ne doit jamais faire échouer le sitemap.
  const transformations = await getTransformations("fr").catch(() => []);

  for (const item of transformations) {
    if (!item.slug) continue;
    const path = `/galerie/${item.slug}`;
    for (const locale of activeLocales) {
      entries.push(entry(path, locale, now, "monthly", 0.6));
    }
  }

  return entries;
}
