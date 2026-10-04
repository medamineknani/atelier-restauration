"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { ArrowIcon } from "@/components/ui/primitives";

/**
 * Bouton d'étape : il lit l'état d'envoi du formulaire parent.
 * Isolé dans son propre composant pour que le reste de l'étape ne soit pas
 * re-rendu à chaque frappe.
 */
export function SubmitButton({
  label,
  pendingLabel,
  variant = "primary",
  size = "lg",
  fullWidth,
  withArrow = true,
  className,
}: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "ghost" | "accent" | "danger";
  size?: "md" | "lg";
  fullWidth?: boolean;
  withArrow?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? pendingLabel : label}
      {withArrow && !pending ? <ArrowIcon className="h-4 w-4" /> : null}
    </Button>
  );
}
