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
/**
 * Tout montant est ramené à un entier positif.
 *
 * Un prix aberrant — saisie malencontreuse, import, donnée corrompue — ne doit
 * jamais produire un total négatif : ce total sert à facturer, à encaisser et
 * à déclarer.
 */
function safePrice(millimes: number): number {
  return Math.max(0, Math.trunc(millimes));
}

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
      unitPriceMillimes: safePrice(input.pack.priceMillimes),
      quantity: 1,
      totalMillimes: safePrice(input.pack.priceMillimes),
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
      unitPriceMillimes: safePrice(extra.product.priceMillimes),
      quantity,
      totalMillimes: safePrice(extra.product.priceMillimes) * quantity,
      photosGranted: extra.product.extraPhotosGranted * quantity,
      pagesGranted: extra.product.extraPagesGranted * quantity,
      turnaroundDays: extra.product.turnaroundDaysMax,
    });
  }

  const subtotalMillimes = lines.reduce((sum, line) => sum + line.totalMillimes, 0);
  const discountMillimes = Math.min(Math.max(0, input.discountMillimes ?? 0), subtotalMillimes);

  // Un seul élément physique suffit à déclencher l'expédition, et un forfait
  // n'est jamais facturé deux fois. Se fier au pack seul perdait les extras
  // matériels — une boîte commandée avec un pack numérique n'aurait jamais été
  // expédiée.
  const needsShipping =
    input.pack?.requiresShipping === true ||
    input.extras.some((item) => item.product.requiresShipping === true);
  const shippingMillimes = needsShipping ? Math.max(0, input.shippingFlatMillimes ?? 0) : 0;

  const photosQuota = lines.reduce((sum, line) => sum + line.photosGranted, 0);
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
