import { site } from "@/config/site";
import { htmlLang, localePath, locales, ogLocale, type Locale } from "@/lib/i18n";
import { getBrandSettings } from "@/server/services/settings";

export function canonicalUrl(locale: Locale, path = "/") {
  return new URL(localePath(locale, path), site.url).toString();
}

export function hreflangAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[htmlLang[locale]] = canonicalUrl(locale, path);
  }
  languages["x-default"] = canonicalUrl("fr", path);
  return languages;
}

/**
 * Raccourcit une description à la longueur qu'affichent les moteurs.
 *
 * Certaines descriptions ne sont pas rédigées pour le référencement : elles
 * viennent du contenu — le descriptif d'une restauration, le premier
 * paragraphe d'une page légale. Au-delà d'environ 160 caractères, le moteur
 * coupe lui-même, au milieu d'un mot. Autant couper proprement, sur un espace
 * et avec une ellipse.
 */
export function truncateDescription(text: string, limit = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;

  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  // Couper au dernier mot entier, sauf si cela raccourcit trop : un texte
  // sans espace doit quand même être rendu.
  const end = lastSpace > limit * 0.6 ? lastSpace : limit;
  return `${cut.slice(0, end).trimEnd()}…`;
}

/**
 * Image de partage par défaut, 1200×630, présente dans public/images.
 *
 * Un lien partagé sans image produit une carte vide sur les réseaux et dans
 * les messageries : c'est la première impression, autant ne pas la laisser
 * au hasard d'une page qui aurait oublié la sienne.
 */
const DEFAULT_OG_IMAGE = "/images/og-atelier.jpg";

/**
 * Les cartes de partage exigent une URL absolue : le réseau qui affiche la
 * carte ne va pas chercher l'image sur notre domaine, il l'affiche depuis
 * l'URL fournie. On la résout contre `site.url`, source de vérité unique,
 * plutôt qu'une variable d'environnement qu'on est sûr d'oublier en prod.
 */
function absoluteImage(image: string) {
  return new URL(image, site.url).toString();
}

export function buildMetadata(input: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
}) {
  const canonical = canonicalUrl(input.locale, input.path);
  const description = truncateDescription(input.description);
  const image = absoluteImage(input.image ?? DEFAULT_OG_IMAGE);

  return {
    title: input.title,
    description,
    alternates: {
      canonical,
      languages: hreflangAlternates(input.path),
    },
    openGraph: {
      type: input.type ?? "website",
      url: canonical,
      siteName: site.name,
      locale: ogLocale[input.locale],
      title: input.title,
      description,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: input.title,
      description,
      images: [image],
    },
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

/* -------------------------------------------------------------------------- */
/* Données structurées                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Données structurées de l'organisation.
 *
 * Asynchrone : les coordonnées viennent des réglages, pour que Google lise
 * exactement ce que le site affiche. Un écart entre les deux est un motif de
 * méfiance pour les moteurs.
 */
export async function organizationJsonLd() {
  const brand = await getBrandSettings();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site.url}/#organization`,
    name: brand.name,
    url: site.url,
    description: site.description,
    email: brand.email,
    telephone: brand.phone,
    areaServed: { "@type": "Country", name: "Tunisie" },
    address: {
      "@type": "PostalAddress",
      streetAddress: brand.street,
      postalCode: brand.postalCode,
      addressLocality: brand.city,
      addressRegion: brand.region,
      addressCountry: brand.country,
    },
    sameAs: [brand.instagram, brand.facebook].filter(Boolean),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    url: site.url,
    name: site.name,
    inLanguage: ["fr-TN", "en-GB"],
    publisher: { "@id": `${site.url}/#organization` },
  };
}

export function serviceJsonLd(input: { name: string; description: string; url: string; locale: Locale }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    url: input.url,
    serviceType: input.name,
    areaServed: { "@type": "Country", name: "Tunisie" },
    provider: { "@id": `${site.url}/#organization` },
    inLanguage: htmlLang[input.locale],
  };
}

export function productJsonLd(input: {
  name: string;
  description: string;
  priceMillimes: number;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url: input.url,
    brand: { "@id": `${site.url}/#organization` },
    offers: {
      "@type": "Offer",
      price: (input.priceMillimes / 1000).toFixed(3),
      priceCurrency: "TND",
      availability: "https://schema.org/InStock",
      seller: { "@id": `${site.url}/#organization` },
    },
  };
}

export function faqJsonLd(entries: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

export function breadcrumbJsonLd(trail: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function howToJsonLd(steps: { title: string; body: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Faire restaurer ses photographies",
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.body,
    })),
  };
}

/** Sérialisation sûre pour un <script type="application/ld+json">. */
export function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
