import Link from "next/link";
import { notFound } from "next/navigation";
import type { OrderStatusCode } from "@/server/db/schema";
import { createTranslator } from "@/lib/i18n";
import { formatDateTime, formatShortDate, priceLabel } from "@/lib/utils";
import { ALLOWED_TRANSITIONS } from "@/server/services/orders";
import { orderDetail } from "@/server/services/admin";
import { changeOrderStatus } from "@/server/actions/admin";
import { DetailRow, Panel } from "@/components/admin/ui";
import { StatusPill } from "@/components/admin/status-pill";
import { StatusForm } from "@/components/admin/status-form";
import { OrderPipeline } from "./pipeline";
import { PhotosTab } from "./photos-tab";
import { ResultsTab } from "./results-tab";
import { ClientTab } from "./client-tab";
import { NotesTab } from "./notes-tab";
import { InvoiceTab } from "./invoice-tab";
import { JournalTab } from "./journal-tab";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "photos", label: "Photos reçues" },
  { id: "resultats", label: "Résultats" },
  { id: "client", label: "Client" },
  { id: "notes", label: "Notes & messages" },
  { id: "facture", label: "Facture" },
  { id: "journal", label: "Journal" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const PIPELINE_STEPS: { status: OrderStatusCode; label: string }[] = [
  { status: "received", label: "Reçue" },
  { status: "processing", label: "Traitement" },
  { status: "restoring", label: "Restauration" },
  { status: "checking", label: "Vérification" },
  { status: "ready", label: "Prête" },
  { status: "shipped", label: "Expédiée" },
  { status: "completed", label: "Terminée" },
];

const NOTICES: Record<string, string> = {
  statut: "Statut mis à jour.",
  note: "Note ajoutée.",
  publie: "Résultats publiés — le client a été prévenu par email.",
  depublie: "Résultats dépubliés.",
  fichier: "Fichier supprimé.",
  facture: "Facture régénérée.",
  encaisse: "Encaissement constaté — la commande est marquée payée.",
  impaye: "Encaissement manqué — la commande repart en attente de règlement.",
};

const ERRORS: Record<string, string> = {
  transition: "Cette transition de statut n’est pas autorisée.",
  aucunResultat: "Aucun fichier restauré à publier.",
  permissions: "Vos droits ne permettent pas cette action.",
};

/**
 * Écran de commande.
 *
 * Le plus utilisé du back-office, et de loin : tout ce qui concerne une
 * commande est réuni ici. Un opérateur ne doit jamais avoir à changer de page
 * pour répondre à un client.
 */
export default async function AdminOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string; ok?: string; erreur?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const t = createTranslator("fr");

  const data = await orderDetail(id);
  if (!data) notFound();

  const { order, items, events, notes, originals, restored, invoice, payments, audit, client, isLate, lateDays } =
    data;
  const customer = order.customerSnapshot;

  const tab: TabId =
    (TABS.find((entry) => entry.id === query.onglet)?.id as TabId | undefined) ?? "photos";

  const allowed = ALLOWED_TRANSITIONS[order.status].map((status) => ({
    value: status,
    label: t(`status.${status}` as "status.received"),
  }));

  const templates: Partial<Record<OrderStatusCode, string>> = {};
  for (const option of allowed) {
    templates[option.value] = t(`admin.templates.${option.value}` as "admin.templates.received");
  }

  const pack = items.find((item) => item.itemType === "pack");

  const href = (nextTab: TabId) => `/admin/commandes/${id}?onglet=${nextTab}`;

  return (
    <div className="grid gap-6">
      {/* En-tête */}
      <div>
        <Link
          href="/admin/commandes"
          className="text-[0.8125rem] text-stone underline underline-offset-4 hover:text-ink"
        >
          {t("admin.back")}
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-[1.25rem] text-ink">{order.reference}</h1>
              <StatusPill status={order.status} />
              {isLate ? (
                <span className="rounded-[3px] bg-warning/12 px-2 py-0.5 text-[0.75rem] text-warning">
                  {t("admin.overdueBy", { days: lateDays })}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-[0.875rem] text-stone">
              {order.kind === "photobook" ? t("admin.kindPhotobook") : t("admin.kindDigital")}
              {pack ? ` · ${pack.nameSnapshot}` : ""}
              {` · ${priceLabel(order.totalMillimes, "fr")} · ${order.photosCount} photo(s)`}
            </p>

            <p className="mt-1 text-[0.8125rem] text-muted">
              {t("admin.createdOn", { date: formatDateTime(order.createdAt, "fr") })}
              {order.paidAt
                ? ` · ${t("admin.paidOn", { date: formatShortDate(order.paidAt, "fr") })}`
                : ""}
              {order.estimatedReadyAt
                ? ` · ${t("admin.estimatedOn", { date: formatShortDate(order.estimatedReadyAt, "fr") })}`
                : ""}
            </p>
          </div>

          {order.guestEmail ? (
            <a
              href={`/api/compte/commandes/${order.reference}/facture`}
              className="hidden text-[0.8125rem] text-graphite underline underline-offset-4 hover:text-ink lg:block"
            >
              {t("admin.exitToSite")}
            </a>
          ) : null}
        </div>
      </div>

      {query.ok ? (
        <p role="status" className="rounded-md border border-success/30 bg-success/5 px-4 py-3 text-[0.875rem] text-success">
          {NOTICES[query.ok] ?? "Opération effectuée."}
        </p>
      ) : null}
      {query.erreur ? (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-[0.875rem] text-danger">
          {ERRORS[query.erreur] ?? "Une erreur est survenue."}
        </p>
      ) : null}

      {/* Avancement */}
      <Panel title={t("admin.statusPipeline")}>
        <OrderPipeline steps={PIPELINE_STEPS} events={events} current={order.status} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        {/* Onglets */}
        <div className="grid min-w-0 gap-4">
          <nav
            aria-label={t("admin.tabs")}
            className="-mx-6 flex gap-1 overflow-x-auto border-b border-line px-6 no-scrollbar lg:mx-0 lg:px-0"
          >
            {TABS.map((entry) => (
              <Link
                key={entry.id}
                href={href(entry.id)}
                aria-current={tab === entry.id ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[0.875rem] transition-fast ${
                  tab === entry.id
                    ? "border-champagne font-medium text-ink"
                    : "border-transparent text-stone hover:text-ink"
                }`}
              >
                {entry.label}
              </Link>
            ))}
          </nav>

          {tab === "photos" ? (
            <PhotosTab orderId={order.id} assets={originals} quota={order.photosQuota} />
          ) : null}

          {tab === "resultats" ? (
            <ResultsTab
              orderId={order.id}
              restored={restored}
              originals={originals}
              status={order.status}
            />
          ) : null}

          {tab === "client" ? <ClientTab customer={customer} client={client} /> : null}

          {tab === "notes" ? <NotesTab orderId={order.id} notes={notes} /> : null}

          {tab === "facture" ? (
            <InvoiceTab
              orderId={order.id}
              reference={order.reference}
              invoice={invoice}
              payments={payments}
              totalMillimes={order.totalMillimes}
              status={order.status}
            />
          ) : null}

          {tab === "journal" ? <JournalTab entries={audit} /> : null}
        </div>

        {/* Colonne d'action : toujours à portée */}
        <div className="grid gap-4 lg:sticky lg:top-20">
          <Panel title={t("admin.changeStatus")}>
            <StatusForm
              action={changeOrderStatus}
              orderId={order.id}
              allowed={allowed}
              templates={templates}
              labels={{
                title: t("admin.changeStatus"),
                newStatus: t("admin.newStatus"),
                message: t("admin.messageToClient"),
                notify: t("admin.notifyClient"),
                carrier: t("admin.carrier"),
                tracking: t("admin.trackingNumber"),
                submit: t("admin.confirmStatus"),
                markShipped: t("admin.markShipped"),
                empty: "Aucune transition possible depuis ce statut.",
              }}
            />
          </Panel>

          <Panel title="Récapitulatif">
            <dl>
              {items.map((item) => (
                <DetailRow
                  key={item.id}
                  label={`${item.nameSnapshot}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`}
                >
                  {priceLabel(item.totalMillimes, "fr")}
                </DetailRow>
              ))}
              {order.shippingMillimes > 0 ? (
                <DetailRow label={t("admin.shipping")}>
                  {priceLabel(order.shippingMillimes, "fr")}
                </DetailRow>
              ) : null}
              {order.discountMillimes > 0 ? (
                <DetailRow label={t("common.discount")}>
                  −{priceLabel(order.discountMillimes, "fr")}
                </DetailRow>
              ) : null}
              <DetailRow label={t("common.total")}>
                <span className="font-medium">{priceLabel(order.totalMillimes, "fr")}</span>
              </DetailRow>
            </dl>

            {order.shippingCarrier || order.shippingTracking ? (
              <dl className="mt-4 border-t border-line pt-3">
                {order.shippingCarrier ? (
                  <DetailRow label={t("admin.carrier")}>{order.shippingCarrier}</DetailRow>
                ) : null}
                {order.shippingTracking ? (
                  <DetailRow label={t("admin.trackingNumber")}>
                    <span dir="ltr">{order.shippingTracking}</span>
                  </DetailRow>
                ) : null}
              </dl>
            ) : null}
          </Panel>

          {order.customerNotes ? (
            <Panel title="Mot du client">
              <p className="whitespace-pre-line text-[0.875rem] leading-relaxed text-graphite">
                {order.customerNotes}
              </p>
            </Panel>
          ) : null}
        </div>
      </div>

    </div>
  );
}

export type { TabId };
