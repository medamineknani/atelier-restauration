import type { Metadata } from "next";
import { createTranslator, type Locale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import { saveDetails } from "@/server/actions/checkout";
import { currentDraft } from "@/server/services/checkout-session";
import { StepShell } from "@/components/shop/step-shell";
import { OrderSummary } from "@/components/shop/order-summary";
import { DetailsForm } from "@/components/shop/details-form";

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
    path: "/commande/coordonnees",
    title: t("checkout.detailsTitle"),
    description: t("checkout.detailsLede"),
    noIndex: true,
  });
}

/**
 * Étape 5 — les coordonnées.
 *
 * L'adresse n'est demandée que si la commande doit être expédiée : un client
 * qui commande des fichiers numériques n'a aucune raison de la saisir.
 */
export default async function DetailsStepPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);

  const order = await currentDraft(locale);
  const pack = order.items.find((item) => item.itemType === "pack");
  const requiresShipping = pack?.meta?.requiresShipping === true;
  const customer = order.customerSnapshot;

  return (
    <StepShell
      eyebrow={t("checkout.steps.details")}
      title={t("checkout.detailsTitle")}
      lede={t("checkout.detailsLede")}
      aside={<OrderSummary locale={locale} order={order} />}
    >
      <DetailsForm
        action={saveDetails}
        locale={locale}
        requiresShipping={requiresShipping}
        defaults={{
          firstName: customer?.firstName ?? "",
          lastName: customer?.lastName ?? "",
          email: customer?.email ?? "",
          phone: customer?.phone ?? "",
          line1: customer?.line1 ?? "",
          line2: customer?.line2 ?? "",
          city: customer?.city ?? "",
          governorate: customer?.governorate ?? "",
          postalCode: customer?.postalCode ?? "",
          notes: order.customerNotes ?? "",
          newsletter: false,
        }}
        labels={{
          identity: t("checkout.detailsTitle"),
          identityHint: t("checkout.detailsLede"),
          shipping: t("checkout.addressTitle"),
          shippingHint: t("checkout.addressLede"),
          firstName: t("checkout.firstName"),
          lastName: t("checkout.lastName"),
          email: t("checkout.email"),
          phone: t("checkout.phone"),
          address: t("checkout.address"),
          address2: `${t("checkout.address2")} (${t("common.optional")})`,
          city: t("checkout.city"),
          governorate: t("checkout.governorate"),
          postalCode: `${t("checkout.postalCode")} (${t("common.optional")})`,
          notes: `${t("checkout.notes")} (${t("common.optional")})`,
          notesPlaceholder: t("checkout.notesPlaceholder"),
          newsletter: t("checkout.newsletter"),
          privacyNote: t("checkout.privacyNote"),
          submit: t("common.continue"),
          saving: t("common.saving"),
          requiredField: t("common.requiredField"),
          invalidEmail: t("common.invalidEmail"),
          invalidPhone: t("common.invalidPhone"),
          genericError: t("common.somethingWentWrong"),
        }}
      />
    </StepShell>
  );
}
