"use client";

import { useActionState, useState } from "react";
import { Field, TextInput } from "@/components/shop/fields";
import { SubmitButton } from "@/components/shop/submit-button";
import type { AuthState } from "@/server/actions/account";

/**
 * Connexion à l'espace client.
 *
 * Le lien par email est la voie normale : un client qui vient de confier ses
 * photos ne veut pas inventer un mot de passe. Le mot de passe reste
 * disponible pour ceux qui en ont défini un, sans être mis en avant.
 */
export function LoginForm({
  magicLinkAction,
  passwordAction,
  locale,
  labels,
}: {
  magicLinkAction: (state: AuthState, formData: FormData) => Promise<AuthState>;
  passwordAction: (state: AuthState, formData: FormData) => Promise<AuthState>;
  locale: string;
  labels: {
    email: string;
    sendLink: string;
    sending: string;
    sent: string;
    devLink: string;
    password: string;
    signIn: string;
    signingIn: string;
    or: string;
    invalidEmail: string;
    invalidCredentials: string;
    generic: string;
    guestTip: string;
  };
}) {
  const [linkState, linkAction] = useActionState<AuthState, FormData>(magicLinkAction, { ok: false });
  const [passwordState, passwordFormAction] = useActionState<AuthState, FormData>(
    passwordAction,
    { ok: false },
  );
  const [withPassword, setWithPassword] = useState(false);

  const message = (code?: string) =>
    code === "invalidEmail"
      ? labels.invalidEmail
      : code === "invalidCredentials"
        ? labels.invalidCredentials
        : code
          ? labels.generic
          : undefined;

  if (linkState.sent) {
    return (
      <div className="rounded-md border border-champagne bg-champagne-soft/30 p-6">
        <p className="text-[0.9375rem] leading-relaxed text-ink">{labels.sent}</p>
        {linkState.devLink ? (
          <p className="mt-5 text-[0.8125rem] text-stone">
            {labels.devLink}
            <br />
            <a
              href={linkState.devLink}
              className="mt-1 inline-block break-all text-graphite underline underline-offset-2"
              dir="ltr"
            >
              {linkState.devLink}
            </a>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <form action={linkAction} className="grid gap-6">
        <input type="hidden" name="locale" value={locale} />

        <Field label={labels.email} htmlFor="email" error={message(linkState.error)}>
          <TextInput
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            error={!!linkState.error}
          />
        </Field>

        <SubmitButton label={labels.sendLink} pendingLabel={labels.sending} size="lg" fullWidth />
      </form>

      <p className="mt-6 text-[0.8125rem] leading-relaxed text-muted">{labels.guestTip}</p>

      <div className="my-8 flex items-center gap-4">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[0.8125rem] uppercase tracking-[0.14em] text-stone">{labels.or}</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      {withPassword ? (
        <form action={passwordFormAction} className="grid gap-6">
          <input type="hidden" name="locale" value={locale} />

          <Field
            label={labels.email}
            htmlFor="password-email"
            error={message(passwordState.error)}
          >
            <TextInput
              id="password-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              error={!!passwordState.error}
            />
          </Field>

          <Field label={labels.password} htmlFor="password">
            <TextInput
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              error={!!passwordState.error}
            />
          </Field>

          <SubmitButton label={labels.signIn} pendingLabel={labels.signingIn} size="lg" fullWidth />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setWithPassword(true)}
          className="text-[0.9375rem] text-graphite underline underline-offset-4 transition-fast hover:text-ink"
        >
          {labels.password}
        </button>
      )}
    </div>
  );
}
