import type { User } from "@/server/db/schema";
import { createTranslator } from "@/lib/i18n";
import { formatShortDate } from "@/lib/utils";
import { site } from "@/config/site";
import { DetailRow, Panel } from "@/components/admin/ui";
import { ContactActions } from "./contact-actions";
import { AddressCopy } from "./address-copy";

/**
 * Fiche client.
 *
 * Les actions de contact sont au premier niveau : appeler, écrire, envoyer un
 * message WhatsApp. Au téléphone avec un client, c'est tout ce qu'on a le
 * temps de faire.
 */
export function ClientTab({
  customer,
  client,
}: {
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    line1?: string;
    line2?: string;
    city?: string;
    governorate?: string;
    postalCode?: string;
  };
  client: User | null;
}) {
  const t = createTranslator("fr");
  const name = `${customer.firstName} ${customer.lastName}`.trim() || "—";

  const address = [
    customer.line1,
    customer.line2,
    [customer.postalCode, customer.city].filter(Boolean).join(" "),
    customer.governorate,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid gap-4">
      <Panel title={t("admin.clientInfo")}>
        <div className="grid gap-4">
          <div>
            <p className="text-[1.0625rem] text-ink">{name}</p>
            <p className="mt-1 text-[0.875rem] text-stone">{customer.email}</p>
            <p className="text-[0.875rem] text-stone" dir="ltr">
              {customer.phone}
            </p>
          </div>

          <ContactActions
            email={customer.email}
            phone={customer.phone}
            whatsapp={site.whatsapp}
            labels={{
              call: t("admin.callClient"),
              email: t("admin.emailClient"),
              whatsapp: t("admin.whatsappClient"),
            }}
          />
        </div>
      </Panel>

      {address ? (
        <Panel
          title={t("admin.shipping")}
          action={<AddressCopy value={address} label={t("admin.copyAddress")} copied={t("admin.addressCopied")} />}
        >
          <p className="whitespace-pre-line text-[0.875rem] leading-relaxed text-graphite">
            {address}
          </p>
        </Panel>
      ) : null}

      {client ? (
        <Panel title={t("admin.preferences")}>
          <dl>
            <DetailRow label={t("admin.clientSince", { date: formatShortDate(client.createdAt, "fr") })}>
              {client.lastLoginAt ? formatShortDate(client.lastLoginAt, "fr") : "—"}
            </DetailRow>
            <DetailRow label={t("admin.localePreferred")}>
              {client.preferredLocale?.toUpperCase() ?? "FR"}
            </DetailRow>
            <DetailRow label={t("admin.notificationsEmail")}>
              {client.notifyEmail ? t("admin.on") : t("admin.off")}
            </DetailRow>
          </dl>
        </Panel>
      ) : (
        <Panel>
          <p className="text-[0.875rem] text-muted">
            Commande passée sans compte. Le client retrouvera ses photos avec un lien
            d’accès, ou en se connectant avec cette adresse email.
          </p>
        </Panel>
      )}
    </div>
  );
}
