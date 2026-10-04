"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createTranslator, type Locale } from "@/lib/i18n";
import { submitContact, type ContactState } from "@/server/actions/contact";
import { CONTACT_SUBJECTS } from "@/config/site";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-12 w-full rounded-sm border border-line bg-paper px-4 text-[0.9375rem] text-ink placeholder:text-muted transition-fast focus:border-champagne focus:outline-none";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending ? "…" : label}
    </Button>
  );
}

export function ContactForm({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  const [state, formAction] = useActionState<ContactState, FormData>(submitContact, { ok: false });

  const subjects: Record<string, { fr: string; en: string }> = {
    renseignement: { fr: "Renseignement", en: "Enquiry" },
    "commande-en-cours": { fr: "Commande en cours", en: "Existing order" },
    photobook: { fr: "Photobook", en: "Photobook" },
    devis: { fr: "Demande de devis", en: "Quote request" },
    partenariat: { fr: "Partenariat", en: "Partnership" },
  };

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block text-[0.875rem] text-graphite">
            {t("contact.name")} <span className="text-muted">*</span>
          </label>
          <input id="name" name="name" required autoComplete="name" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="email" className="mb-2 block text-[0.875rem] text-graphite">
            {t("contact.email")} <span className="text-muted">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="mb-2 block text-[0.875rem] text-graphite">
            {t("contact.phone")} <span className="text-muted">{t("common.optional")}</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="subject" className="mb-2 block text-[0.875rem] text-graphite">
            {t("contact.subject")}
          </label>
          <select id="subject" name="subject" className={cn(fieldClass, "appearance-none")}>
            {CONTACT_SUBJECTS.map((value) => (
              <option key={value} value={value}>
                {subjects[value]?.[locale === "en" ? "en" : "fr"] ?? value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="message" className="mb-2 block text-[0.875rem] text-graphite">
          {t("contact.message")} <span className="text-muted">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          placeholder={t("contact.messagePlaceholder")}
          className="w-full rounded-sm border border-line bg-paper p-4 text-[0.9375rem] text-ink placeholder:text-muted transition-fast focus:border-champagne focus:outline-none"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-[0.875rem] text-danger">
          {state.error === "required"
            ? t("common.requiredField")
            : state.error === "invalidEmail"
              ? t("common.invalidEmail")
              : t("common.somethingWentWrong")}
        </p>
      ) : null}

      <SubmitButton label={t("contact.send")} />

      <p className="text-[0.8125rem] leading-relaxed text-stone">{t("checkout.privacyNote")}</p>
    </form>
  );
}
