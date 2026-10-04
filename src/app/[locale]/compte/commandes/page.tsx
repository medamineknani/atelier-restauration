import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { ordersForUser } from "@/server/services/accounts";
import { Container, Eyebrow, Section } from "@/components/ui/primitives";
import { OrderCard } from "@/components/shop/order-card";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);

  const user = await getCurrentUser();
  if (!user) return null;

  const orders = await ordersForUser(user.id);

  return (
    <Section tone="cream" className="!pt-10">
      <Container>
        {orders.length === 0 ? (
          <div className="max-w-xl">
            <Eyebrow>{t("account.myOrders")}</Eyebrow>
            <p className="mt-5 body-lg text-graphite">{t("account.noOrders")}</p>
            <div className="mt-8">
              <ButtonLink href={localePath(locale, "/commande/service")} size="lg">
                {t("account.startOrder")}
              </ButtonLink>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} locale={locale} />
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}
