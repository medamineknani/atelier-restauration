import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { isLocale, localePath, type Locale } from "@/lib/i18n";
import { verifyLoginToken } from "@/server/actions/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Consommation du lien de connexion.
 *
 * C'est une route et non une page : l'ouverture de session pose un cookie, ce
 * qui n'est possible que depuis une Server Action ou un gestionnaire de route —
 * jamais pendant le rendu d'une page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "fr";

  const token = request.nextUrl.searchParams.get("t");
  if (!token) redirect(`${localePath(locale, "/connexion")}?erreur=lien`);

  const ok = await verifyLoginToken(token);
  redirect(
    ok
      ? localePath(locale, "/compte")
      : `${localePath(locale, "/connexion")}?erreur=lien`,
  );
}
