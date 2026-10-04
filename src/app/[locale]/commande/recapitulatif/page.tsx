import type { Metadata } from "next";
import Link from "next/link";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import { abandonDraft, confirmOrder } from "@/server/actions/checkout";
import { currentDraft } from "@/server/services/checkout-session";
import { listOriginals } from "@/server/services/assets";
import { isCodDriver, listPaymentDrivers } from "@/lib/payments";
import { orderRequiresShipping } from "@/server/services/orders";
import { getPaymentSettings } from "@/server/services/settings";
import { priceLabel } from "@/lib/utils";
import { StepShell } from "@/components/shop/step-shell";
import { OrderSummary } from "@/components/shop/order-summary";
import { SubmitButton } from "@/components/shop/submit-button";

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
    path: "/commande/recapitulatif",
    title: t("checkout.paymentTitle"),
    noIndex: true,
    description: t("checkout.paymentTitle"),
  });
}

/**
 * Étape 6 — récapitulatif et règlement.
 *
 * Dernière page avant l'engagement : tout est relisible d'un coup d'œil — les
 * photos envoyées, le pack, le montant, les coordonnées. Chaque bloc reste
 * modifiable d'un lien, parce qu'une commande confirmée par erreur coûte plus
 * cher à rattraper qu'un allers-retours de plus.
 */
const PAYMENT_ERRORS: Record<string, string> = {
  cod_unavailable: "checkout.codUnavailable",
  cod_over_limit: "checkout.codOverLimit",
};

export default async function RecapStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reglement?: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const query = await searchParams;
  const t = createTranslator(locale);

  const order = await currentDraft(locale);
  const originals = await listOriginals(order.id);
  const customer = order.customerSnapshot;

  // Le paiement à la livraison suppose un colis : sans expédition, il n'y a
  // rien contre quoi remettre l'argent.
  const requiresShipping = await orderRequiresShipping(order.id);
  const { codEnabled, codMaxMillimes: codMax } = await getPaymentSettings();
  const codOverLimit = codMax > 0 && order.totalMillimes > codMax;
  const codAllowed = codEnabled && requiresShipping && !codOverLimit;

  const drivers = listPaymentDrivers().filter(
    (driver) => !isCodDriver(driver) || codAllowed,
  );
  const codRefused = codEnabled && !codAllowed;

  return (
    <StepShell
      eyebrow={t("checkout.steps.payment")}
      title={t("checkout.paymentTitle")}
      aside={<OrderSummary locale={locale} order={order} />}
    >
      <div className="grid gap-10">
        {/* Photos */}
        <section>
          <header className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
            <h2 className="font-display text-[1.25rem] text-ink">{t("checkout.steps.photos")}</h2>
            <Link
              href={localePath(locale, "/commande/photos")}
              className="text-[0.875rem] text-stone underline underline-offset-4 hover:text-ink"
            >
              {t("common.edit")}
            </Link>
          </header>

          {originals.length === 0 ? (
            <p className="mt-5 text-[0.9375rem] text-muted">{t("checkout.noPhotosYet")}</p>
          ) : (
            <>
              <p className="mt-5 text-[0.9375rem] text-graphite">
                {t("checkout.photosSent", { count: originals.length, s: originals.length > 1 ? "s" : "" })}
              </p>
              <ul className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {originals.slice(0, 18).map((asset) => (
                  <li key={asset.id} className="overflow-hidden rounded-xs bg-sand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/files/${asset.id}?variant=thumb`}
                      alt={asset.originalFilename || "photo"}
                      className="aspect-square h-full w-full object-cover"
                      loading="lazy"
                    />
                  </li>
                ))}
              </ul>
              {originals.length > 18 ? (
                <p className="mt-3 text-[0.8125rem] text-muted">
                  + {originals.length - 18}
                </p>
              ) : null}
            </>
          )}
        </section>

        {/* Coordonnées */}
        <section>
          <header className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
            <h2 className="font-display text-[1.25rem] text-ink">{t("checkout.detailsTitle")}</h2>
            <Link
              href={localePath(locale, "/commande/coordonnees")}
              className="text-[0.875rem] text-stone underline underline-offset-4 hover:text-ink"
            >
              {t("common.edit")}
            </Link>
          </header>

          <dl className="mt-5 grid gap-3 text-[0.9375rem]">
            <Row label={`${customer.firstName} ${customer.lastName}`.trim() || "—"} value={customer.phone || "—"} />
            <Row label={customer.email || "—"} value="" />
            {customer.line1 ? (
              <Row
                label={[customer.line1, customer.line2].filter(Boolean).join(", ")}
                value={[customer.postalCode, customer.city, customer.governorate].filter(Boolean).join(" ")}
              />
            ) : null}
          </dl>

          {order.customerNotes ? (
            <p className="mt-5 rounded-sm bg-cream p-4 text-[0.875rem] leading-relaxed text-graphite">
              {order.customerNotes}
            </p>
          ) : null}
        </section>

        {/* Moyen de règlement */}
        <section>
          <h2 className="border-b border-line pb-3 font-display text-[1.25rem] text-ink">
            {t("checkout.paymentMethodTitle")}
          </h2>

          {query.reglement && PAYMENT_ERRORS[query.reglement] ? (
            <p className="mb-6 rounded-sm border border-danger/40 bg-danger/5 px-4 py-3 text-[0.875rem] text-ink">
              {t(
                PAYMENT_ERRORS[query.reglement] as "checkout.codUnavailable",
                codMax > 0 ? { max: priceLabel(codMax, locale) } : {},
              )}
            </p>
          ) : null}

          <form action={confirmOrder} className="mt-6">
            <input type="hidden" name="locale" value={locale} />

            <div className="grid gap-4">
              {drivers.map((driver, index) => (
                <label
                  key={driver.id}
                  className="flex cursor-pointer gap-4 rounded-md border border-line bg-paper p-5 transition-editorial hover:border-champagne has-[:checked]:border-champagne"
                >
                  <input
                    type="radio"
                    name="provider"
                    value={driver.id}
                    defaultChecked={index === 0}
                    className="mt-1 h-4 w-4 shrink-0 accent-champagne"
                  />
                  <span>
                    <span className="block font-display text-[1.0625rem] text-ink">
                      {t(driver.labelKey)}
                    </span>
                    <span className="mt-2 block text-[0.875rem] leading-relaxed text-stone">
                      {t(driver.descriptionKey)}
                    </span>
                    {isCodDriver(driver) && codMax > 0 ? (
                      <span className="mt-2 block text-[0.75rem] text-muted">
                        {t("checkout.codMaxNotice", { max: priceLabel(codMax, locale) })}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>

            {codRefused ? (
              <p className="mt-6 text-[0.8125rem] leading-relaxed text-muted">
                {codOverLimit
                  ? t("checkout.codMaxNotice", { max: priceLabel(codMax, locale) })
                  : t("checkout.codUnavailable")}
              </p>
            ) : null}

            <div className="mt-8 flex flex-col gap-5">
              <SubmitButton
                label={`${t("checkout.confirmCta")} — ${priceLabel(order.totalMillimes, locale)}`}
                pendingLabel={t("checkout.submitting")}
                size="lg"
                fullWidth
              />

              <p className="text-[0.8125rem] leading-relaxed text-muted">
                {t("checkout.legalNote")}{" "}
                <Link
                  href={localePath(locale, "/conditions-vente")}
                  className="text-graphite underline underline-offset-2"
                >
                  {t("footer.terms")}
                </Link>
                {" · "}
                <Link
                  href={localePath(locale, "/politique-confidentialite")}
                  className="text-graphite underline underline-offset-2"
                >
                  {t("footer.privacy")}
                </Link>
              </p>
            </div>
          </form>
        </section>

        <form action={abandonDraft}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="text-[0.875rem] text-stone underline underline-offset-4 transition-fast hover:text-danger"
          >
            {t("checkout.abandon")}
          </button>
        </form>
      </div>
    </StepShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <dt className="text-graphite">{label}</dt>
      {value ? <dd className="text-stone">{value}</dd> : null}
    </div>
  );
}
