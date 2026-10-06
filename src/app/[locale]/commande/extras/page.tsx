import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import { saveExtras } from "@/server/actions/checkout";
import { getExtrasForPack } from "@/server/services/catalog";
import { currentDraft } from "@/server/services/checkout-session";
import { StepShell } from "@/components/shop/step-shell";
import { OrderSummary } from "@/components/shop/order-summary";
import { ExtrasForm } from "@/components/shop/extras-form";

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
    path: "/commande/extras",
    title: t("checkout.extrasTitle"),
    description: t("checkout.extrasLede"),
    noIndex: true,
  });
}

/**
 * Étape 3 — les options.
 *
 * Sans pack, il n'y a rien à proposer : on renvoie à l'étape 2 plutôt que
 * d'afficher une liste vide.
 */
export default async function ExtrasStepPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);

  const order = await currentDraft(locale);
  const pack = order.items.find((item) => item.itemType === "pack");
  if (!pack?.productId) redirect(localePath(locale, "/commande/pack"));

  const extras = await getExtrasForPack(pack.productId, locale);

  const initial: Record<string, number> = {};
  for (const item of order.items) {
    if (item.itemType === "extra" && item.productId) initial[item.productId] = item.quantity;
  }

  if (extras.length === 0) redirect(localePath(locale, "/commande/photos"));

  return (
    <StepShell
      eyebrow={t("checkout.steps.extras")}
      title={t("checkout.extrasTitle")}
      lede={t("checkout.extrasLede")}
      aside={<OrderSummary locale={locale} order={order} />}
    >
      <ExtrasForm
        extras={extras.map((extra) => ({
          id: extra.id,
          name: extra.name,
          tagline: extra.tagline,
          priceMillimes: extra.priceMillimes,
          maxQuantity: extra.maxQuantity ?? 10,
          pricingMode: extra.pricingMode,
        }))}
        initial={initial}
        locale={locale}
        action={saveExtras}
        labels={{
          continue: t("common.continue"),
          skip: t("checkout.skipExtras"),
          saving: t("common.saving"),
          perPhoto: t("checkout.perPhoto"),
          quantity: t("common.quantity"),
        }}
      />
    </StepShell>
  );
}
