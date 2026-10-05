import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { site } from "@/config/site";
import { defaultLocale, htmlLang, isLocale, isRtl } from "@/lib/i18n";
import "./globals.css";

/**
 * Polices auto-hébergées : aucune requête vers un domaine tiers, donc pas de
 * résolution DNS ni de connexion supplémentaire sur le chemin critique.
 * Fraunces (variable : wght, SOFT, WONK, opsz) pour les titres, Inter pour
 * l'interface.
 */
const fraunces = localFont({
  src: "../fonts/fraunces.woff2",
  display: "swap",
  variable: "--font-fraunces",
  preload: true,
  fallback: ["Iowan Old Style", "Georgia", "Times New Roman", "serif"],
});

/**
 * L'italique, lui, n'est pas préchargé.
 *
 * Précharger les deux graisses coûtait 343 Kio sur le chemin critique, dont
 * 150 Kio d'italique — soit davantage que le HTML, la feuille de style et
 * l'image d'accueil réunis. Or l'italique ne sert qu'aux citations des
 * témoignages, en bas de la page d'accueil. Déclaré à part et non préchargé,
 * il reste disponible : le navigateur ne le télécharge qu'en atteignant la
 * citation, et affiche la police de repli d'ici là.
 */
const frauncesItalic = localFont({
  src: "../fonts/fraunces-italic.woff2",
  style: "italic",
  display: "swap",
  variable: "--font-fraunces-italic",
  preload: false,
  fallback: ["Iowan Old Style", "Georgia", "Times New Roman", "serif"],
});

const inter = localFont({
  src: "../fonts/inter.woff2",
  display: "swap",
  variable: "--font-inter",
  preload: true,
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name }],
  formatDetection: { telephone: true },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // La locale est posée par le middleware (réécriture) : elle pilote `lang` et `dir`.
  const requestHeaders = await headers();
  const raw = requestHeaders.get("x-arl-locale") ?? defaultLocale;
  const locale = isLocale(raw) ? raw : defaultLocale;

  return (
    <html
      lang={htmlLang[locale]}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${fraunces.variable} ${frauncesItalic.variable} ${inter.variable}`}
    >
      <body className="bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
