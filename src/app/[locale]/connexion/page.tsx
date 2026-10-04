import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import { requestLoginLink, signInWithPasswordAction } from "@/server/actions/account";
import { getCurrentUser } from "@/lib/auth/session";
import { StepShell } from "@/components/shop/step-shell";
import { LoginForm } from "@/components/shop/login-form";

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
    path: "/connexion",
    title: t("account.signInTitle"),
    description: t("account.signInLede"),
    noIndex: true,
  });
}

/**
 * Connexion à l'espace client.
 *
 * Pas de création de compte séparée : le lien par email crée le compte à la
 * volée. Une étape de moins, et personne n'a à retenir un mot de passe pour
 * suivre une seule commande.
 */
export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ suivant?: string; erreur?: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const { suivant, erreur } = await searchParams;
  const t = createTranslator(locale);

  const user = await getCurrentUser();
  if (user) redirect(localePath(locale, suivant || "/compte"));

  return (
    <StepShell
      eyebrow={t("account.title")}
      title={t("account.signInTitle")}
      lede={t("account.signInLede")}
    >
      {erreur === "lien" ? (
        <p role="alert" className="mb-8 rounded-md border border-danger/30 bg-danger/[0.04] px-5 py-4 text-[0.9375rem] text-danger">
          {t("account.invalidLink")}
        </p>
      ) : null}

      <LoginForm
        magicLinkAction={requestLoginLink}
        passwordAction={signInWithPasswordAction}
        locale={locale}
        labels={{
          email: t("account.emailLabel"),
          sendLink: t("account.sendLink"),
          sending: t("common.saving"),
          sent: t("account.linkSent"),
          devLink: t("account.linkSentDev"),
          password: t("account.passwordLabel"),
          signIn: t("account.signInCta"),
          signingIn: t("common.saving"),
          or: t("account.or"),
          invalidEmail: t("common.invalidEmail"),
          invalidCredentials: t("account.invalidCredentials"),
          generic: t("common.somethingWentWrong"),
          guestTip: t("account.guestTip"),
        }}
      />
    </StepShell>
  );
}
