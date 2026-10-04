"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { OrderStatusCode } from "@/server/db/schema";
import { adminInputClass, AdminLabel } from "./ui";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-ink px-4 py-2.5 text-[0.875rem] font-medium text-paper transition-fast hover:bg-ink-soft disabled:opacity-50"
    >
      {pending ? "…" : label}
    </button>
  );
}

/**
 * Changement de statut.
 *
 * Seules les transitions réellement autorisées sont proposées : le back-office
 * ne doit pas pouvoir invalider la machine à états. Le message au client est
 * pré-rempli par un modèle — rédiger la même phrase cinquante fois par
 * semaine est exactement le genre de tâche qui fait sauter une étape.
 */
export function StatusForm({
  action,
  orderId,
  allowed,
  templates,
  labels,
}: {
  action: (formData: FormData) => Promise<void>;
  orderId: string;
  allowed: { value: OrderStatusCode; label: string }[];
  templates: Partial<Record<OrderStatusCode, string>>;
  labels: {
    title: string;
    newStatus: string;
    message: string;
    notify: string;
    carrier: string;
    tracking: string;
    submit: string;
    markShipped: string;
    empty: string;
  };
}) {
  const [status, setStatus] = useState<OrderStatusCode | "">("");
  const [message, setMessage] = useState("");

  const pick = (value: string) => {
    const next = value as OrderStatusCode;
    setStatus(next);
    setMessage(templates[next] ?? "");
  };

  if (allowed.length === 0) {
    return <p className="text-[0.875rem] text-muted">{labels.empty}</p>;
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="orderId" value={orderId} />

      <div className="grid gap-2">
        <AdminLabel htmlFor="status">{labels.newStatus}</AdminLabel>
        <select
          id="status"
          name="status"
          required
          value={status}
          onChange={(event) => pick(event.target.value)}
          className={adminInputClass}
        >
          <option value="" disabled>
            —
          </option>
          {allowed.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {status === "shipped" ? (
        <div className="grid gap-3 rounded-md border border-line bg-cream p-3">
          <div className="grid gap-2">
            <AdminLabel htmlFor="carrier">{labels.carrier}</AdminLabel>
            <input id="carrier" name="carrier" className={adminInputClass} />
          </div>
          <div className="grid gap-2">
            <AdminLabel htmlFor="tracking">{labels.tracking}</AdminLabel>
            <input id="tracking" name="tracking" dir="ltr" className={adminInputClass} />
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        <AdminLabel htmlFor="message" hint="Envoyé par email et visible dans l’espace client.">
          {labels.message}
        </AdminLabel>
        <textarea
          id="message"
          name="message"
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={`${adminInputClass} resize-y`}
        />
      </div>

      <label className="flex items-center gap-2 text-[0.8125rem] text-graphite">
        <input
          type="checkbox"
          name="notify"
          defaultChecked
          className="h-4 w-4 accent-champagne-deep"
        />
        {labels.notify}
      </label>

      <div className="flex">
        <Submit label={status === "shipped" ? labels.markShipped : labels.submit} />
      </div>
    </form>
  );
}
