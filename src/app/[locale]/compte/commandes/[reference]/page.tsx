import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { db } from "@/server/db";
import { invoices } from "@/server/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrderWithItems, getStatusTimeline } from "@/server/services/orders";
import { listOriginals, listRestored } from "@/server/services/assets";
import { orderForUser, visibleMessages } from "@/server/services/accounts";
import { sendOrderMessage } from "@/server/actions/account";
import { Container, Eyebrow, Reveal, Section, Badge, Rule } from "@/components/ui/primitives";
import { StatusTimeline } from "@/components/shop/status-timeline";
import { OrderMessageForm } from "@/components/shop/order-message-form";
import { formatDate, formatDateTime, priceLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAID = new Set([
  "received",
  "processing",
  "restoring",
  "checking",
  "ready",
  "shipped",
  "completed",
]);

/**
 * Suivi d'une commande.
 *
 * Une page, cinq réponses : où en est-on, qu'ai-je envoyé, qu'ai-je reçu,
 * combien ai-je payé, comment joindre l'atelier.
 */
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const { locale, reference } = (await params) as { locale: Locale; reference: string };
  const t = createTranslator(locale);

  const user = await getCurrentUser();
  if (!user) return null;

  const order = await orderForUser(reference, user.id);
  if (!order) notFound();

  const [withItems, timeline, messages, originals, restored, invoiceRows] = await Promise.all([
    getOrderWithItems(order.id),
    getStatusTimeline(order.id),
    visibleMessages(order.id),
    listOriginals(order.id),
    listRestored(order.id),
    db
      .select()
      .from(invoices)
      .where(eq(invoices.orderId, order.id))
      .orderBy(desc(invoices.issuedAt))
      .limit(1),
  ]);

  const items = withItems?.items ?? [];
  // Date de fin de conservation : la plus lointaine annoncée par les fichiers.
  const retainUntil = restored.reduce<Date | null>((latest, asset) => {
    if (!asset.retainUntil) return latest;
    return !latest || asset.retainUntil > latest ? asset.retainUntil : latest;
  }, null);
  const invoice = invoiceRows[0] ?? null;
  const canInvoice = Boolean(invoice) || PAID.has(order.status);
  const estimatedReady = order.estimatedReadyAt;

  return (
    <Section tone="cream" className="!pt-10">
      <Container>
        <Link
          href={localePath(locale, "/compte/commandes")}
          className="text-[0.875rem] text-stone underline underline-offset-4 hover:text-ink"
        >
          {t("account.backToOrders")}
        </Link>

        <div className="mt-8 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <Eyebrow>{t("account.orderDetail")}</Eyebrow>
            <h2 className="heading-3 mt-3 text-ink">{order.reference}</h2>
          </div>
          <Badge tone={order.status === "completed" ? "neutral" : "champagne"}>
            {t(`status.${order.status}` as "status.draft")}
          </Badge>
        </div>

        <p className="mt-4 max-w-2xl body-lg text-graphite">
          {t(`status.descriptions.${order.status}` as "status.descriptions.received")}
        </p>

        {estimatedReady && !["completed", "cancelled", "refunded"].includes(order.status) ? (
          <p className="mt-3 text-[0.9375rem] text-stone">
            {t("order.estimatedReady", { date: formatDate(estimatedReady, locale) })}
          </p>
        ) : null}

        <Rule className="my-10" />

        <div className="grid gap-14 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
          {/* ------------------------------ Colonne principale ----------------------------- */}
          <div className="grid gap-14">
            <Reveal>
              <StatusTimeline
                steps={timeline.map((step) => ({
                  status: step.toStatus,
                  at: step.createdAt,
                  note: step.message ?? null,
                }))}
                locale={locale}
                title={t("account.timeline")}
              />
            </Reveal>

            {/* Photos confiées */}
            {originals.length > 0 ? (
              <section>
                <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-stone">
                  {t("account.sentPhotos")}
                </h2>
                <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {originals.map((asset) => (
                    <li key={asset.id} className="overflow-hidden rounded-[2px] bg-sand">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/files/${asset.id}?variant=thumb`}
                        alt={asset.originalFilename.replace(/\.[^.]+$/, "")}
                        width={480}
                        height={480}
                        loading="lazy"
                        decoding="async"
                        className="aspect-square w-full object-cover"
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Résultats */}
            <section>
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-stone">
                  {t("account.results")}
                </h2>
                {restored.length > 0 ? (
                  <a
                    href={`/api/compte/commandes/${order.reference}/resultats`}
                    className="text-[0.875rem] text-graphite underline underline-offset-4 hover:text-ink"
                  >
                    {t("account.downloadAllResults")}
                  </a>
                ) : null}
              </div>

              {restored.length > 0 ? (
                <>
                  <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {restored.map((asset) => (
                      <li key={asset.id} className="group">
                        <a
                          href={`/api/files/${asset.id}?download=1`}
                          className="block overflow-hidden rounded-[2px] bg-sand"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/files/${asset.id}?variant=thumb`}
                            alt={asset.originalFilename.replace(/\.[^.]+$/, "")}
                            width={480}
                            height={480}
                            loading="lazy"
                            decoding="async"
                            className="aspect-square w-full object-cover transition-editorial group-hover:opacity-90"
                          />
                        </a>
                        <p className="mt-2 truncate text-[0.8125rem] text-stone">
                          {asset.originalFilename}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {retainUntil ? (
                    <p className="mt-5 text-[0.8125rem] text-muted">
                      {t("account.resultsAvailableUntil", {
                        date: formatDate(retainUntil, locale),
                      })}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-stone">
                  {t("account.noResultsYet")}
                </p>
              )}
            </section>

            {/* Messages */}
            <section>
              <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-stone">
                {t("account.messages")}
              </h2>

              {messages.length > 0 ? (
                <ul className="mt-6 grid gap-5">
                  {messages.map((message) => (
                    <li key={message.id} className="rounded-md border border-line bg-paper p-5">
                      <p className="text-[0.8125rem] text-stone">
                        {message.authorName} · {formatDateTime(message.createdAt, locale)}
                      </p>
                      <p className="mt-3 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink">
                        {message.body}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 text-[0.9375rem] text-stone">{t("account.noMessages")}</p>
              )}

              <div className="mt-8">
                <OrderMessageForm
                  action={sendOrderMessage}
                  locale={locale}
                  reference={order.reference}
                  labels={{
                    send: t("account.sendMessage"),
                    sending: t("common.sending"),
                    placeholder: t("account.messagePlaceholder"),
                    sent: t("account.messageSent"),
                    error: t("account.emptyMessage"),
                  }}
                />
              </div>
            </section>
          </div>

          {/* -------------------------------- Colonne droite ------------------------------- */}
          <div className="grid gap-10">
            <section>
              <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-stone">
                {t("checkout.summaryTitle")}
              </h2>

              <dl className="mt-6 grid gap-3">
                <div className="flex items-baseline justify-between gap-4 text-[0.9375rem]">
                  <dt className="text-graphite">{t("account.orderDate", { date: "" }).trim()}</dt>
                  <dd className="text-stone">{formatDate(order.createdAt, locale)}</dd>
                </div>

                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-baseline justify-between gap-4 text-[0.9375rem]"
                  >
                    <dt className="text-graphite">
                      {item.nameSnapshot}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                    </dt>
                    <dd className="tabular-nums text-stone">
                      {priceLabel(item.totalMillimes, locale)}
                    </dd>
                  </div>
                ))}

                {order.shippingMillimes > 0 ? (
                  <div className="flex items-baseline justify-between gap-4 text-[0.9375rem]">
                    <dt className="text-graphite">{t("common.shipping")}</dt>
                    <dd className="tabular-nums text-stone">
                      {priceLabel(order.shippingMillimes, locale)}
                    </dd>
                  </div>
                ) : null}

                <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-4">
                  <dt className="text-[0.9375rem] font-medium text-ink">{t("common.total")}</dt>
                  <dd className="font-display text-[1.25rem] tabular-nums text-ink">
                    {priceLabel(order.totalMillimes, locale)}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-stone">
                {t("account.invoice")}
              </h2>

              {canInvoice ? (
                <a
                  href={`/api/compte/commandes/${order.reference}/facture`}
                  className="mt-6 inline-flex items-center gap-2 rounded-sm border border-line-strong px-5 py-2.5 text-[0.9375rem] text-ink transition-editorial hover:border-champagne hover:bg-paper"
                  target="_blank"
                  rel="noreferrer"
                >
                  {invoice
                    ? t("account.invoiceIssued", {
                        number: invoice.number,
                        date: formatDate(invoice.issuedAt, locale),
                      })
                    : t("account.invoice")}
                </a>
              ) : (
                <p className="mt-6 text-[0.9375rem] text-stone">{t("account.invoiceUnavailable")}</p>
              )}
            </section>

            {order.shippingCarrier || order.shippingTracking ? (
              <section>
                <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-stone">
                  {t("checkout.address")}
                </h2>
                <dl className="mt-6 grid gap-2 text-[0.9375rem]">
                  {order.shippingCarrier ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone">{t("account.carrier")}</dt>
                      <dd className="text-ink">{order.shippingCarrier}</dd>
                    </div>
                  ) : null}
                  {order.shippingTracking ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone">{t("account.trackingNumber")}</dt>
                      <dd className="text-ink" dir="ltr">
                        {order.shippingTracking}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            ) : null}
          </div>
        </div>
      </Container>
    </Section>
  );
}
