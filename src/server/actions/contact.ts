"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { contactRequests } from "@/server/db/schema";
import { getMailer, emailLayout, htmlToText } from "@/lib/mailer";
import { site } from "@/config/site";
import type { Locale } from "@/lib/i18n";

const schema = z.object({
  name: z.string().min(2, "required").max(120),
  email: z.string().email("invalidEmail"),
  phone: z.string().max(40).optional().or(z.literal("")),
  subject: z.string().max(80).optional().or(z.literal("")),
  message: z.string().min(10, "required").max(4000),
  locale: z.enum(["fr", "en", "ar"]),
});

export type ContactState = { ok: boolean; error?: string };

export async function submitContact(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    subject: formData.get("subject") ?? "",
    message: formData.get("message"),
    locale: formData.get("locale") ?? "fr",
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "invalid" };
  }

  const data = parsed.data;
  const locale = data.locale as Locale;

  await db.insert(contactRequests).values({
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    subject: data.subject || null,
    message: data.message,
    locale,
  });

  const subject = `Nouveau message — ${data.subject || "contact"} · ${data.name}`;
  const html = emailLayout({
    title: subject,
    body: `
      <p><strong>${data.name}</strong></p>
      <p style="font-size:14px;color:#6E6862;">${data.email}${data.phone ? ` · ${data.phone}` : ""}</p>
      <div style="margin-top:20px;padding:16px;background:#EDE7DB;border:1px solid #DED7C9;">
        ${data.message.replace(/\n/g, "<br>")}
      </div>`,
  });
  await getMailer().send({ to: site.email, subject, html, text: htmlToText(html), replyTo: data.email });

  redirect(
    `${locale === "en" ? "/en" : ""}/contact?envoye=1`,
  );
}
