import { NextResponse, type NextRequest } from "next/server";
import { writeDraftCookie, clearDraftCookie, readDraftOrderId } from "@/lib/draft";
import { createDraft, getOrderWithItems, setPack } from "@/server/services/orders";
import { getProductBySlug } from "@/server/services/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Crée un brouillon prêt à l'emploi — **développement et tests seulement**.
 *
 * Les parcours de bout en bout (M6) ont besoin d'entrer dans le tunnel sans
 * simuler un clic sur une carte de service. La route est neutralisée en
 * production : toute requête y renvoie 404.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Introuvable", { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | { pack?: string; kind?: "digital" | "photobook" }
    | null;

  const locale = body?.kind === "photobook" ? "fr" : "fr";
  const order = await createDraft({ kind: body?.kind ?? "digital", locale });

  if (body?.pack) {
    const product = await getProductBySlug(body.pack, "fr");
    if (product) await setPack(order.id, product.id, "fr");
  }

  await writeDraftCookie(order.id);
  return NextResponse.json({ orderId: order.id, reference: order.reference });
}

/** État courant du brouillon — lecture seule. */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Introuvable", { status: 404 });
  }

  const orderId = await readDraftOrderId();
  if (!orderId) return NextResponse.json({ draft: null });

  const order = await getOrderWithItems(orderId);
  if (!order) return NextResponse.json({ draft: null });

  return NextResponse.json({
    draft: {
      id: order.id,
      reference: order.reference,
      status: order.status,
      photosCount: order.photosCount,
      photosQuota: order.photosQuota,
      totalMillimes: order.totalMillimes,
      items: order.items.map((item) => ({
        type: item.itemType,
        name: item.nameSnapshot,
        quantity: item.quantity,
        totalMillimes: item.totalMillimes,
      })),
    },
  });
}

export async function DELETE() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Introuvable", { status: 404 });
  }
  await clearDraftCookie();
  return NextResponse.json({ ok: true });
}
