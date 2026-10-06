import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/config/env";

export const DRAFT_COOKIE = "ar_draft";

/**
 * Le brouillon de commande est identifié par un cookie signé.
 *
 * On ne peut pas se contenter de l'UUID : n'importe qui pourrait deviner
 * l'identifiant d'une commande et accéder aux photos d'un autre client.
 * La signature HMAC empêche l'énumération.
 */
function sign(orderId: string) {
  return createHmac("sha256", env.APP_SECRET).update(orderId).digest("base64url");
}

export function buildDraftToken(orderId: string) {
  return `${orderId}.${sign(orderId)}`;
}

export function parseDraftToken(token: string): string | null {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const orderId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = Buffer.from(sign(orderId));
  const received = Buffer.from(signature);
  if (expected.length !== received.length) return null;
  if (!timingSafeEqual(expected, received)) return null;
  return orderId;
}

export async function readDraftOrderId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(DRAFT_COOKIE)?.value;
  if (!token) return null;
  return parseDraftToken(token);
}

/** À n'appeler que depuis une Server Action ou une Route Handler. */
export async function writeDraftCookie(orderId: string) {
  const store = await cookies();
  store.set(DRAFT_COOKIE, buildDraftToken(orderId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function clearDraftCookie() {
  const store = await cookies();
  store.delete(DRAFT_COOKIE);
}
