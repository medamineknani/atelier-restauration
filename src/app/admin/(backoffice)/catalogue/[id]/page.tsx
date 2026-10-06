import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslator } from "@/lib/i18n";
import { formatDateTime, priceLabel } from "@/lib/utils";
import { adminProduct } from "@/server/services/admin";
import { saveProduct } from "@/server/actions/admin";
import { AdminLabel, DetailRow, Panel, adminInputClass } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PriceGuard } from "./price-guard";

export const dynamic = "force-dynamic";

const LOCALES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
] as const;

/**
 * Édition d'un produit.
 *
 * Deux langues côte à côte plutôt qu'un sélecteur : le back-office est
 * consulté par une ou deux personnes, et voir les deux versions en même
 * temps évite d'oublier la traduction.
 */
export default async function AdminProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { id } = await params;
  const { ok } = await searchParams;
  const t = createTranslator("fr");

  const isNew = id === "nouveau";
  const data = isNew ? null : await adminProduct(id);
  if (!isNew && !data) notFound();

  const product = data?.product;
  const translations = new Map((data?.translations ?? []).map((row) => [row.locale, row]));

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin/catalogue"
          className="text-[0.8125rem] text-stone underline underline-offset-4 hover:text-ink"
        >
          {t("admin.catalogTitle")}
        </Link>
        <h1 className="mt-4 font-display text-[1.5rem] text-ink">
          {product ? (translations.get("fr")?.name ?? product.slug) : t("admin.newProduct")}
        </h1>
      </div>

      {ok ? (
        <p role="status" className="rounded-md border border-success/30 bg-success/5 px-4 py-3 text-[0.875rem] text-success">
          {t("admin.saved")}
        </p>
      ) : null}

      <form action={saveProduct} className="grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
        {product ? <input type="hidden" name="id" value={product.id} /> : null}

        <div className="grid min-w-0 gap-4">
          {/* Identité, par langue */}
          <Panel title="Présentation">
            <div className="grid gap-6">
              {LOCALES.map((locale) => {
                const row = translations.get(locale.code);
                return (
                  <fieldset key={locale.code} className="grid gap-3">
                    <legend className="text-[0.75rem] uppercase tracking-[0.14em] text-stone">
                      {locale.label}
                    </legend>

                    <div className="grid gap-2">
                      <AdminLabel htmlFor={`name.${locale.code}`}>Nom</AdminLabel>
                      <input
                        id={`name.${locale.code}`}
                        name={`name.${locale.code}`}
                        defaultValue={row?.name ?? ""}
                        required={locale.code === "fr"}
                        className={adminInputClass}
                      />
                    </div>

                    <div className="grid gap-2">
                      <AdminLabel htmlFor={`tagline.${locale.code}`}>Accroche</AdminLabel>
                      <input
                        id={`tagline.${locale.code}`}
                        name={`tagline.${locale.code}`}
                        defaultValue={row?.tagline ?? ""}
                        className={adminInputClass}
                      />
                    </div>

                    <div className="grid gap-2">
                      <AdminLabel
                        htmlFor={`features.${locale.code}`}
                        hint="Une inclusion par ligne."
                      >
                        Inclusions
                      </AdminLabel>
                      <textarea
                        id={`features.${locale.code}`}
                        name={`features.${locale.code}`}
                        rows={5}
                        defaultValue={(row?.features ?? []).join("\n")}
                        className={`${adminInputClass} resize-y`}
                      />
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* Colonne technique */}
        <div className="grid gap-4">
          <Panel title={t("admin.price")}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <AdminLabel htmlFor="priceDinars" hint="En dinars. Millimes calculés à l’enregistrement.">
                  {t("admin.price")}
                </AdminLabel>
                <input
                  id="priceDinars"
                  name="priceDinars"
                  type="number"
                  step="0.001"
                  min="0"
                  required
                  defaultValue={product ? product.priceMillimes / 1000 : 0}
                  className={`${adminInputClass} tabular-nums`}
                />
              </div>

              {product ? (
                <PriceGuard
                  previousMillimes={product.priceMillimes}
                  inputId="priceDinars"
                  warning={t("admin.priorityChange")}
                />
              ) : null}

              <div className="grid gap-2">
                <AdminLabel htmlFor="reason" hint="Facultatif. Conservé dans l’historique des prix.">
                  Motif du changement
                </AdminLabel>
                <input id="reason" name="reason" className={adminInputClass} />
              </div>
            </div>
          </Panel>

          <Panel title="Technique">
            <div className="grid gap-3">
              <div className="grid gap-2">
                <AdminLabel htmlFor="slug">Identifiant</AdminLabel>
                <input
                  id="slug"
                  name="slug"
                  required
                  defaultValue={product?.slug ?? ""}
                  className={adminInputClass}
                  placeholder="pack-premium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <AdminLabel htmlFor="kind">Nature</AdminLabel>
                  <select
                    id="kind"
                    name="kind"
                    defaultValue={product?.kind ?? "pack"}
                    className={adminInputClass}
                  >
                    <option value="pack">Pack</option>
                    <option value="extra">Option</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <AdminLabel htmlFor="family">Famille</AdminLabel>
                  <select
                    id="family"
                    name="family"
                    defaultValue={product?.family ?? "digital"}
                    className={adminInputClass}
                  >
                    <option value="digital">Numérique</option>
                    <option value="photobook">Photobook</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <AdminLabel htmlFor="photosIncluded">Photos incluses</AdminLabel>
                  <input
                    id="photosIncluded"
                    name="photosIncluded"
                    type="number"
                    min="0"
                    defaultValue={product?.photosIncluded ?? ""}
                    className={adminInputClass}
                  />
                </div>

                <div className="grid gap-2">
                  <AdminLabel htmlFor="maxQuantity">Quantité max</AdminLabel>
                  <input
                    id="maxQuantity"
                    name="maxQuantity"
                    type="number"
                    min="0"
                    defaultValue={product?.maxQuantity ?? ""}
                    className={adminInputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <AdminLabel htmlFor="turnaroundDaysMin">Délai min (j)</AdminLabel>
                  <input
                    id="turnaroundDaysMin"
                    name="turnaroundDaysMin"
                    type="number"
                    min="0"
                    defaultValue={product?.turnaroundDaysMin ?? 5}
                    className={adminInputClass}
                  />
                </div>

                <div className="grid gap-2">
                  <AdminLabel htmlFor="turnaroundDaysMax">Délai max (j)</AdminLabel>
                  <input
                    id="turnaroundDaysMax"
                    name="turnaroundDaysMax"
                    type="number"
                    min="0"
                    defaultValue={product?.turnaroundDaysMax ?? 7}
                    className={adminInputClass}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <AdminLabel htmlFor="pricingMode">Mode de tarification</AdminLabel>
                <select
                  id="pricingMode"
                  name="pricingMode"
                  defaultValue={product?.pricingMode ?? "flat"}
                  className={adminInputClass}
                >
                  <option value="flat">Forfait</option>
                  <option value="per_photo">Par photo</option>
                  <option value="per_page">Par page</option>
                  <option value="per_copy">Par exemplaire</option>
                </select>
              </div>

              <div className="grid gap-2">
                <AdminLabel htmlFor="sortOrder">Ordre d’affichage</AdminLabel>
                <input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  defaultValue={product?.sortOrder ?? 0}
                  className={adminInputClass}
                />
              </div>

              <div className="grid gap-2 pt-1">
                {(
                  [
                    { name: "isActive", label: t("admin.active"), value: product?.isActive ?? true },
                    { name: "isFeatured", label: "Mis en avant", value: product?.isFeatured ?? false },
                    {
                      name: "requiresShipping",
                      label: "Nécessite une livraison",
                      value: product?.requiresShipping ?? false,
                    },
                  ] as const
                ).map((field) => (
                  <label key={field.name} className="flex items-center gap-2 text-[0.8125rem] text-graphite">
                    <input
                      type="checkbox"
                      name={field.name}
                      defaultChecked={field.value}
                      className="h-4 w-4 accent-champagne-deep"
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>
          </Panel>

          <div className="flex">
            <ConfirmButton
              label={t("admin.saveChanges")}
              confirm={
                product
                  ? "Enregistrer ? Le nouveau prix est visible immédiatement sur le site."
                  : "Créer ce produit ?"
              }
              className="w-full"
            />
          </div>
        </div>
      </form>

      {data && data.history.length > 0 ? (
        <Panel title="Historique des prix">
          <dl>
            {data.history.map((entry) => (
              <DetailRow
                key={entry.id}
                label={formatDateTime(entry.createdAt, "fr")}
              >
                {priceLabel(entry.oldPriceMillimes, "fr")} →{" "}
                <span className="text-ink">{priceLabel(entry.newPriceMillimes, "fr")}</span>
                {entry.reason ? <span className="ms-2 text-muted">· {entry.reason}</span> : null}
              </DetailRow>
            ))}
          </dl>
        </Panel>
      ) : null}
    </div>
  );
}
