import { NextResponse, type NextRequest } from "next/server";
import { activeLocales, defaultLocale } from "@/lib/i18n/config";

/**
 * Routage multilingue :
 *   /restauration-photo  → réécrit vers /fr/restauration-photo
 *   /en/photo-restoration → servi tel quel
 *   /fr/…                → redirigé vers la version sans préfixe (URL canonique)
 *   /admin, /api, /_next → hors locale (l'administration est en français)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".");
  if (isAsset) return NextResponse.next();

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  const requestHeaders = new Headers(request.headers);

  if (first === "admin") {
    requestHeaders.set("x-arl-locale", defaultLocale);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // /fr/… → version canonique sans préfixe
  if (first === defaultLocale) {
    const rest = `/${segments.slice(1).join("/")}`;
    return NextResponse.redirect(new URL(rest === "/" ? "/" : rest, request.url), 308);
  }

  if (first && (activeLocales as readonly string[]).includes(first)) {
    requestHeaders.set("x-arl-locale", first);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  requestHeaders.set("x-arl-locale", defaultLocale);
  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
