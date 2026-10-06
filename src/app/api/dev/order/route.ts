import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { assets } from "@/server/db/schema";
import { storageKeys } from "@/lib/files";
import { getStorage } from "@/lib/files";
import { changeStatus, getOrderByReference } from "@/server/services/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = [
  "draft",
  "awaiting_payment",
  "received",
  "processing",
  "restoring",
  "checking",
  "ready",
  "shipped",
  "completed",
  "on_hold",
  "cancelled",
  "refunded",
] as const;

/**
 * Fait avancer une commande — **développement et tests seulement**.
 *
 * Les parcours de bout en bout doivent pouvoir vérifier ce qu'un client voit
 * quand ses photos sont prêtes, ou quand la facture existe, sans attendre
 * qu'un humain joue l'atelier. Neutralisée en production : 404 systématique.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Introuvable", { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    reference?: string;
    status?: (typeof STATUSES)[number];
    restored?: boolean;
  } | null;

  const reference = body?.reference;
  if (!reference) return NextResponse.json({ error: "reference requis" }, { status: 400 });

  const order = await getOrderByReference(reference);
  if (!order) return NextResponse.json({ error: "commande introuvable" }, { status: 404 });

  if (body?.status) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "statut inconnu" }, { status: 400 });
    }
    await changeStatus(order.id, body.status, {
      message: "Avancé par le script de test",
      notify: false,
    });
  }

  let restored = 0;
  if (body?.restored) {
    const originals = await db
      .select()
      .from(assets)
      .where(eq(assets.orderId, order.id))
      .limit(50);
    const originalList = originals.filter((asset) => asset.kind === "original");
    const storage = getStorage();

    for (const original of originalList) {
      const existing = originals.find(
        (asset) => asset.kind === "restored" && asset.pairedAssetId === original.id,
      );
      if (existing) continue;

      const buffer = await storage.get(original.storageKey);
      if (!buffer) continue;

      const row = await db
        .insert(assets)
        .values({
          orderId: order.id,
          kind: "restored",
          status: "ready",
          storageDriver: original.storageDriver,
          storageBucket: original.storageBucket,
          storageKey: storageKeys.restored(
            order.id,
            original.id,
            extension(original.storageKey),
          ),
          originalFilename: `restauree-${original.originalFilename}`,
          mimeType: original.mimeType,
          sizeBytes: original.sizeBytes,
          width: original.width,
          height: original.height,
          exifStripped: true,
          position: original.position,
          pairedAssetId: original.id,
          releasedAt: new Date(),
          retainUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        })
        .returning();

      await storage.put(row[0]!.storageKey, buffer, original.mimeType);
      restored += 1;
    }
  }

  const updated = await getOrderByReference(reference);
  return NextResponse.json({
    reference,
    status: updated?.status,
    restored,
  });
}

function extension(key: string) {
  const match = key.match(/\.([a-z0-9]+)$/i);
  return (match?.[1] ?? "jpg").toLowerCase();
}
