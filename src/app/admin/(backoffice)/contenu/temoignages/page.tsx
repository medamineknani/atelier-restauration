import Link from "next/link";
import { createTranslator } from "@/lib/i18n";
import { formatShortDate } from "@/lib/utils";
import { adminListTestimonials } from "@/server/services/admin";
import { deleteTestimonial, saveTestimonial } from "@/server/actions/admin-content";
import { AdminLabel, EmptyRow, Panel, adminInputClass } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";

export const dynamic = "force-dynamic";

/**
 * Témoignages.
 *
 * Un témoignage porte la voix d'un client : il n'entre sur le site qu'après
 * approbation. La case est décochée par défaut, jamais pré-cochée.
 */
export default async function AdminTestimonialsPage() {
  const t = createTranslator("fr");
  const items = await adminListTestimonials();
  const pending = items.filter((item) => !item.isApproved).length;

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-[0.8125rem] text-stone">
          <Link href="/admin/contenu" className="underline underline-offset-4 hover:text-ink">
            Contenu
          </Link>
        </p>
        <h1 className="mt-3 font-display text-[1.5rem] text-ink">{t("admin.testimonialsTitle")}</h1>
        {pending > 0 ? (
          <p className="mt-2 text-[0.875rem] text-warning">
            {pending} témoignage(s) en attente de modération.
          </p>
        ) : null}
      </div>

      <Panel title="Nouveau témoignage">
        <form action={saveTestimonial} className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3">
            <div className="grid gap-2">
              <AdminLabel htmlFor="authorName">Nom</AdminLabel>
              <input id="authorName" name="authorName" required className={adminInputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <AdminLabel htmlFor="authorLocation">Ville</AdminLabel>
                <input id="authorLocation" name="authorLocation" className={adminInputClass} />
              </div>
              <div className="grid gap-2">
                <AdminLabel htmlFor="rating">Note</AdminLabel>
                <input
                  id="rating"
                  name="rating"
                  type="number"
                  min="1"
                  max="5"
                  defaultValue={5}
                  className={adminInputClass}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <AdminLabel htmlFor="authorContext">Contexte</AdminLabel>
              <input
                id="authorContext"
                name="authorContext"
                className={adminInputClass}
                placeholder="Album de famille, 1954"
              />
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <AdminLabel htmlFor="quote.fr">Citation (FR)</AdminLabel>
              <textarea id="quote.fr" name="quote.fr" rows={3} required className={`${adminInputClass} resize-y`} />
            </div>
            <div className="grid gap-2">
              <AdminLabel htmlFor="quote.en">Citation (EN)</AdminLabel>
              <textarea id="quote.en" name="quote.en" rows={3} className={`${adminInputClass} resize-y`} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
            <label className="flex items-center gap-2 text-[0.8125rem] text-graphite">
              <input type="checkbox" name="isApproved" className="h-4 w-4 accent-champagne-deep" />
              Approuvé
            </label>
            <label className="flex items-center gap-2 text-[0.8125rem] text-graphite">
              <input type="checkbox" name="isFeatured" className="h-4 w-4 accent-champagne-deep" />
              Mis en avant
            </label>
            <div className="grid w-24 gap-2">
              <AdminLabel htmlFor="sortOrder">Ordre</AdminLabel>
              <input id="sortOrder" name="sortOrder" type="number" defaultValue={0} className={adminInputClass} />
            </div>
            <button
              type="submit"
              className="ms-auto rounded-sm bg-ink px-4 py-2.5 text-[0.875rem] font-medium text-paper transition-fast hover:bg-ink-soft"
            >
              Ajouter
            </button>
          </div>
        </form>
      </Panel>

      <Panel title={`${items.length} témoignage(s)`} className="!p-0">
        {items.length === 0 ? (
          <EmptyRow>{t("admin.noEntries")}</EmptyRow>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id} className="border-b border-line/60 last:border-0">
                <details>
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 transition-fast hover:bg-cream">
                    <span className="min-w-0">
                      <span className="block truncate text-[0.875rem] text-ink">
                        {item.authorName}
                        {item.authorLocation ? ` · ${item.authorLocation}` : ""}
                      </span>
                      <span className="block truncate text-[0.75rem] text-muted">
                        {formatShortDate(item.createdAt, "fr")} · {item.rating}/5
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
                          item.isApproved ? "bg-success/10 text-success" : "bg-warning/12 text-warning"
                        }`}
                      >
                        {item.isApproved ? "approuvé" : "en attente"}
                      </span>
                    </span>
                  </summary>

                  <form
                    action={saveTestimonial}
                    className="grid gap-3 border-t border-line/60 bg-cream/40 p-4 lg:grid-cols-2"
                  >
                    <input type="hidden" name="id" value={item.id} />

                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <AdminLabel htmlFor={`name-${item.id}`}>Nom</AdminLabel>
                        <input
                          id={`name-${item.id}`}
                          name="authorName"
                          defaultValue={item.authorName}
                          className={adminInputClass}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <AdminLabel htmlFor={`city-${item.id}`}>Ville</AdminLabel>
                          <input
                            id={`city-${item.id}`}
                            name="authorLocation"
                            defaultValue={item.authorLocation ?? ""}
                            className={adminInputClass}
                          />
                        </div>
                        <div className="grid gap-2">
                          <AdminLabel htmlFor={`rating-${item.id}`}>Note</AdminLabel>
                          <input
                            id={`rating-${item.id}`}
                            name="rating"
                            type="number"
                            min="1"
                            max="5"
                            defaultValue={item.rating ?? 5}
                            className={adminInputClass}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <AdminLabel htmlFor={`context-${item.id}`}>Contexte</AdminLabel>
                        <input
                          id={`context-${item.id}`}
                          name="authorContext"
                          defaultValue={item.authorContext ?? ""}
                          className={adminInputClass}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <AdminLabel htmlFor={`q-fr-${item.id}`}>Citation (FR)</AdminLabel>
                        <textarea
                          id={`q-fr-${item.id}`}
                          name="quote.fr"
                          rows={3}
                          defaultValue={item.quotes.fr ?? ""}
                          className={`${adminInputClass} resize-y`}
                        />
                      </div>
                      <div className="grid gap-2">
                        <AdminLabel htmlFor={`q-en-${item.id}`}>Citation (EN)</AdminLabel>
                        <textarea
                          id={`q-en-${item.id}`}
                          name="quote.en"
                          rows={3}
                          defaultValue={item.quotes.en ?? ""}
                          className={`${adminInputClass} resize-y`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
                      <label className="flex items-center gap-2 text-[0.8125rem] text-graphite">
                        <input
                          type="checkbox"
                          name="isApproved"
                          defaultChecked={item.isApproved}
                          className="h-4 w-4 accent-champagne-deep"
                        />
                        Approuvé
                      </label>
                      <label className="flex items-center gap-2 text-[0.8125rem] text-graphite">
                        <input
                          type="checkbox"
                          name="isFeatured"
                          defaultChecked={item.isFeatured}
                          className="h-4 w-4 accent-champagne-deep"
                        />
                        Mis en avant
                      </label>
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
                      <div className="ms-auto flex gap-2">
                        <button
                          type="submit"
                          className="rounded-sm border border-line-strong bg-paper px-4 py-2 text-[0.8125rem] font-medium text-ink transition-fast hover:border-champagne hover:bg-cream"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  </form>

                  <form action={deleteTestimonial} className="flex justify-end px-4 pb-3">
                    <input type="hidden" name="id" value={item.id} />
                    <ConfirmButton
                      label={t("admin.delete")}
                      confirm="Supprimer ce témoignage ?"
                      variant="danger"
                      className="!px-3 !py-1.5 !text-[0.75rem]"
                    />
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
