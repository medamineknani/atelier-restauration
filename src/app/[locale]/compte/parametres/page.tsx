import { eq } from "drizzle-orm";
import { createTranslator, type Locale } from "@/lib/i18n";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteAccountAction, savePreferences } from "@/server/actions/account";
import { Container, Section } from "@/components/ui/primitives";
import { Field, TextInput } from "@/components/shop/fields";
import { SubmitButton } from "@/components/shop/submit-button";

export const dynamic = "force-dynamic";

/**
 * Paramètres du compte.
 *
 * Trois blocs, du plus anodin au plus engageant : identité, préférences,
 * suppression. Un même écran, parce que les retrouver est déjà la moitié du
 * travail quand on veut exercer un droit.
 */
export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ erreur?: string; ok?: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const { erreur, ok } = await searchParams;
  const t = createTranslator(locale);

  const session = await getCurrentUser();
  if (!session) return null;

  // Le profil complet n'est pas dans le cookie de session : on relit la ligne.
  const rows = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  const user = rows[0];
  if (!user) return null;

  const word = t("account.deleteConfirmWord");

  return (
    <Section tone="cream" className="!pt-10">
      <Container>
        <div className="grid max-w-2xl gap-14">
          {ok === "1" ? (
            <p role="status" className="rounded-md border border-success/30 bg-success/5 px-5 py-4 text-[0.9375rem] text-success">
              {t("account.saved")}
            </p>
          ) : null}

          {/* Identité & préférences */}
          <form action={savePreferences} className="grid gap-8">
            <input type="hidden" name="locale" value={locale} />

            <div>
              <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-stone">
                {t("account.personalInfo")}
              </h2>

              <div className="mt-6 grid gap-6">
                <Field label={t("account.emailLabel")} htmlFor="settings-email" hint={t("account.magicLinkOnly")}>
                  <TextInput
                    id="settings-email"
                    name="email"
                    type="email"
                    defaultValue={user.email}
                    disabled
                  />
                </Field>

                <Field label={t("common.fullName")} htmlFor="name">
                  <TextInput id="name" name="name" type="text" defaultValue={user.name ?? ""} />
                </Field>

                <Field label={t("checkout.phone")} htmlFor="phone">
                  <TextInput
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    defaultValue={user.phone ?? ""}
                  />
                </Field>
              </div>
            </div>

            <div>
              <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-stone">
                {t("account.preferences")}
              </h2>

              <div className="mt-6 grid gap-6">
                <Field label={t("account.language")} htmlFor="preferredLocale">
                  <select
                    id="preferredLocale"
                    name="preferredLocale"
                    defaultValue={user.preferredLocale ?? locale}
                    className="w-full rounded-sm border border-line bg-paper px-4 py-3 text-[0.9375rem] text-ink focus:border-champagne focus:outline-none"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </Field>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="notifyEmail"
                    defaultChecked={user.notifyEmail ?? true}
                    className="mt-1 h-4 w-4 shrink-0 accent-champagne-deep"
                  />
                  <span className="text-[0.9375rem] leading-relaxed text-graphite">
                    {t("account.notifications")}
                  </span>
                </label>
              </div>
            </div>

            <div className="flex">
              <SubmitButton label={t("account.save")} pendingLabel={t("common.saving")} />
            </div>
          </form>

          {/* Suppression */}
          <div className="rounded-md border border-danger/30 bg-danger/[0.03] p-6 md:p-8">
            <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-danger">
              {t("account.dangerZone")}
            </h2>

            <p className="mt-5 text-[0.9375rem] leading-relaxed text-graphite">
              {t("account.deleteAccountConfirm")}
            </p>

            {erreur === "confirmation" ? (
              <p role="alert" className="mt-5 text-[0.875rem] text-danger">
                {t("account.confirmationError")}
              </p>
            ) : null}

            <form action={deleteAccountAction} className="mt-8 grid gap-5">
              <input type="hidden" name="locale" value={locale} />

              <label
                htmlFor="confirmation"
                className="text-[0.8125rem] leading-relaxed text-stone"
              >
                {t("account.deleteConfirmHint", { word })}
              </label>
              <TextInput
                id="confirmation"
                name="confirmation"
                type="text"
                autoComplete="off"
                required
                className="max-w-[12rem] font-mono"
              />

              <div className="flex">
                <SubmitButton
                  label={t("account.deleteAccount")}
                  pendingLabel={t("common.saving")}
                  variant="secondary"
                  withArrow={false}
                />
              </div>
            </form>
          </div>
        </div>
      </Container>
    </Section>
  );
}
