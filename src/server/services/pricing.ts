import "server-only";

import type { ProductWithTranslation } from "./catalog";

export type OrderLineInput = {
  product: ProductWithTranslation;
  quantity: number;
};

export type ComputedLine = {
  productId: string;
  itemType: "pack" | "extra";
  nameSnapshot: string;
  unitPriceMillimes: number;
  quantity: number;
  totalMillimes: number;
  photosGranted: number;
  pagesGranted: number;
  turnaroundDays: number;
};

export type ComputedOrder = {
  lines: ComputedLine[];
  subtotalMillimes: number;
  discountMillimes: number;
  shippingMillimes: number;
  totalMillimes: number;
  photosQuota: number;
  pagesGranted: number;
  turnaroundDays: number;
};

/**
 * Règles de tarification — **centralisées ici**.
 * Aucun montant n'est jamais calculé côté client : le navigateur affiche ce que
 * le serveur a produit.
 */
export function computeOrder(input: {
  pack: ProductWithTranslation | null;
  extras: OrderLineInput[];
  shippingFlatMillimes?: number;
  discountMillimes?: number;
}): ComputedOrder {
  const lines: ComputedLine[] = [];

  if (input.pack) {
    lines.push({
      productId: input.pack.id,
      itemType: "pack",
      nameSnapshot: input.pack.name,
      unitPriceMillimes: input.pack.priceMillimes,
      quantity: 1,
      totalMillimes: input.pack.priceMillimes,
      photosGranted: input.pack.photosIncluded ?? input.pack.photosMax ?? 0,
      pagesGranted: input.pack.pagesIncluded ?? 0,
      turnaroundDays: input.pack.turnaroundDaysMax,
    });
  }

  for (const extra of input.extras) {
    const quantity = Math.max(1, Math.min(extra.quantity, extra.product.maxQuantity ?? 999));
    lines.push({
      productId: extra.product.id,
      itemType: "extra",
      nameSnapshot: extra.product.name,
      unitPriceMillimes: extra.product.priceMillimes,
      quantity,
      totalMillimes: extra.product.priceMillimes * quantity,
      photosGranted: extra.product.extraPhotosGranted * quantity,
      pagesGranted: extra.product.extraPagesGranted * quantity,
      turnaroundDays: extra.product.turnaroundDaysMax * (quantity > 1 ? 1 : 1),
    });
  }

  const subtotalMillimes = lines.reduce((sum, line) => sum + line.totalMillimes, 0);
  const discountMillimes = Math.min(input.discountMillimes ?? 0, subtotalMillimes);
  const needsShipping = input.pack?.requiresShipping ?? false;
  const shippingMillimes = needsShipping ? (input.shippingFlatMillimes ?? 0) : 0;

  const photosQuota = lines.reduce(
    (sum, line) => sum + (line.itemType === "pack" ? line.photosGranted : line.photosGranted),
    0,
  );
  const pagesGranted = lines.reduce((sum, line) => sum + line.pagesGranted, 0);
  const turnaroundDays = lines.reduce(
    (max, line) => Math.max(max, line.turnaroundDays),
    lines[0]?.turnaroundDays ?? 0,
  );

  return {
    lines,
    subtotalMillimes,
    discountMillimes,
    shippingMillimes,
    totalMillimes: subtotalMillimes - discountMillimes + shippingMillimes,
    photosQuota,
    pagesGranted,
    turnaroundDays,
  };
}
