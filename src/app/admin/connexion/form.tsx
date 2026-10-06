"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { adminSignIn, type AdminAuthState } from "@/server/actions/admin";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-sm bg-ink px-4 py-2.5 text-[0.875rem] font-medium text-paper transition-fast hover:bg-ink-soft disabled:opacity-50"
    >
      {pending ? "Vérification…" : "Se connecter"}
    </button>
  );
}

export function AdminSignInForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<AdminAuthState, FormData>(adminSignIn, { ok: false });

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="next" value={next} />

      <div className="grid gap-2">
        <label htmlFor="email" className="text-[0.8125rem] font-medium text-ink">
          Adresse email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="w-full rounded-sm border border-line bg-paper px-3 py-2 text-[0.875rem] text-ink focus:border-champagne focus:outline-none"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="password" className="text-[0.8125rem] font-medium text-ink">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-sm border border-line bg-paper px-3 py-2 text-[0.875rem] text-ink focus:border-champagne focus:outline-none"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-[0.8125rem] text-danger">
          Identifiants incorrects, ou ce compte n’est pas administrateur.
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
