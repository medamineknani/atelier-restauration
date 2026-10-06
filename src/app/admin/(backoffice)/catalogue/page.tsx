import Link from "next/link";
import { createTranslator } from "@/lib/i18n";
import { priceLabel } from "@/lib/utils";
import { adminListProducts } from "@/server/services/admin";
import { toggleProductActive } from "@/server/actions/admin";
import { EmptyRow, Panel } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = { pack: "Pack", extra: "Option" };
const FAMILY_LABEL: Record<string, string> = { digital: "Numérique", photobook: "Photobook" };

/**
 * Catalogue.
 *
 * Un prix se lit ici comme il apparaîtra au client — en dinars, pas en
 * millimes. La conversion n'appartient pas à la saisie : personne ne veut
 * compter des zéros en pleine journée.
 */
export default async function AdminCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const t = createTranslator("fr");
  const { erreur } = await searchParams;
  const items = await adminListProducts();

  const groups = [
    { key: "pack-digital", label: "Packs · numérique", rows: items.filter((p) => p.kind === "pack" && p.family === "digital") },
    { key: "pack-photobook", label: "Packs · photobook", rows: items.filter((p) => p.kind === "pack" && p.family === "photobook") },
    { key: "extra", label: "Options", rows: items.filter((p) => p.kind === "extra") },
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[1.5rem] text-ink">{t("admin.catalogTitle")}</h1>
        <Link
          href="/admin/catalogue/nouveau"
          className="rounded-sm bg-ink px-4 py-2 text-[0.8125rem] font-medium text-paper transition-fast hover:bg-ink-soft"
        >
          {t("admin.newProduct")}
        </Link>
      </div>

      {erreur === "permissions" ? (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-[0.875rem] text-danger">
          {t("admin.errorPermissions")}
        </p>
      ) : null}

      {items.length === 0 ? (
        <Panel>
          <EmptyRow>{t("admin.noEntries")}</EmptyRow>
        </Panel>
      ) : (
        groups.map((group) =>
          group.rows.length === 0 ? null : (
            <Panel key={group.key} title={group.label} className="!p-0">
              <div className="hidden grid-cols-[minmax(0,1.8fr)_110px_110px_90px_140px] gap-4 border-b border-line px-4 py-2.5 text-[0.6875rem] uppercase tracking-[0.12em] text-muted md:grid">
                <span>Produit</span>
                <span>{t("admin.kind")}</span>
                <span>{t("admin.price")}</span>
                <span>Ordre</span>
                <span>État</span>
              </div>

              {group.rows.map((product) => (
                <div
                  key={product.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line/60 px-4 py-3 last:border-0 md:grid-cols-[minmax(0,1.8fr)_110px_110px_90px_140px] md:gap-4"
                >
                  <Link
                    href={`/admin/catalogue/${product.id}`}
                    className="min-w-0 transition-fast hover:text-champagne-deep"
                  >
                    <span className="block truncate text-[0.875rem] text-ink">
                      {product.translations.fr?.name ?? product.slug}
                    </span>
                    <span className="block truncate font-mono text-[0.75rem] text-muted">
                      {product.slug}
                    </span>
                  </Link>

                  <span className="hidden text-[0.8125rem] text-stone md:block">
                    {KIND_LABEL[product.kind] ?? product.kind}
                    <span className="block text-[0.75rem] text-muted">
                      {FAMILY_LABEL[product.family] ?? product.family}
                    </span>
                  </span>

                  <span className="text-[0.875rem] tabular-nums text-ink">
                    {priceLabel(product.priceMillimes, "fr")}
                  </span>

                  <span className="hidden text-[0.8125rem] tabular-nums text-stone md:block">
                    {product.sortOrder}
                  </span>

                  <div className="flex items-center justify-end gap-2">
                    {product.isFeatured ? (
                      <span className="rounded-[3px] bg-champagne-soft px-1.5 py-0.5 text-[0.6875rem] text-champagne-deep">
                        vedette
                      </span>
                    ) : null}
                    <form action={toggleProductActive}>
                      <input type="hidden" name="id" value={product.id} />
                      <button
                        type="submit"
                        className={`rounded-[3px] px-2 py-1 text-[0.75rem] transition-fast ${
                          product.isActive
                            ? "bg-success/10 text-success hover:bg-success/15"
                            : "bg-sand text-muted hover:bg-line"
                        }`}
                      >
                        {product.isActive ? t("admin.active") : t("admin.inactive")}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </Panel>
          ),
        )
      )}
    </div>
  );
}
