import Link from "next/link";
import { createTranslator } from "@/lib/i18n";
import { adminListTransformations } from "@/server/services/admin";
import { saveTransformation } from "@/server/actions/admin-content";
import { AdminLabel, EmptyRow, Panel, adminInputClass } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const CATEGORIES = ["famille", "mariage", "portrait", "vintage", "deteriore"];

/**
 * Galerie avant / après.
 *
 * Les images elles-mêmes sont produites par `npm run gallery` depuis
 * `assets/sources`. Cet écran ne touche qu'à leur présentation — légende du
 * travail effectué, textes alternatifs, catégorie, publication — parce que
 * c'est ce que l'atelier a besoin d'ajuster sans redéployer.
 */
export default async function AdminGalleryPage() {
  const t = createTranslator("fr");
  const items = await adminListTransformations();

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-[0.8125rem] text-stone">
          <Link href="/admin/contenu" className="underline underline-offset-4 hover:text-ink">
            Contenu
          </Link>
        </p>
        <h1 className="mt-3 font-display text-[1.5rem] text-ink">{t("admin.galleryTitle")}</h1>
        <p className="mt-2 max-w-2xl text-[0.8125rem] leading-relaxed text-stone">
          Les paires d’images sont générées par <code>npm run gallery</code> depuis{" "}
          <code>assets/sources</code>. Ici, on règle leur présentation et leur publication.
        </p>
      </div>

      <Panel title={`${items.length} transformation(s)`} className="!p-0">
        {items.length === 0 ? (
          <EmptyRow>{t("admin.noEntries")}</EmptyRow>
        ) : (
          <ul className="grid gap-px bg-line">
            {items.map((item) => {
              const fr = item.translations.fr;
              const en = item.translations.en;

              return (
                <li key={item.id} className="bg-paper">
                  <details>
                    <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 transition-fast hover:bg-cream">
                      <span className="flex min-w-0 items-center gap-4">
                        {item.beforeAssetId ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={`/api/files/${item.beforeAssetId}?variant=thumb`}
                            alt=""
                            width={48}
                            height={48}
                            loading="lazy"
                            className="h-12 w-12 shrink-0 rounded-[2px] object-cover"
                          />
                        ) : null}
                        <span className="min-w-0">
                          <span className="block truncate text-[0.875rem] text-ink">
                            {fr?.title ?? en?.title ?? item.slug}
                          </span>
                          <span className="block text-[0.75rem] text-muted">
                            {item.category} · ordre {item.sortOrder}
                            {item.isPublished ? "" : " · non publiée"}
                          </span>
                        </span>
                      </span>

                      <span className="flex shrink-0 items-center gap-2">
                        {item.isFeatured ? (
                          <span className="rounded-[3px] bg-champagne-soft px-1.5 py-0.5 text-[0.6875rem] text-champagne-deep">
                            vedette
                          </span>
                        ) : null}
                        <span
                          className={`rounded-[3px] px-2 py-0.5 text-[0.75rem] ${
                            item.isPublished
                              ? "bg-success/10 text-success"
                              : "bg-sand text-muted"
                          }`}
                        >
                          {item.isPublished ? "publiée" : "brouillon"}
                        </span>
                      </span>
                    </summary>

                    <form
                      action={saveTransformation}
                      className="grid gap-4 border-t border-line/60 bg-cream/40 p-4 lg:grid-cols-2"
                    >
                      <input type="hidden" name="id" value={item.id} />

                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <AdminLabel htmlFor={`t-fr-${item.id}`}>Titre (FR)</AdminLabel>
                          <input
                            id={`t-fr-${item.id}`}
                            name="title.fr"
                            defaultValue={fr?.title ?? ""}
                            className={adminInputClass}
                          />
                        </div>
                        <div className="grid gap-2">
                          <AdminLabel
                            htmlFor={`w-fr-${item.id}`}
                            hint="Ce que l’atelier a réellement fait, image par image."
                          >
                            Travail effectué (FR)
                          </AdminLabel>
                          <textarea
                            id={`w-fr-${item.id}`}
                            name="workDescription.fr"
                            rows={4}
                            defaultValue={fr?.workDescription ?? ""}
                            className={`${adminInputClass} resize-y`}
                          />
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <AdminLabel htmlFor={`t-en-${item.id}`}>Titre (EN)</AdminLabel>
                          <input
                            id={`t-en-${item.id}`}
                            name="title.en"
                            defaultValue={en?.title ?? ""}
                            className={adminInputClass}
                          />
                        </div>
                        <div className="grid gap-2">
                          <AdminLabel htmlFor={`w-en-${item.id}`}>Travail effectué (EN)</AdminLabel>
                          <textarea
                            id={`w-en-${item.id}`}
                            name="workDescription.en"
                            rows={4}
                            defaultValue={en?.workDescription ?? ""}
                            className={`${adminInputClass} resize-y`}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-end gap-3 lg:col-span-2">
                        <div className="grid gap-2">
                          <AdminLabel htmlFor={`cat-${item.id}`}>Catégorie</AdminLabel>
                          <select
                            id={`cat-${item.id}`}
                            name="category"
                            defaultValue={item.category}
                            className={adminInputClass}
                          >
                            {CATEGORIES.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid w-24 gap-2">
                          <AdminLabel htmlFor={`order-${item.id}`}>Ordre</AdminLabel>
                          <input
                            id={`order-${item.id}`}
                            name="sortOrder"
                            type="number"
                            defaultValue={item.sortOrder}
                            className={adminInputClass}
                          />
                        </div>

                        <label className="flex items-center gap-2 pb-2 text-[0.8125rem] text-graphite">
                          <input
                            type="checkbox"
                            name="isPublished"
                            defaultChecked={item.isPublished}
                            className="h-4 w-4 accent-champagne-deep"
                          />
                          Publiée
                        </label>
                        <label className="flex items-center gap-2 pb-2 text-[0.8125rem] text-graphite">
                          <input
                            type="checkbox"
                            name="isFeatured"
                            defaultChecked={item.isFeatured}
                            className="h-4 w-4 accent-champagne-deep"
                          />
                          Mise en avant
                        </label>

                        <div className="ms-auto">
                          <button
                            type="submit"
                            className="rounded-sm border border-line-strong bg-paper px-4 py-2 text-[0.8125rem] font-medium text-ink transition-fast hover:border-champagne hover:bg-cream"
                          >
                            Enregistrer
                          </button>
                        </div>
                      </div>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
