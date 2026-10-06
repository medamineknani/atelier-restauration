import Link from "next/link";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { ordersForUser } from "@/server/services/accounts";
import { Container, Section } from "@/components/ui/primitives";
import { OrderCard } from "@/components/shop/order-card";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const ACTIVE = new Set([
  "awaiting_payment",
  "received",
  "processing",
  "restoring",
  "checking",
  "on_hold",
]);
const READY = new Set(["ready", "shipped"]);

/**
 * Tableau de bord.
 *
 * Deux questions seulement : « où en sont mes photos en cours ? » et
 * « qu'est-ce qui est prêt ? ». Le reste est à un clic.
 */
export default async function AccountHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);

  const user = await getCurrentUser();
  if (!user) return null;

  const all = await ordersForUser(user.id);
  const active = all.filter((order) => ACTIVE.has(order.status));
  const ready = all.filter((order) => READY.has(order.status));

  return (
    <Section tone="cream" className="!pt-10">
      <Container>
        {all.length === 0 ? (
          <div className="max-w-xl">
            <p className="mt-4 max-w-xl body-lg text-graphite">{t("account.dashboardLede")}</p>
            
            <p className="body-lg text-graphite">{t("account.noOrders")}</p>
            <div className="mt-8">
              <ButtonLink href={localePath(locale, "/commande/service")} size="lg">
                {t("account.startOrder")}
              </ButtonLink>
            </div>
          </div>
        ) : (
          <div className="grid gap-12">
            {active.length > 0 ? (
              <section>
                <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-stone">
                  {t("account.activeOrders")}
                </h2>
                <div className="mt-6 grid gap-4">
                  {active.map((order) => (
                    <OrderCard key={order.id} order={order} locale={locale} />
                  ))}
                </div>
              </section>
            ) : null}

            {ready.length > 0 ? (
              <section>
                <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-stone">
                  {t("account.readyOrders")}
                </h2>
                <div className="mt-6 grid gap-4">
                  {ready.map((order) => (
                    <OrderCard key={order.id} order={order} locale={locale} />
                  ))}
                </div>
              </section>
            ) : null}

            {all.length > active.length + ready.length ? (
              <Link
                href={localePath(locale, "/compte/commandes")}
                className="text-[0.9375rem] text-graphite underline underline-offset-4 hover:text-ink"
              >
                {t("account.allOrders")}
              </Link>
            ) : null}
          </div>
        )}
      </Container>
    </Section>
  );
}
