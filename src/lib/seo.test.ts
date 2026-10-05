import { describe, expect, it } from "vitest";

import { truncateDescription } from "./seo";

/**
 * Les moteurs affichent environ 160 caractères, puis coupent. Une description
 * plus longue n'est pas une faute, mais elle est amputée au milieu d'un mot.
 */
describe("truncateDescription", () => {
  it("laisse un texte court intact", () => {
    const short = "Nous restaurons vos photographies abîmées, à la main.";
    expect(truncateDescription(short)).toBe(short);
  });

  it("ne dépasse jamais la limite demandée", () => {
    const long = "mot ".repeat(120).trim();
    const result = truncateDescription(long, 160);
    // 160 caractères, plus l'ellipse.
    expect(result.length).toBeLessThanOrEqual(161);
  });

  it("coupe sur un espace, jamais au milieu d'un mot", () => {
    const long = `${"restauration ".repeat(30)}fin`;
    const result = truncateDescription(long, 160);
    expect(result.endsWith("…")).toBe(true);
    // Le dernier mot avant l'ellipse est entier.
    expect(result.slice(0, -1).split(" ").at(-1)).toBe("restauration");
  });

  it("ne tronque pas un texte sans espace au point de le vider", () => {
    // Un mot unique très long : on coupe quand même, plutôt que de renvoyer
    // une chaîne vide.
    const result = truncateDescription("a".repeat(400), 160);
    expect(result.length).toBe(161);
    expect(result.startsWith("aaa")).toBe(true);
  });

  it("normalise les espaces multiples et les retours à la ligne", () => {
    // Le contenu vient parfois de la base, avec des retours à la ligne.
    expect(truncateDescription("Une  photo\n\nabîmée.")).toBe("Une photo abîmée.");
  });

  it("respecte une limite différente", () => {
    const text = "Un texte que l'on veut très court, vraiment très court.";
    expect(truncateDescription(text, 20).length).toBeLessThanOrEqual(21);
  });
});
