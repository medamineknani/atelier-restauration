import { site } from "@/config/site";
import { htmlLang, localePath, locales, ogLocale, type Locale } from "@/lib/i18n";

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
  return {
    title: input.title,
    description: input.description,
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
      description: input.description,
      images: input.image ? [{ url: input.image, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: input.title,
      description: input.description,
      images: input.image ? [input.image] : undefined,
    },
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

/* -------------------------------------------------------------------------- */
/* Données structurées                                                         */
/* -------------------------------------------------------------------------- */

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site.url}/#organization`,
    name: site.name,
    url: site.url,
    description: site.description,
    email: site.email,
    telephone: site.phone,
    areaServed: { "@type": "Country", name: "Tunisie" },
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      postalCode: site.address.postalCode,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      addressCountry: site.address.country,
    },
    sameAs: [site.social.instagram, site.social.facebook],
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
