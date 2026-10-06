import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { signOutAction } from "@/server/actions/account";
import { AccountNav } from "@/components/shop/account-nav";
import { Container, Eyebrow, Section } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

/**
 * Espace client.
 *
 * L'accès est vérifié ici, une seule fois : chaque page du dossier hérite de
 * la protection. Une redirection conserve la page demandée pour y revenir
 * après connexion.
 */
export default async function AccountLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`${localePath(locale, "/connexion")}?suivant=/compte`);

  return (
    <div className="bg-cream">
      <Section tone="cream" className="!pb-0 !pt-10 md:!pt-14">
        <Container>
          <Eyebrow>{t("account.title")}</Eyebrow>
          {/* Sans nom connu, un simple « Bonjour » vaut mieux qu'un
              prénom deviné depuis l'adresse email. */}
          <h1 className="heading-2 mt-4 text-ink">
            {user.name
              ? t("account.dashboardTitle", { name: user.name })
              : t("account.dashboardTitleGuest")}
          </h1>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-4">
            <AccountNav
              locale={locale}
              items={[
                { href: localePath(locale, "/compte"), label: t("account.title") },
                {
                  href: localePath(locale, "/compte/commandes"),
                  label: t("account.myOrders"),
                },
                {
                  href: localePath(locale, "/compte/parametres"),
                  label: t("account.settings"),
                },
              ]}
            />

            <form action={signOutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="text-[0.875rem] text-stone underline underline-offset-4 transition-fast hover:text-ink"
              >
                {t("account.signOut")}
              </button>
            </form>
          </div>
        </Container>
      </Section>

      {children}
    </div>
  );
}
