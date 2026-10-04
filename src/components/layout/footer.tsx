import Link from "next/link";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { Rule } from "@/components/ui/primitives";
import { getBrandSettings } from "@/server/services/settings";

/**
 * Le pied de page lit les coordonnées depuis la base : ce qui est affiché ici
 * est exactement ce que l'atelier a saisi dans les réglages.
 */
export async function Footer({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  const brand = await getBrandSettings();
  const year = new Date().getFullYear();

  const columns = [
    {
      title: t("footer.servicesTitle"),
      links: [
        { href: localePath(locale, "/restauration-photo"), label: t("nav.restoration") },
        { href: localePath(locale, "/photobooks"), label: t("nav.photobooks") },
        { href: localePath(locale, "/colorisation-photos"), label: t("footer.colorisation") },
        { href: localePath(locale, "/devis"), label: t("footer.albums") },
      ],
    },
    {
      title: t("footer.workshopTitle"),
      links: [
        { href: localePath(locale, "/a-propos"), label: t("nav.about") },
        { href: localePath(locale, "/galerie"), label: t("nav.gallery") },
        { href: localePath(locale, "/faq"), label: t("nav.faq") },
        { href: localePath(locale, "/confidentialite"), label: t("nav.trust") },
      ],
    },
    {
      title: t("footer.legalTitle"),
      links: [
        { href: localePath(locale, "/mentions-legales"), label: t("footer.legal") },
        { href: localePath(locale, "/conditions-vente"), label: t("footer.terms") },
        { href: localePath(locale, "/politique-confidentialite"), label: t("footer.privacy") },
      ],
    },
  ];

  return (
    <footer className="border-t border-line bg-cream">
      <div className="container-editorial py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="font-display text-xl leading-snug text-ink">{brand.name}</p>
            <p className="mt-4 max-w-xs text-[0.9375rem] leading-relaxed text-stone">
              {t("footer.brandLine")}
            </p>
            <p className="mt-6 text-[0.8125rem] text-stone">{brand.openingHours}</p>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="eyebrow text-stone">{column.title}</p>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[0.9375rem] text-graphite transition-fast hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <Rule className="my-12" />

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 text-[0.8125rem] text-stone">
            <p>
              {brand.email} · {brand.phone}
            </p>
            <p>
              {brand.street}, {brand.postalCode} {brand.city}
            </p>
          </div>
          <p className="text-[0.8125rem] text-stone">
            © {year} {brand.name}. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
