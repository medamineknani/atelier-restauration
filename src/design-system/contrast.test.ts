import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* -------------------------------------------------------------------------- */
/* Lecture de la palette                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Les couleurs vivent dans `theme.css`, pas dans un fichier TypeScript : ce
 * test les relit à la source. Modifier la palette sans vérifier les contrastes
 * fait échouer la suite — c'est le but.
 */
const THEME = readFileSync(
  path.resolve(process.cwd(), "src/design-system/theme.css"),
  "utf-8",
);

const TYPOGRAPHY = readFileSync(
  path.resolve(process.cwd(), "src/design-system/typography.css"),
  "utf-8",
);

const palette: Record<string, string> = {};
for (const match of THEME.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
  const name = match[1];
  const value = match[2];
  if (name && value) palette[name] = value.toLowerCase();
}

function color(name: string): string {
  const value = palette[name];
  if (!value) throw new Error(`couleur « ${name} » absente du thème`);
  return value;
}

/* -------------------------------------------------------------------------- */
/* Contraste                                                                   */
/* -------------------------------------------------------------------------- */

function channel(value: number) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const h = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => channel(parseInt(h.slice(i, i + 2), 16)));
  const r = channels[0] ?? 0;
  const g = channels[1] ?? 0;
  const b = channels[2] ?? 0;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste WCAG, de 1 (identiques) à 21 (noir sur blanc). */
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/* -------------------------------------------------------------------------- */
/* Les couples réellement employés                                             */
/* -------------------------------------------------------------------------- */

/** Fonds clairs sur lesquels du texte est effectivement posé. */
const LIGHT_BACKGROUNDS = ["paper", "cream"];

/** Fonds sombres : sections « encre », pied de page sombre, CTA final. */
const DARK_BACKGROUNDS = ["ink", "ink-soft"];

/** Texte posé sur les fonds clairs. */
const TEXT_ON_LIGHT = [
  "ink",
  "ink-soft",
  "graphite",
  "stone",
  "muted",
  "champagne-deep",
  "success",
  "warning",
  "danger",
  "info",
];

/**
 * Texte posé sur les fonds sombres.
 *
 * `muted` et `stone` en sont volontairement absents : ce sont des gris moyens
 * qui ne tiennent 4,5:1 ni sur fond clair ni sur fond sombre, et les sections
 * sombres leur préfèrent `paper`, `paper/70` ou le champagne.
 */
const TEXT_ON_DARK = ["paper", "cream", "champagne-soft", "champagne"];

describe("contraste du texte", () => {
  // WCAG 2.2 — 1.4.3 « Contraste (minimum) » : 4,5:1 pour le texte courant.
  it.each(TEXT_ON_LIGHT)("%s reste lisible sur les fonds clairs", (name) => {
    for (const bg of LIGHT_BACKGROUNDS) {
      const ratio = contrast(color(name), color(bg));
      expect(ratio, `${name} sur ${bg} : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(TEXT_ON_DARK)("%s reste lisible sur les fonds sombres", (name) => {
    for (const bg of DARK_BACKGROUNDS) {
      const ratio = contrast(color(name), color(bg));
      expect(ratio, `${name} sur ${bg} : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("le papier à 70 % reste lisible sur les fonds sombres", () => {
    // `SectionHeading` écrit ses chapôs en `text-paper/70` sur fond encre.
    for (const bg of DARK_BACKGROUNDS) {
      const ink = color(bg).replace("#", "");
      const paper = color("paper").replace("#", "");
      const mixed = [0, 2, 4]
        .map((i) => {
          const foreground = parseInt(paper.slice(i, i + 2), 16);
          const background = parseInt(ink.slice(i, i + 2), 16);
          return Math.round(0.7 * foreground + 0.3 * background)
            .toString(16)
            .padStart(2, "0");
        })
        .join("");

      const ratio = contrast(`#${mixed}`, color(bg));
      expect(ratio, `paper/70 sur ${bg} : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("contraste du contour de focus", () => {
  // WCAG 2.2 — 1.4.11 « Contraste des éléments non textuels » : 3:1.
  // Un contour invisible au clavier rend le site inutilisable sans souris.
  //
  // Aucune teinte unique ne tient 3:1 à la fois sur le papier et sur l'encre :
  // le contour est donc une variable, reprise sur les surfaces sombres.
  const withoutComments = TYPOGRAPHY.replace(/\/\*[\s\S]*?\*\//g, "");

  /** Teinte par défaut : `var(--focus-ring, var(--color-…))`. */
  const fallback = withoutComments.match(/--focus-ring,\s*var\(--color-([a-z0-9-]+)\)/)?.[1];

  /** Teinte reprise sur `.bg-ink` / `.bg-ink-soft`. */
  const onDark = withoutComments.match(
    /\.bg-ink[^{]*\{[^}]*--focus-ring:\s*var\(--color-([a-z0-9-]+)\)/,
  )?.[1];

  it("la règle par défaut est bien déclarée", () => {
    expect(fallback, "contour de focus par défaut introuvable").toBeTruthy();
  });

  it("tient 3:1 sur les fonds clairs", () => {
    for (const bg of LIGHT_BACKGROUNDS) {
      const ratio = contrast(color(fallback ?? ""), color(bg));
      expect(ratio, `contour sur ${bg} : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    }
  });

  it("tient 3:1 sur les fonds sombres, où il change de teinte", () => {
    expect(onDark, "contour spécifique aux fonds sombres introuvable").toBeTruthy();
    for (const bg of DARK_BACKGROUNDS) {
      const ratio = contrast(color(onDark ?? ""), color(bg));
      expect(ratio, `contour sur ${bg} : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    }
  });
});
