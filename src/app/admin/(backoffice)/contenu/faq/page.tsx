import Link from "next/link";
import { createTranslator } from "@/lib/i18n";
import { adminListFaq } from "@/server/services/admin";
import { deleteFaq, saveFaq } from "@/server/actions/admin-content";
import { AdminLabel, EmptyRow, Panel, adminInputClass } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";

export const dynamic = "force-dynamic";

const CATEGORIES = ["service", "prix", "photos", "livraison", "confidentialite"];

/**
 * Questions fréquentes.
 *
 * L'édition se fait en place, dans la liste : une FAQ est un bloc de deux
 * champs, l'envoyer sur une autre page coûterait plus cher que son contenu.
 */
export default async function AdminFaqPage() {
  const t = createTranslator("fr");
  const items = await adminListFaq();

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-[0.8125rem] text-stone">
          <Link href="/admin/contenu" className="underline underline-offset-4 hover:text-ink">
            Contenu
          </Link>
        </p>
        <h1 className="mt-3 font-display text-[1.5rem] text-ink">{t("admin.faqTitle")}</h1>
      </div>

      <Panel title="Nouvelle question">
        <form action={saveFaq} className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3">
            <div className="grid gap-2">
              <AdminLabel htmlFor="question.fr">Question (FR)</AdminLabel>
              <input id="question.fr" name="question.fr" required className={adminInputClass} />
            </div>
            <div className="grid gap-2">
              <AdminLabel htmlFor="answer.fr">Réponse (FR)</AdminLabel>
              <textarea id="answer.fr" name="answer.fr" rows={4} required className={`${adminInputClass} resize-y`} />
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <AdminLabel htmlFor="question.en">Question (EN)</AdminLabel>
              <input id="question.en" name="question.en" className={adminInputClass} />
            </div>
            <div className="grid gap-2">
              <AdminLabel htmlFor="answer.en">Réponse (EN)</AdminLabel>
              <textarea id="answer.en" name="answer.en" rows={4} className={`${adminInputClass} resize-y`} />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3 lg:col-span-2">
            <div className="grid gap-2">
              <AdminLabel htmlFor="category">Catégorie</AdminLabel>
              <select id="category" name="category" defaultValue="service" className={adminInputClass}>
                {CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid w-24 gap-2">
              <AdminLabel htmlFor="sortOrder">Ordre</AdminLabel>
              <input
                id="sortOrder"
                name="sortOrder"
                type="number"
                defaultValue={items.length + 1}
                className={adminInputClass}
              />
            </div>

            <label className="flex items-center gap-2 pb-2 text-[0.8125rem] text-graphite">
              <input type="checkbox" name="isPublished" defaultChecked className="h-4 w-4 accent-champagne-deep" />
              Publiée
            </label>

            <button
              type="submit"
              className="ms-auto rounded-sm bg-ink px-4 py-2.5 text-[0.875rem] font-medium text-paper transition-fast hover:bg-ink-soft"
            >
              Ajouter
            </button>
          </div>
        </form>
      </Panel>

      <Panel title={`${items.length} question(s)`} className="!p-0">
        {items.length === 0 ? (
          <EmptyRow>{t("admin.noEntries")}</EmptyRow>
        ) : (
          <ul>
            {items.map((item) => {
              const fr = item.translations.fr;
              const en = item.translations.en;

              return (
                <li key={item.id} className="border-b border-line/60 last:border-0">
                  <details className="group">
                    <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 transition-fast hover:bg-cream">
                      <span className="min-w-0">
                        <span className="block truncate text-[0.875rem] text-ink">
                          {fr?.question ?? en?.question ?? "(sans traduction)"}
                        </span>
                        <span className="block text-[0.75rem] text-muted">
                          {item.category} · ordre {item.sortOrder}
                          {item.isPublished ? "" : " · non publiée"}
                        </span>
                      </span>
                      {!item.isPublished ? (
                        <span className="shrink-0 rounded-[3px] bg-sand px-1.5 py-0.5 text-[0.6875rem] text-muted">
                          brouillon
                        </span>
                      ) : null}
                    </summary>

                    <form action={saveFaq} className="grid gap-4 border-t border-line/60 bg-cream/40 p-4 lg:grid-cols-2">
                      <input type="hidden" name="id" value={item.id} />

                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <AdminLabel htmlFor={`q-fr-${item.id}`}>Question (FR)</AdminLabel>
                          <input
                            id={`q-fr-${item.id}`}
                            name="question.fr"
                            defaultValue={fr?.question ?? ""}
                            className={adminInputClass}
                          />
                        </div>
                        <div className="grid gap-2">
                          <AdminLabel htmlFor={`a-fr-${item.id}`}>Réponse (FR)</AdminLabel>
                          <textarea
                            id={`a-fr-${item.id}`}
                            name="answer.fr"
                            rows={5}
                            defaultValue={fr?.answer ?? ""}
                            className={`${adminInputClass} resize-y`}
                          />
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <AdminLabel htmlFor={`q-en-${item.id}`}>Question (EN)</AdminLabel>
                          <input
                            id={`q-en-${item.id}`}
                            name="question.en"
                            defaultValue={en?.question ?? ""}
                            className={adminInputClass}
                          />
                        </div>
                        <div className="grid gap-2">
                          <AdminLabel htmlFor={`a-en-${item.id}`}>Réponse (EN)</AdminLabel>
                          <textarea
                            id={`a-en-${item.id}`}
                            name="answer.en"
                            rows={5}
                            defaultValue={en?.answer ?? ""}
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

                    <form action={deleteFaq} className="flex justify-end px-4 pb-3">
                      <input type="hidden" name="id" value={item.id} />
                      <ConfirmButton
                        label={t("admin.delete")}
                        confirm="Supprimer cette question ?"
                        variant="danger"
                        className="!px-3 !py-1.5 !text-[0.75rem]"
                      />
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
