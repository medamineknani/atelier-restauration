"use client";

import { useFormStatus } from "react-dom";

/**
 * Bouton de soumission avec confirmation.
 *
 * `window.confirm` est rustique, mais il est honnête : il bloque, il est
 * identique partout, et il ne peut pas être contourné par un style. Pour une
 * action irréversible, c'est exactement ce qu'on veut.
 */
export function ConfirmButton({
  label,
  pendingLabel,
  confirm,
  variant = "primary",
  className,
}: {
  label: string;
  pendingLabel?: string;
  confirm: string;
  variant?: "primary" | "danger" | "secondary";
  className?: string;
}) {
  const { pending } = useFormStatus();

  const styles = {
    primary: "bg-ink text-paper hover:bg-ink-soft",
    danger: "border border-danger/40 text-danger hover:bg-danger/5",
    secondary: "border border-line-strong bg-paper text-ink hover:border-champagne hover:bg-cream",
  }[variant];

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-[0.875rem] font-medium transition-fast disabled:opacity-50 ${styles} ${className ?? ""}`}
    >
      {pending ? (pendingLabel ?? "…") : label}
    </button>
  );
}
