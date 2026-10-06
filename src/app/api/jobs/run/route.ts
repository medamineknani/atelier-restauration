import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/config/env";
import { processEmailQueue } from "@/server/services/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Traitement de la file de tâches (emails, nettoyage).
 *
 * Appelé par le planificateur (Vercel Cron, cron système, ou `curl` en
 * développement). Sans ce point d'entrée, les emails de confirmation
 * resteraient en file : rien n'est jamais envoyé pendant la requête du client.
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Interdit" }, { status: 401 });
  }

  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 25);
  const processed = await processEmailQueue(Number.isFinite(limit) ? Math.min(limit, 100) : 25);

  return NextResponse.json({ processed });
}

/** En développement uniquement : permet de vider la file à la main. */
export async function GET(request: NextRequest) {
  if (env.NODE_ENV === "production") {
    return new NextResponse("Introuvable", { status: 404 });
  }
  return POST(request);
}

function authorized(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expected = env.CRON_SECRET;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  // Comparaison à temps constant : un secret ne se devine pas octet par octet.
  return a.length === b.length && timingSafeEqual(a, b);
}
