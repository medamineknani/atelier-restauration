import type { ReactNode } from "react";
import { createTranslator, type Locale } from "@/lib/i18n";
import { OrderStepper, type WizardStep } from "@/components/shop/order-stepper";

/**
 * Habillage du tunnel de commande.
 *
 * Le tunnel est volontairement plus dépouillé que le site : pas de grande
 * image, pas de section émotionnelle. À ce stade le client a déjà décidé, il
 * veut avancer. Le fil d'Ariane reste collé en haut pour qu'il sache où il est.
 */
export default async function CommandeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);

  const labels: Record<WizardStep, string> = {
    service: t("checkout.steps.service"),
    pack: t("checkout.steps.pack"),
    extras: t("checkout.steps.extras"),
    photos: t("checkout.steps.photos"),
    coordonnees: t("checkout.steps.details"),
    recapitulatif: t("checkout.steps.payment"),
  };

  return (
    <div className="bg-cream">
      <OrderStepper labels={labels} base={locale === "fr" ? "" : `/${locale}`} />
      {children}
    </div>
  );
}
