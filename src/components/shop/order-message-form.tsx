"use client";

import { useActionState, useEffect, useRef } from "react";
import { TextArea } from "@/components/shop/fields";
import { SubmitButton } from "@/components/shop/submit-button";
import type { MessageState } from "@/server/actions/account";

/** Message du client vers l'atelier, depuis le suivi de commande. */
export function OrderMessageForm({
  action,
  locale,
  reference,
  labels,
}: {
  action: (state: MessageState, formData: FormData) => Promise<MessageState>;
  locale: string;
  reference: string;
  labels: { send: string; sending: string; placeholder: string; sent: string; error: string };
}) {
  const [state, formAction] = useActionState<MessageState, FormData>(action, { ok: false });
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Le champ est vidé uniquement quand l'envoi a réussi : en cas d'erreur,
  // le client retrouve son texte intact.
  useEffect(() => {
    if (state.ok && areaRef.current) areaRef.current.value = "";
  }, [state.ok, state]);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="reference" value={reference} />

      <label htmlFor="message" className="sr-only">
        {labels.placeholder}
      </label>
      <TextArea
        id="message"
        name="body"
        rows={4}
        placeholder={labels.placeholder}
        maxLength={2000}
      />

      {state.error ? (
        <p role="alert" className="text-[0.875rem] text-danger">
          {labels.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-[0.875rem] text-success">
          {labels.sent}
        </p>
      ) : null}

      <div className="flex">
        <SubmitButton
          label={labels.send}
          pendingLabel={labels.sending}
          variant="secondary"
          withArrow={false}
        />
      </div>
    </form>
  );
}
