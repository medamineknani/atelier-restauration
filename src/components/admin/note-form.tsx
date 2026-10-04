"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { adminInputClass } from "./ui";

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-line-strong bg-paper px-4 py-2 text-[0.875rem] font-medium text-ink transition-fast hover:border-champagne hover:bg-cream disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Note interne ou message au client.
 *
 * Un seul fil, deux audiences. La bascule est visible et le champ change de
 * couleur : une note interne envoyée par erreur à un client serait bien plus
 * qu'un incident technique.
 */
export function NoteForm({
  action,
  orderId,
  labels,
}: {
  action: (formData: FormData) => Promise<void>;
  orderId: string;
  labels: {
    internal: string;
    client: string;
    placeholderInternal: string;
    placeholderClient: string;
    send: string;
    sending: string;
  };
}) {
  const [audience, setAudience] = useState<"internal" | "client">("internal");
  const isClient = audience === "client";

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="audience" value={audience} />

      <div className="inline-flex w-fit rounded-sm border border-line p-0.5">
        {(
          [
            { value: "internal", label: labels.internal },
            { value: "client", label: labels.client },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setAudience(option.value)}
            aria-pressed={audience === option.value}
            className={`rounded-[2px] px-3 py-1 text-[0.8125rem] transition-fast ${
              audience === option.value ? "bg-ink text-paper" : "text-graphite hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <textarea
        name="body"
        aria-label="Texte de la note"
        rows={3}
        required
        placeholder={isClient ? labels.placeholderClient : labels.placeholderInternal}
        className={`${adminInputClass} resize-y ${
          isClient ? "border-champagne/60 bg-cream" : "bg-sand/40"
        }`}
      />

      <div className="flex">
        <Submit label={labels.send} pendingLabel={labels.sending} />
      </div>
    </form>
  );
}
