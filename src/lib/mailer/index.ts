import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/config/env";
import { site } from "@/config/site";

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export interface Mailer {
  readonly name: string;
  send(message: MailMessage): Promise<void>;
}

/** Développement : écrit les emails sur disque, rien ne part. */
function createConsoleMailer(): Mailer {
  return {
    name: "console",
    async send(message) {
      const dir = path.join(process.cwd(), "storage", "mail");
      await mkdir(dir, { recursive: true });
      const safe = `${Date.now()}-${message.to.replace(/[^a-z0-9@.]/gi, "_")}.html`;
      await writeFile(path.join(dir, safe), message.html, "utf8");
      console.log(`\n📧 [mailer:console] → ${message.to} · ${message.subject}`);
      console.log(`   ${path.join("storage", "mail", safe)}\n`);
    },
  };
}

function createResendMailer(): Mailer {
  return {
    name: "resend",
    async send(message) {
      const apiKey = env.RESEND_API_KEY;
      if (!apiKey) throw new Error("RESEND_API_KEY manquant");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: env.MAILER_FROM,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status} : ${await res.text()}`);
    },
  };
}

export function getMailer(): Mailer {
  return env.MAILER_DRIVER === "resend" ? createResendMailer() : createConsoleMailer();
}

/* -------------------------------------------------------------------------- */
/* Gabarit                                                                     */
/* -------------------------------------------------------------------------- */

const escape = (value: string) =>
  value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function emailLayout(options: { title: string; preheader?: string; body: string }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:#F6F2EA;">
${options.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(options.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F2EA;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FDFCF9;border:1px solid #DED7C9;">
  <tr><td style="padding:40px 40px 8px;font-family:Georgia,serif;font-size:20px;color:#100F0D;letter-spacing:0.01em;">
    ${escape(site.name)}
  </td></tr>
  <tr><td style="padding:0 40px;"><div style="height:1px;background:#DED7C9;"></div></td></tr>
  <tr><td style="padding:28px 40px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#2A2723;">
    ${options.body}
  </td></tr>
  <tr><td style="padding:24px 40px 40px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6E6862;border-top:1px solid #DED7C9;">
    ${escape(site.name)} · ${escape(site.address.city)}, ${escape(site.address.country)}<br>
    <a href="${site.url}" style="color:#8E7440;">${site.url.replace(/^https?:\/\//, "")}</a>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h1|h2|h3|li)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
