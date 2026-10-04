import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/config/site";
import { getOrderByReference, getOrderWithItems, verifyGuestToken } from "@/server/services/orders";
import { listOriginals } from "@/server/services/assets";
import { getCurrentUser } from "@/lib/auth/session";
import { defaultPaymentDriver } from "@/lib/payments";
import { formatDate, priceLabel } from "@/lib/utils";
import type { Order } from "@/server/db/schema";
import { Container, Eyebrow, Section } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { CopyLink } from "@/components/shop/copy-link";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);
  return buildMetadata({
    locale,
    path: "/commande/confirmation",
    title: t("checkout.confirmationTitle"),
    noIndex: true,
    description: t("checkout.confirmationTitle"),
  });
}

/**
 * Confirmation de commande.
 *
 * Page publique protégée par le jeton invité : le lien envoyé par email suffit,
 * sans création de compte. Elle répond aux cinq questions que tout le monde se
 * pose après avoir payé : combien, quoi, quand, combien de photos, et où en
 * est-on.
 */
export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; reference: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { locale, reference } = (await params) as { locale: Locale; reference: string };
  const { t: token } = await searchParams;
  const t = createTranslator(locale);

  const order = await getOrderByReference(decodeURIComponent(reference));
  if (!order) notFound();

  const user = await getCurrentUser();
  const isOwner =
    (user && (order.userId === user.id || user.role === "admin" || user.role === "superadmin")) ||
    (token ? await verifyGuestToken(order, token) : false);

  if (!isOwner) notFound();

  const withItems = (await getOrderWithItems(order.id)) ?? { ...order, items: [] };
  const originals = await listOriginals(order.id);
  const pack = withItems.items.find((item) => item.itemType === "pack");

  const paymentRows = await paymentInstructions(order, locale);
  const trackingUrl = `${site.url}${localePath(locale, `/commande/suivi/${order.reference}`)}${
    token ? `?t=${token}` : ""
  }`;

  return (
    <>
      <Section tone="cream" className="!pb-10 !pt-14 md:!pt-20">
        <Container>
          <div className="max-w-3xl">
            <Eyebrow>{t("checkout.title")}</Eyebrow>
            <h1 className="heading-2 mt-6 text-ink">{t("checkout.confirmationTitle")}</h1>
            <p className="mt-6 body-lg text-graphite">
              {t("checkout.confirmationLede", {
                name: order.customerSnapshot?.firstName || "",
              })}
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="paper" className="!pt-6">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
            <div>
              {/* Récapitulatif */}
              <dl className="divide-y divide-line border-y border-line">
                <Row label={t("checkout.orderNumber")} value={order.reference} strong />
                <Row label={t("checkout.confirmationPack")} value={pack?.nameSnapshot ?? "—"} />
                <Row
                  label={t("checkout.confirmationPhotos")}
                  value={t("checkout.photosSent", {
                    count: originals.length,
                    s: originals.length > 1 ? "s" : "",
                  })}
                />
                <Row
                  label={t("checkout.confirmationAmount")}
                  value={priceLabel(order.totalMillimes, locale)}
                  strong
                />
                <Row
                  label={t("checkout.confirmationStatus")}
                  value={t(`status.${order.status}` as "status.draft")}
                />
                {order.estimatedReadyAt ? (
                  <Row
                    label={t("common.estimated")}
                    value={formatDate(order.estimatedReadyAt, locale)}
                  />
                ) : null}
              </dl>

              {/* Prochaine étape */}
              <div className="mt-12 rounded-md border border-champagne bg-champagne-soft/30 p-6 md:p-7">
                <h2 className="font-display text-[1.25rem] text-ink">
                  {t("checkout.confirmationNext")}
                </h2>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-graphite">
                  {t("checkout.nextStepManual")}
                </p>

                {paymentRows.length > 0 ? (
                  <dl className="mt-6 grid gap-3 border-t border-champagne/40 pt-6">
                    {paymentRows.map((row) => (
                      <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-3">
                        <dt className="text-[0.8125rem] uppercase tracking-[0.1em] text-stone">
                          {row.label}
                        </dt>
                        <dd className="text-[0.9375rem] tabular-nums text-ink">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                <p className="mt-6 text-[0.8125rem] leading-relaxed text-stone">
                  {t("checkout.manualReference")}
                </p>
              </div>

              {/* Photos envoyées */}
              {originals.length > 0 ? (
                <div className="mt-12">
                  <h2 className="font-display text-[1.25rem] text-ink">
                    {t("checkout.steps.photos")}
                  </h2>
                  <ul className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {originals.map((asset) => (
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
                </div>
              ) : null}
            </div>

            <div className="lg:sticky lg:top-24 lg:self-start">
              <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-stone">
                {t("account.guestAccess")}
              </h2>
              <p className="mt-3 text-[0.875rem] leading-relaxed text-graphite">
                {t("account.guestAccessLede")}
              </p>

              <div className="mt-5">
                <CopyLink
                  url={trackingUrl}
                  label={t("checkout.copyLink")}
                  copiedLabel={t("checkout.linkCopied")}
                />
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <ButtonLink href={trackingUrl} size="lg" fullWidth>
                  {t("checkout.trackOrder")}
                </ButtonLink>
                <ButtonLink href={localePath(locale, "/")} variant="ghost" size="md">
                  {t("checkout.backHome")}
                </ButtonLink>
              </div>

              <p className="mt-6 text-[0.8125rem] leading-relaxed text-muted">
                {t("checkout.secureNote")}{" "}
                <Link
                  href={localePath(locale, "/confidentialite")}
                  className="text-graphite underline underline-offset-2"
                >
                  {t("footer.privacy")}
                </Link>
              </p>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-4 py-4">
      <dt className="text-[0.8125rem] uppercase tracking-[0.1em] text-stone">{label}</dt>
      <dd
        className={
          strong
            ? "font-display text-[1.125rem] tabular-nums text-ink"
            : "text-[0.9375rem] text-graphite"
        }
      >
        {value}
      </dd>
    </div>
  );
}

/** Coordonnées de règlement fournies par le moyen de paiement retenu. */
async function paymentInstructions(
  order: Order,
  locale: Locale,
): Promise<{ label: string; value: string }[]> {
  try {
    const driver = defaultPaymentDriver();
    const result = await driver.start({
      order,
      locale,
      returnUrl: `${site.url}${localePath(locale, `/commande/suivi/${order.reference}`)}`,
    });
    if (result.kind !== "instructions") return [];
    const { createTranslator } = await import("@/lib/i18n");
    const t = createTranslator(locale);
    return result.instructions.rows
      .filter((row) => row.value && row.value !== "—")
      .map((row) => ({ label: t(row.labelKey), value: row.value }));
  } catch {
    return [];
  }
}
