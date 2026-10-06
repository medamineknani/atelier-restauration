"use client";

import { useEffect, useState } from "react";

/**
 * Garde-fou sur le prix.
 *
 * Un zéro de trop transforme 199 DT en 1990 DT. La variation de plus de 20 %
 * est signalée à la saisie — et conservée dans l'historique avec le motif.
 */
export function PriceGuard({
  previousMillimes,
  inputId,
  warning,
}: {
  previousMillimes: number;
  inputId: string;
  warning: string;
}) {
  const [value, setValue] = useState(previousMillimes / 1000);

  useEffect(() => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (!input) return;
    const read = () => setValue(Number(input.value) || 0);
    input.addEventListener("input", read);
    return () => input.removeEventListener("input", read);
  }, [inputId]);

  if (previousMillimes === 0) return null;

  const ratio = Math.abs(value * 1000 - previousMillimes) / previousMillimes;
  if (ratio <= 0.2) return null;

  return (
    <p role="alert" className="rounded-[3px] border border-warning/40 bg-warning/10 px-3 py-2 text-[0.8125rem] text-warning">
      {warning}
    </p>
  );
}
