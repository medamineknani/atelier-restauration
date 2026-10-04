import Link from "next/link";
import { site } from "@/config/site";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";

export function Header({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);

  const items = [
    { href: localePath(locale, "/restauration-photo"), label: t("nav.restoration") },
    { href: localePath(locale, "/photobooks"), label: t("nav.photobooks") },
    { href: localePath(locale, "/galerie"), label: t("nav.gallery") },
    { href: localePath(locale, "/tarifs"), label: t("nav.pricing") },
    { href: localePath(locale, "/faq"), label: t("nav.faq") },
    { href: localePath(locale, "/a-propos"), label: t("nav.about") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-[2px] supports-[backdrop-filter]:bg-paper/80">
      <div className="container-editorial flex h-16 items-center justify-between gap-6 md:h-20">
        <Link
          href={localePath(locale, "/")}
          className="font-display text-[1.0625rem] leading-none tracking-tight text-ink transition-fast hover:text-champagne-deep"
        >
          Atelier
          <span className="hidden font-sans text-[0.6875rem] uppercase tracking-[0.2em] text-stone sm:block">
            Restauration
          </span>
        </Link>

        <nav aria-label={t("a11y.mainNavigation")} className="hidden md:block">
          <ul className="flex items-center gap-8">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "rule-expand text-[0.875rem] text-graphite transition-fast hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={`tel:${site.phoneHref}`}
            className="hidden text-[0.875rem] text-graphite transition-fast hover:text-ink lg:block"
          >
            {site.phone}
          </a>
          <ButtonLink
            href={localePath(locale, "/commande/service")}
            size="md"
            className="hidden md:inline-flex"
          >
            {t("nav.cta")}
          </ButtonLink>
          <MobileNav
            items={items}
            ctaLabel={t("nav.cta")}
            ctaHref={localePath(locale, "/commande/service")}
            openLabel={t("nav.openMenu")}
            closeLabel={t("nav.closeMenu")}
            locale={locale}
          />
        </div>
      </div>
    </header>
  );
}
