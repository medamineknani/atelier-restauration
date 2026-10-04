import Image from "next/image";
import Link from "next/link";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { Reveal } from "@/components/ui/primitives";
import type { TransformationCard } from "@/server/services/content";
import { cn } from "@/lib/utils";

/**
 * Mosaïque irrégulière (colonnes CSS) : une grille parfaitement régulière
 * donnerait l'impression d'un template, on cherche l'effet « archive ».
 * Chaque carte montre le résultat ; l'original apparaît au survol ou au focus.
 */
export function GalleryGrid({
  locale,
  items,
  columns = 3,
}: {
  locale: Locale;
  items: TransformationCard[];
  columns?: 2 | 3;
}) {
  const t = createTranslator(locale);

  return (
    <div
      className={cn(
        "gap-6 [column-fill:balance]",
        columns === 3 ? "columns-1 sm:columns-2 lg:columns-3" : "columns-1 sm:columns-2",
      )}
    >
      {items.map((item, index) => (
        <Reveal
          key={item.id}
          as="div"
          delay={(index % 3) * 80}
          className="mb-6 break-inside-avoid"
        >
          <Link
            href={localePath(locale, `/galerie/${item.slug}`)}
            className="group block"
            aria-label={item.title}
          >
            <div
              className="relative overflow-hidden rounded-sm bg-sand"
              style={{ aspectRatio: `${item.width} / ${item.height}` }}
            >
              <Image
                src={`/api/gallery/${item.id}/after`}
                alt={item.altAfter}
                fill
                sizes={columns === 3 ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" : "(max-width: 640px) 100vw, 50vw"}
                className="object-cover transition-opacity duration-500 group-hover:opacity-0 group-focus-visible:opacity-0"
              />
              <Image
                src={`/api/gallery/${item.id}/before`}
                alt=""
                fill
                aria-hidden="true"
                sizes={columns === 3 ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" : "(max-width: 640px) 100vw, 50vw"}
                className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
              />
              <span className="pointer-events-none absolute bottom-3 start-3 rounded-xs bg-paper/85 px-2 py-1 text-[0.625rem] uppercase tracking-[0.16em] text-ink opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                {t("common.before")}
              </span>
            </div>

            <div className="mt-4">
              <p className="eyebrow text-stone">
                {t(`gallery.categories.${item.category}` as never) || item.category}
              </p>
              <h3 className="mt-2 font-display text-[1.0625rem] leading-snug text-ink transition-fast group-hover:text-champagne-deep">
                {item.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-[0.875rem] leading-relaxed text-stone">
                {item.workDescription}
              </p>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}
