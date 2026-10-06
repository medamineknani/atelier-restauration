"use client";

import { useActionState } from "react";
import { Checkbox, Field, Fieldset, TextArea, TextInput } from "./fields";
import { SubmitButton } from "./submit-button";
import { GOVERNORATES } from "@/lib/governorates";

export type DetailsState = { ok: boolean; error?: string };

export type DetailsLabels = {
  identity: string;
  identityHint: string;
  shipping: string;
  shippingHint: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  address2: string;
  city: string;
  governorate: string;
  postalCode: string;
  notes: string;
  notesPlaceholder: string;
  newsletter: string;
  privacyNote: string;
  submit: string;
  saving: string;
  requiredField: string;
  invalidEmail: string;
  invalidPhone: string;
  genericError: string;
};

export type DetailsDefaults = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  line1?: string;
  line2?: string;
  city?: string;
  governorate?: string;
  postalCode?: string;
  notes?: string;
  newsletter: boolean;
};

/**
 * Étape 5 — les coordonnées.
 *
 * Deux principes : ne demander que ce qui sert à livrer, et ne jamais perdre
 * ce qui a été saisi. Le formulaire se soumet via une Server Action avec état,
 * donc les valeurs restent en place si la validation échoue — sur mobile,
 * retaper une adresse est une raison suffisante d'abandonner.
 */
export function DetailsForm({
  action,
  locale,
  requiresShipping,
  defaults,
  labels,
}: {
  action: (state: DetailsState, formData: FormData) => Promise<DetailsState>;
  locale: string;
  requiresShipping: boolean;
  defaults: DetailsDefaults;
  labels: DetailsLabels;
}) {
  const [state, formAction] = useActionState<DetailsState, FormData>(action, { ok: false });

  const errorFor = (field: string) => (state.error === field ? message(state.error, labels) : undefined);
  const generic = state.error && !["firstName", "lastName", "email", "phone"].includes(state.error)
    ? message(state.error, labels)
    : undefined;

  return (
    <form action={formAction} className="grid gap-10">
      <input type="hidden" name="locale" value={locale} />

      <Fieldset legend={labels.identity} description={labels.identityHint}>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label={labels.firstName} htmlFor="firstName" error={errorFor("firstName")}>
            <TextInput
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              required
              defaultValue={defaults.firstName}
              error={!!errorFor("firstName")}
              maxLength={80}
            />
          </Field>

          <Field label={labels.lastName} htmlFor="lastName" error={errorFor("lastName")}>
            <TextInput
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              required
              defaultValue={defaults.lastName}
              error={!!errorFor("lastName")}
              maxLength={80}
            />
          </Field>

          <Field label={labels.email} htmlFor="email" error={errorFor("email")}>
            <TextInput
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              defaultValue={defaults.email}
              error={!!errorFor("email")}
            />
          </Field>

          <Field label={labels.phone} htmlFor="phone" error={errorFor("phone")}>
            <TextInput
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              defaultValue={defaults.phone}
              error={!!errorFor("phone")}
              maxLength={30}
            />
          </Field>
        </div>
      </Fieldset>

      {requiresShipping ? (
        <Fieldset legend={labels.shipping} description={labels.shippingHint}>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label={labels.address} htmlFor="line1" className="sm:col-span-2">
              <TextInput
                id="line1"
                name="line1"
                autoComplete="address-line1"
                required
                defaultValue={defaults.line1 ?? ""}
                maxLength={160}
              />
            </Field>

            <Field label={labels.address2} htmlFor="line2" className="sm:col-span-2">
              <TextInput
                id="line2"
                name="line2"
                autoComplete="address-line2"
                defaultValue={defaults.line2 ?? ""}
                maxLength={160}
              />
            </Field>

            <Field label={labels.city} htmlFor="city">
              <TextInput
                id="city"
                name="city"
                autoComplete="address-level2"
                required
                defaultValue={defaults.city ?? ""}
                maxLength={80}
              />
            </Field>

            <Field label={labels.governorate} htmlFor="governorate">
              <TextInput
                id="governorate"
                name="governorate"
                list="gouvernorats"
                required
                defaultValue={defaults.governorate ?? ""}
                maxLength={80}
              />
              <datalist id="gouvernorats">
                {GOVERNORATES.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </Field>

            <Field label={labels.postalCode} htmlFor="postalCode">
              <TextInput
                id="postalCode"
                name="postalCode"
                inputMode="numeric"
                autoComplete="postal-code"
                defaultValue={defaults.postalCode ?? ""}
                maxLength={12}
              />
            </Field>
          </div>
        </Fieldset>
      ) : null}

      <Field label={labels.notes} htmlFor="notes" hint={labels.notesPlaceholder}>
        <TextArea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={defaults.notes ?? ""}
          maxLength={2000}
        />
      </Field>

      <Checkbox id="newsletter" name="newsletter" label={labels.newsletter} defaultChecked={defaults.newsletter} />

      {generic ? (
        <p role="alert" className="rounded-sm border border-danger/40 bg-danger/5 p-4 text-[0.875rem] text-danger">
          {generic}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 border-t border-line pt-8">
        <SubmitButton label={labels.submit} pendingLabel={labels.saving} size="lg" />
        <p className="text-[0.8125rem] leading-relaxed text-muted">{labels.privacyNote}</p>
      </div>
    </form>
  );
}

function message(code: string, labels: DetailsLabels) {
  switch (code) {
    case "email":
      return labels.invalidEmail;
    case "phone":
      return labels.invalidPhone;
    case "firstName":
    case "lastName":
      return labels.requiredField;
    default:
      return labels.genericError;
  }
}
