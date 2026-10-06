import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, and } from "drizzle-orm";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import { db } from "@/server/db";
import { orderNotes } from "@/server/db/schema";
import { getOrderByReference, getStatusTimeline } from "@/server/services/orders";
import { listOriginals, listRestored } from "@/server/services/assets";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyGuestToken } from "@/server/services/orders";
import { formatDate, formatDateTime, priceLabel } from "@/lib/utils";
import { Container, Eyebrow, Section } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}): Promise<Metadata> {
  const { locale, reference } = (await params) as { locale: Locale; reference: string };
  const t = createTranslator(locale);
  return buildMetadata({
    locale,
    path: `/commande/suivi/${reference}`,
    title: `${t("account.orderDetail")} — ${reference}`,
    noIndex: true,
    description: t("account.orderDetail"),
  });
}

const TERMINAL = new Set(["completed", "cancelled", "refunded"]);

/**
 * Suivi de commande sans compte.
 *
 * Le lien envoyé par email suffit : c'est la seule page que la plupart des
 * clients visiteront après la commande. Elle doit donc répondre sans jargon à
 * « où en sont mes photos ? ».
 */
export default async function TrackingPage({
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

  const [timeline, originals, restored, notes] = await Promise.all([
    getStatusTimeline(order.id),
    listOriginals(order.id),
    listRestored(order.id),
    db
      .select()
      .from(orderNotes)
      .where(and(eq(orderNotes.orderId, order.id), eq(orderNotes.isInternal, false)))
      .orderBy(desc(orderNotes.createdAt)),
  ]);

  const statusKey = `status.${order.status}` as "status.draft";
  const descriptionKey = `status.descriptions.${order.status}` as "status.descriptions.received";

  return (
    <>
      <Section tone="cream" className="!pb-10 !pt-14 md:!pt-20">
        <Container>
          <div className="max-w-3xl">
            <Eyebrow>{order.reference}</Eyebrow>
            <h1 className="heading-2 mt-6 text-ink">{t("account.orderDetail")}</h1>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Badge tone={TERMINAL.has(order.status) ? "neutral" : "champagne"}>
                {t(statusKey)}
              </Badge>
              <span className="text-[0.9375rem] text-stone">
                {t("account.statusUpdated", { date: formatDate(order.updatedAt, locale) })}
              </span>
            </div>
            <p className="mt-6 body-lg text-graphite">{t(descriptionKey)}</p>
          </div>
        </Container>
      </Section>

      <Section tone="paper" className="!pt-8">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
            {/* Suivi */}
            <div>
              <h2 className="font-display text-[1.25rem] text-ink">{t("account.timeline")}</h2>

              <ol className="mt-8 border-s border-line ps-6">
                {timeline.map((event, index) => (
                  <li key={event.id} className="relative pb-8 last:pb-0">
                    <span
                      aria-hidden="true"
                      className={
                        index === timeline.length - 1
                          ? "absolute -start-[1.6875rem] top-1.5 inline-flex h-3 w-3 items-center justify-center rounded-full bg-champagne"
                          : "absolute -start-[1.625rem] top-2 inline-flex h-2 w-2 items-center justify-center rounded-full bg-line-strong"
                      }
                    />
                    <p className="font-display text-[1.0625rem] text-ink">
                      {t(`status.${event.toStatus}` as "status.draft")}
                    </p>
                    <p className="mt-1 text-[0.8125rem] text-muted">
                      {formatDateTime(event.createdAt, locale)}
                    </p>
                    {event.message ? (
                      <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-graphite">
                        {event.message}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>

              {notes.length > 0 ? (
                <div className="mt-12">
                  <h2 className="font-display text-[1.25rem] text-ink">{t("account.messages")}</h2>
                  <ul className="mt-6 grid gap-4">
                    {notes.map((note) => (
                      <li key={note.id} className="rounded-sm bg-cream p-5">
                        <p className="text-[0.9375rem] leading-relaxed text-graphite">
                          {note.body}
                        </p>
                        <p className="mt-3 text-[0.8125rem] text-muted">
                          {note.authorName} · {formatDate(note.createdAt, locale)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Colonne latérale */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-md border border-line bg-paper p-6">
                <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-stone">
                  {t("checkout.summaryTitle")}
                </h2>

                <dl className="mt-5 grid gap-3 text-[0.9375rem]">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-stone">{t("account.sentPhotos")}</dt>
                    <dd className="tabular-nums text-ink">{originals.length}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-stone">{t("account.results")}</dt>
                    <dd className="tabular-nums text-ink">{restored.length}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-stone">{t("common.total")}</dt>
                    <dd className="tabular-nums text-ink">
                      {priceLabel(order.totalMillimes, locale)}
                    </dd>
                  </div>
                  {order.estimatedReadyAt ? (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-stone">{t("common.estimated")}</dt>
                      <dd className="text-ink">{formatDate(order.estimatedReadyAt, locale)}</dd>
                    </div>
                  ) : null}
                  {order.shippingTracking ? (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-stone">{t("account.trackingNumber")}</dt>
                      <dd className="text-ink">{order.shippingTracking}</dd>
                    </div>
                  ) : null}
                </dl>

                {order.status === "awaiting_payment" ? (
                  <p className="mt-6 border-t border-line pt-5 text-[0.8125rem] leading-relaxed text-stone">
                    {t("checkout.payLaterNote")}
                  </p>
                ) : null}
              </div>

              {restored.length > 0 ? (
                <div className="mt-5 rounded-md border border-champagne bg-champagne-soft/30 p-6">
                  <h2 className="font-display text-[1.0625rem] text-ink">
                    {t("account.results")}
                  </h2>
                  <ul className="mt-4 grid grid-cols-3 gap-2">
                    {restored.slice(0, 9).map((asset) => (
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
                  <p className="mt-4 text-[0.8125rem] leading-relaxed text-stone">
                    {t("account.downloadResults")}
                  </p>
                </div>
              ) : null}

              <p className="mt-6 text-[0.8125rem] leading-relaxed text-muted">
                {t("contact.lede")}{" "}
                <Link
                  href={localePath(locale, "/contact")}
                  className="text-graphite underline underline-offset-2"
                >
                  {t("nav.contact")}
                </Link>
              </p>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
