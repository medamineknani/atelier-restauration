"use client";

import { useState } from "react";

/**
 * Copie de l'adresse en un clic.
 *
 * L'adresse part au transporteur par message : la retaper à la main est la
 * première cause d'erreur de livraison.
 */
export function AddressCopy({
  value,
  label,
  copied,
}: {
  value: string;
  label: string;
  copied: string;
}) {
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          window.setTimeout(() => setDone(false), 2500);
        } catch {
          setDone(false);
        }
      }}
      className="text-[0.8125rem] text-graphite underline underline-offset-4 hover:text-ink"
    >
      {done ? copied : label}
    </button>
  );
}
