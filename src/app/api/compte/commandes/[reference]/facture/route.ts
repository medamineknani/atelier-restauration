import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrderWithItems } from "@/server/services/orders";
import { ensureInvoice, orderForUser } from "@/server/services/accounts";
import { renderInvoiceHtml } from "@/server/services/invoice-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVOICEABLE = new Set([
  "received",
  "processing",
  "restoring",
  "checking",
  "ready",
  "shipped",
  "completed",
]);

/**
 * Facture au format HTML, imprimable.
 *
 * Le document est généré à la demande, puis figé dès la première édition :
 * son numéro et son contenu ne bougent plus, même si le catalogue change.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;

  const user = await getCurrentUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });

  const order = await orderForUser(reference, user.id);
  if (!order) return new NextResponse("Introuvable", { status: 404 });

  if (!INVOICEABLE.has(order.status)) {
    return new NextResponse("Facture non disponible", { status: 409 });
  }

  const withItems = await getOrderWithItems(order.id);
  if (!withItems) return new NextResponse("Introuvable", { status: 404 });

  const invoice = await ensureInvoice(order);

  const html = await renderInvoiceHtml({
    order: withItems,
    items: withItems.items,
    invoice,
    customer: order.customerSnapshot,
    locale: order.locale,
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "content-disposition": `inline; filename="facture-${reference}.html"`,
    },
  });
}
