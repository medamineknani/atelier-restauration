import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Champs du tunnel de commande.
 *
 * Volontairement nus : pas de libellé flottant, pas d'animation. Sur un
 * formulaire que l'on remplit une seule fois, la clarté vaut mieux que
 * l'ingéniosité. Les bordures restent fines, l'état actif est champagne.
 */

const inputClasses =
  "w-full rounded-sm border border-line-strong bg-paper px-4 py-3 text-[0.9375rem] text-ink transition-fast placeholder:text-muted hover:border-stone focus:border-champagne focus:outline-none focus:ring-2 focus:ring-champagne/25 disabled:bg-cream";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[0.8125rem] font-medium uppercase tracking-[0.1em] text-stone"
      >
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-[0.8125rem] text-muted">{hint}</p> : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  id,
  name,
  type = "text",
  autoComplete,
  required,
  placeholder,
  defaultValue,
  error,
  inputMode,
  maxLength,
  list,
  disabled,
  className,
  dir,
}: {
  id: string;
  name: string;
  type?: "text" | "email" | "tel" | "password";
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  error?: boolean;
  inputMode?: "text" | "email" | "tel" | "numeric";
  maxLength?: number;
  /** `id` d'un `<datalist>` : suggestions sans bloquer la saisie libre. */
  list?: string;
  disabled?: boolean;
  className?: string;
  dir?: "ltr" | "rtl" | "auto";
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      autoComplete={autoComplete}
      required={required}
      placeholder={placeholder}
      defaultValue={defaultValue}
      inputMode={inputMode}
      maxLength={maxLength}
      list={list}
      disabled={disabled}
      dir={dir}
      aria-invalid={error || undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      className={cn(inputClasses, error && "border-danger", disabled && "bg-sand text-stone", className)}
    />
  );
}

export function TextArea({
  id,
  name,
  rows = 4,
  placeholder,
  defaultValue,
  maxLength,
}: {
  id: string;
  name: string;
  rows?: number;
  placeholder?: string;
  defaultValue?: string;
  maxLength?: number;
}) {
  return (
    <textarea
      id={id}
      name={name}
      rows={rows}
      placeholder={placeholder}
      defaultValue={defaultValue}
      maxLength={maxLength}
      className={cn(inputClasses, "resize-y")}
    />
  );
}

export function Checkbox({
  id,
  name,
  label,
  defaultChecked,
}: {
  id: string;
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-champagne"
      />
      <label htmlFor={id} className="text-[0.9375rem] leading-relaxed text-graphite">
        {label}
      </label>
    </div>
  );
}

export function Fieldset({
  legend,
  description,
  children,
  className,
}: {
  legend: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("flex flex-col gap-6", className)}>
      <legend className="mb-6 w-full border-b border-line pb-3">
        <span className="font-display text-[1.25rem] text-ink">{legend}</span>
        {description ? (
          <span className="mt-2 block font-sans text-[0.875rem] font-normal text-stone">
            {description}
          </span>
        ) : null}
      </legend>
      {children}
    </fieldset>
  );
}
