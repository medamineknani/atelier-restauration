import { describe, expect, it } from "vitest";

import { addBusinessDays, formatPrice, priceLabel, toMillimes } from "./utils";

/* -------------------------------------------------------------------------- */
/* Argent                                                                      */
/* -------------------------------------------------------------------------- */

describe("millimes", () => {
  it("convertit des dinars en millimes entiers", () => {
    expect(toMillimes(99)).toBe(99_000);
    expect(toMillimes(0.5)).toBe(500);
  });

  it("arrondit au millime le plus proche", () => {
    expect(toMillimes(12.3456)).toBe(12_346);
  });
});

describe("formatPrice", () => {
  it("masque les décimales quand le montant est rond", () => {
    // « 99,000 DT » serait illisible et ferait amateur sur une facture.
    expect(formatPrice(99_000).amount).toBe("99");
  });

  it("affiche trois décimales dès qu'il y a des millimes", () => {
    expect(formatPrice(99_500).amount).toBe("99,500");
    expect(formatPrice(7_025).amount).toBe("7,025");
  });

  it("annonce toujours la devise", () => {
    expect(formatPrice(99_000).currency).toBe("DT");
  });

  it("n'affiche jamais un montant négatif", () => {
    // Un affichage négatif sur un devis est un incident commercial, même si
    // la valeur vient d'une donnée corrompue.
    expect(formatPrice(-5_000).amount).not.toContain("-");
  });
});

describe("priceLabel", () => {
  it("sépare le montant et la devise", () => {
    expect(priceLabel(199_000)).toBe("199 DT");
  });

  it("reste cohérent avec formatPrice", () => {
    const { amount, currency } = formatPrice(199_500);
    expect(priceLabel(199_500)).toBe(`${amount} ${currency}`);
  });
});

/* -------------------------------------------------------------------------- */
/* Délais                                                                      */
/* -------------------------------------------------------------------------- */

describe("addBusinessDays", () => {
  it("saute le week-end", () => {
    // vendredi 2 octobre 2026 + 1 jour ouvré → lundi 5
    const friday = new Date("2026-10-02T09:00:00");
    const result = addBusinessDays(friday, 1);

    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(5);
  });

  it("compte cinq jours ouvrés sans compter les deux week-end days", () => {
    // lundi 5 octobre + 5 → lundi 12 (week-ends des 10-11 exclus)
    const monday = new Date("2026-10-05T09:00:00");
    const result = addBusinessDays(monday, 5);

    expect(result.getDate()).toBe(12);
    expect(result.getDay()).toBe(1);
  });

  it("renvoie la date de départ quand le délai est nul", () => {
    const monday = new Date("2026-10-05T09:00:00");
    expect(addBusinessDays(monday, 0).getTime()).toBe(monday.getTime());
  });

  it("ne modifie pas la date passée en argument", () => {
    // L'appelant réutilise souvent la même date pour calculer une fenêtre.
    const from = new Date("2026-10-05T09:00:00");
    const before = from.getTime();
    addBusinessDays(from, 10);

    expect(from.getTime()).toBe(before);
  });

  it("traverse une année sans boucler", () => {
    const result = addBusinessDays(new Date("2026-12-28T09:00:00"), 10);
    expect(result.getFullYear()).toBe(2027);
  });
});
