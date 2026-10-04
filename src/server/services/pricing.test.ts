import { describe, expect, it } from "vitest";

import type { ProductWithTranslation } from "./catalog";
import { computeOrder } from "./pricing";

/* -------------------------------------------------------------------------- */
/* Fabrique                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Produit minimal.
 *
 * `computeOrder` ne lit qu'une partie des colonnes ; celles qui ne comptent
 * pas pour le calcul sont figées ici pour que l'intention d'un test reste
 * lisible. Toute colonne utilisée par le calcul doit apparaître dans un test.
 */
function product(overrides: Partial<ProductWithTranslation> = {}): ProductWithTranslation {
  return {
    id: overrides.id ?? "00000000-0000-4000-8000-000000000001",
    slug: "produit",
    kind: "pack",
    family: "digital",
    categoryId: null,

    priceMillimes: 99_000,
    currency: "TND",

    photosIncluded: 20,
    photosMin: null,
    photosMax: null,
    pagesIncluded: null,

    turnaroundDaysMin: 3,
    turnaroundDaysMax: 5,

    extraPhotosGranted: 0,
    extraPagesGranted: 0,
    pricingMode: "flat",
    maxQuantity: null,

    requiresShipping: false,
    isActive: true,
    isFeatured: false,
    sortOrder: 0,

    deletedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),

    name: "Produit",
    tagline: null,
    description: null,
    features: [],
    ctaLabel: null,

    ...overrides,
  } as ProductWithTranslation;
}

const pack = (overrides: Partial<ProductWithTranslation> = {}) =>
  product({ kind: "pack", ...overrides });

const extra = (overrides: Partial<ProductWithTranslation> = {}) =>
  product({ kind: "extra", ...overrides });

/** 1 DT = 1000 millimes. */
const DT = (dinars: number) => Math.round(dinars * 1000);

/* -------------------------------------------------------------------------- */
/* Montants                                                                    */
/* -------------------------------------------------------------------------- */

describe("computeOrder — montants", () => {
  it("un pack seul donne un total égal à son prix", () => {
    const result = computeOrder({ pack: pack({ priceMillimes: DT(99) }), extras: [] });

    expect(result.subtotalMillimes).toBe(DT(99));
    expect(result.shippingMillimes).toBe(0);
    expect(result.totalMillimes).toBe(DT(99));
  });

  it("additionne les extras à leur quantité", () => {
    const result = computeOrder({
      pack: pack({ priceMillimes: DT(199) }),
      extras: [
        { product: extra({ priceMillimes: DT(4) }), quantity: 3 },
        { product: extra({ priceMillimes: DT(25) }), quantity: 1 },
      ],
    });

    // 199 + (4 × 3) + 25 = 236
    expect(result.subtotalMillimes).toBe(DT(236));
    expect(result.totalMillimes).toBe(DT(236));
  });

  it("total = sous-total − remise + livraison", () => {
    const result = computeOrder({
      pack: pack({ priceMillimes: DT(100), requiresShipping: true }),
      extras: [],
      shippingFlatMillimes: DT(7),
      discountMillimes: DT(10),
    });

    expect(result.subtotalMillimes).toBe(DT(100));
    expect(result.discountMillimes).toBe(DT(10));
    expect(result.shippingMillimes).toBe(DT(7));
    expect(result.totalMillimes).toBe(DT(97));
  });

  it("une commande sans pack ni extra ne coûte rien", () => {
    const result = computeOrder({ pack: null, extras: [] });

    expect(result.lines).toEqual([]);
    expect(result.totalMillimes).toBe(0);
    expect(result.turnaroundDays).toBe(0);
    expect(result.photosQuota).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Remise                                                                      */
/* -------------------------------------------------------------------------- */

describe("computeOrder — remise", () => {
  it("plafonne la remise au sous-total, jamais de total négatif", () => {
    const result = computeOrder({
      pack: pack({ priceMillimes: DT(50) }),
      extras: [],
      discountMillimes: DT(80),
    });

    expect(result.discountMillimes).toBe(DT(50));
    expect(result.totalMillimes).toBe(0);
  });

  it("ne compte pas la remise dans le sous-total", () => {
    const result = computeOrder({
      pack: pack({ priceMillimes: DT(50) }),
      extras: [],
      discountMillimes: DT(5),
    });

    expect(result.subtotalMillimes).toBe(DT(50));
    expect(result.totalMillimes).toBe(DT(45));
  });
});

/* -------------------------------------------------------------------------- */
/* Livraison                                                                   */
/* -------------------------------------------------------------------------- */

describe("computeOrder — livraison", () => {
  it("n'est facturée que si un élément doit être expédié", () => {
    const result = computeOrder({
      pack: pack({ requiresShipping: false }),
      extras: [],
      shippingFlatMillimes: DT(7),
    });

    expect(result.shippingMillimes).toBe(0);
  });

  it("est facturée pour un pack à expédier", () => {
    const result = computeOrder({
      pack: pack({ requiresShipping: true }),
      extras: [],
      shippingFlatMillimes: DT(7),
    });

    expect(result.shippingMillimes).toBe(DT(7));
  });

  it("est facturée quand un seul extra est physique, même sur un pack numérique", () => {
    // Une boîte de présentation se livre : sans cela, le client commande un
    // objet qu'il ne recevra jamais et qu'on ne lui facture pas d'expédition.
    const result = computeOrder({
      pack: pack({ family: "digital", requiresShipping: false }),
      extras: [{ product: extra({ requiresShipping: true }), quantity: 1 }],
      shippingFlatMillimes: DT(7),
    });

    expect(result.shippingMillimes).toBe(DT(7));
  });

  it("n'est pas facturée deux fois si le pack et un extra sont physiques", () => {
    const result = computeOrder({
      pack: pack({ requiresShipping: true }),
      extras: [{ product: extra({ requiresShipping: true }), quantity: 1 }],
      shippingFlatMillimes: DT(7),
    });

    expect(result.shippingMillimes).toBe(DT(7));
  });
});

/* -------------------------------------------------------------------------- */
/* Quantités                                                                   */
/* -------------------------------------------------------------------------- */

describe("computeOrder — quantités", () => {
  it("borne la quantité d'un extra à son maximum", () => {
    const result = computeOrder({
      pack: null,
      extras: [{ product: extra({ priceMillimes: DT(4), maxQuantity: 5 }), quantity: 99 }],
    });

    expect(result.lines[0]?.quantity).toBe(5);
    expect(result.totalMillimes).toBe(DT(20));
  });

  it("ne descend jamais sous une unité", () => {
    const result = computeOrder({
      pack: null,
      extras: [{ product: extra({ priceMillimes: DT(4) }), quantity: 0 }],
    });

    expect(result.lines[0]?.quantity).toBe(1);
    expect(result.totalMillimes).toBe(DT(4));
  });

  it("accepte une quantité maximale nulle comme une absence de limite", () => {
    const result = computeOrder({
      pack: null,
      extras: [{ product: extra({ maxQuantity: null }), quantity: 12 }],
    });

    expect(result.lines[0]?.quantity).toBe(12);
  });
});

/* -------------------------------------------------------------------------- */
/* Quota et délais                                                             */
/* -------------------------------------------------------------------------- */

describe("computeOrder — quota et délais", () => {
  it("cumule les photos du pack et celles accordées par les extras", () => {
    const result = computeOrder({
      pack: pack({ photosIncluded: 20 }),
      extras: [
        { product: extra({ extraPhotosGranted: 1 }), quantity: 5 },
        { product: extra({ extraPhotosGranted: 2 }), quantity: 1 },
      ],
    });

    expect(result.photosQuota).toBe(27);
  });

  it("retombe sur le maximum de photos quand le pack n'en inclut pas", () => {
    const result = computeOrder({
      pack: pack({ photosIncluded: null, photosMax: 40 }),
      extras: [],
    });

    expect(result.photosQuota).toBe(40);
  });

  it("retient le délai le plus long, pas la somme", () => {
    const result = computeOrder({
      pack: pack({ turnaroundDaysMax: 5 }),
      extras: [{ product: extra({ turnaroundDaysMax: 3 }), quantity: 4 }],
    });

    expect(result.turnaroundDays).toBe(5);
  });

  it("allonge le délai si un extra est plus lent que le pack", () => {
    const result = computeOrder({
      pack: pack({ turnaroundDaysMax: 5 }),
      extras: [{ product: extra({ turnaroundDaysMax: 10 }), quantity: 1 }],
    });

    expect(result.turnaroundDays).toBe(10);
  });

  it("cumule les pages accordées par les extras", () => {
    const result = computeOrder({
      pack: pack({ family: "photobook", pagesIncluded: 30 }),
      extras: [{ product: extra({ extraPagesGranted: 4 }), quantity: 2 }],
    });

    expect(result.pagesGranted).toBe(38);
  });
});

/* -------------------------------------------------------------------------- */
/* Robustesse                                                                  */
/* -------------------------------------------------------------------------- */

describe("computeOrder — robustesse", () => {
  it("refuse un prix négatif plutôt que de le répercuter sur le total", () => {
    // Un prix aberrant ne doit jamais produire une commande payable négative :
    // le total sert à facturer, à encaisser et à déclarer.
    const result = computeOrder({
      pack: pack({ priceMillimes: -DT(50) }),
      extras: [{ product: extra({ priceMillimes: DT(10) }), quantity: 1 }],
    });

    expect(result.totalMillimes).toBe(DT(10));
  });

  it("conserve des montants entiers : aucune division ne passe par un flottant", () => {
    // 0,1 + 0,2 = 0,30000000000000004 en flottant. Les millimes sont des
    // entiers, le total doit le rester.
    const result = computeOrder({
      pack: pack({ priceMillimes: 100 }),
      extras: [{ product: extra({ priceMillimes: 200 }), quantity: 1 }],
    });

    expect(Number.isInteger(result.totalMillimes)).toBe(true);
    expect(result.totalMillimes).toBe(300);
  });
});
