import type { Metadata } from "next";
import { createTranslator, type Locale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import { choosePack } from "@/server/actions/checkout";
import { getPacks } from "@/server/services/catalog";
import { currentDraft } from "@/server/services/checkout-session";
import { StepShell } from "@/components/shop/step-shell";
import { OrderSummary } from "@/components/shop/order-summary";
import { Badge, CheckIcon } from "@/components/ui/primitives";
import { Price } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);
  return buildMetadata({
    locale,
    path: "/commande/pack",
    title: t("checkout.packTitle"),
    description: t("checkout.packLede"),
    noIndex: true,
  });
}

/**
 * Étape 2 — le pack.
 *
 * Le prix affiché vient de la base, jamais du code. Le nombre de photos peut
 * être dépassé : le surplus est facturé à la photo, comme indiqué sous le
 * compteur à l'étape suivante.
 */
export default async function PackStepPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);

  const order = await currentDraft(locale);
  const packs = await getPacks(order.kind === "photobook" ? "photobook" : "digital", locale);
  const selected = order.items.find((item) => item.itemType === "pack")?.productId ?? null;

  return (
    <StepShell
      eyebrow={t("checkout.steps.pack")}
      title={t("checkout.packTitle")}
      lede={t("checkout.packLede")}
      aside={<OrderSummary locale={locale} order={order} />}
    >
      <div className="grid gap-5">
        {packs.map((pack) => {
          const active = selected === pack.id;
          const photos = pack.photosIncluded ?? pack.photosMax ?? 0;

          return (
            <form key={pack.id} action={choosePack}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="pack" value={pack.slug} />
              <button
                type="submit"
                className={cn(
                  "flex w-full flex-col gap-6 rounded-md border bg-paper p-6 text-start transition-editorial hover:border-champagne hover:shadow-md focus-visible:border-champagne focus-visible:outline-none md:flex-row md:items-center md:justify-between md:gap-10 md:p-7",
                  active ? "border-champagne shadow-sm" : "border-line",
                )}
              >
                <span className="flex-1">
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="font-display text-[1.25rem] text-ink">{pack.name}</span>
                    {pack.isFeatured ? <Badge>{t("checkout.packBadge")}</Badge> : null}
                  </span>

                  {pack.tagline ? (
                    <span className="mt-2 block text-[0.9375rem] text-stone">{pack.tagline}</span>
                  ) : null}

                  <span className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                    {pack.features.slice(0, 4).map((feature) => (
                      <span
                        key={feature}
                        className="inline-flex items-center gap-2 text-[0.875rem] text-graphite"
                      >
                        <CheckIcon className="mt-0 h-3.5 w-3.5" />
                        {feature}
                      </span>
                    ))}
                  </span>

                  <span className="mt-4 block text-[0.8125rem] text-muted">
                    {photos > 0
                      ? `${photos} ${t("common.photos")}`
                      : `${pack.pagesIncluded ?? 0} ${t("common.pages")}`}
                    {" · "}
                    {t("common.daysRange", {
                      min: pack.turnaroundDaysMin,
                      max: pack.turnaroundDaysMax,
                    })}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-4">
                  <Price millimes={pack.priceMillimes} />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-fast",
                      active
                        ? "border-champagne bg-champagne text-ink"
                        : "border-line-strong text-stone",
                    )}
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 10h12M11 5.5 15.5 10 11 14.5" />
                    </svg>
                  </span>
                </span>
              </button>
            </form>
          );
        })}
      </div>

      <p className="mt-8 text-[0.8125rem] leading-relaxed text-muted">
        {t("checkout.payLaterNote")}
      </p>
    </StepShell>
  );
}
