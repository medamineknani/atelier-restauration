/**
 * Fabrique les paires avant / après de la galerie.
 *
 * Les images sources sont des photographies d'époque générées (aucune personne
 * réelle, donc aucun droit à l'image ni donnée personnelle). Ce script produit,
 * pour chaque source, une version « restaurée » et une version « abîmée » obtenue
 * par dégradation programmatique : décoloration, bruit, taches d'humidité,
 * rayures, moisissures, artefacts JPEG, vignettage.
 *
 *   npm run gallery
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCES_DIR = path.join(process.cwd(), "assets", "sources");
const OUT_DIR = path.join(process.cwd(), ".data", "files", "gallery");

const DISPLAY_WIDTH = 1400;
const THUMB_WIDTH = 480;

/* -------------------------------------------------------------------------- */
/* Aléatoire déterministe (les dégradations restent stables d'un run à l'autre) */
/* -------------------------------------------------------------------------- */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------------------------- */
/* Couches de dégradation                                                      */
/* -------------------------------------------------------------------------- */

function noiseBuffer(width: number, height: number, amplitude: number, rand: () => number) {
  const data = Buffer.alloc(width * height * 3);
  for (let i = 0; i < data.length; i += 3) {
    const v = 128 + Math.round((rand() - 0.5) * 2 * amplitude);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  return sharp(data, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

function stainsSvg(width: number, height: number, rand: () => number) {
  const count = 5 + Math.floor(rand() * 5);
  let shapes = "";
  for (let i = 0; i < count; i += 1) {
    const cx = Math.round(rand() * width);
    const cy = Math.round(rand() * height);
    const rx = Math.round((0.06 + rand() * 0.16) * width);
    const ry = Math.round(rx * (0.6 + rand() * 0.6));
    const opacity = (0.06 + rand() * 0.16).toFixed(3);
    const hue = 26 + Math.round(rand() * 18);
    shapes += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="hsl(${hue},42%,38%)" opacity="${opacity}"/>`;
  }
  // Moisissures dans les coins
  for (let i = 0; i < 3; i += 1) {
    const cx = rand() > 0.5 ? Math.round(rand() * width * 0.25) : Math.round(width * 0.75 + rand() * width * 0.25);
    const cy = rand() > 0.5 ? Math.round(rand() * height * 0.25) : Math.round(height * 0.75 + rand() * height * 0.25);
    const r = Math.round((0.1 + rand() * 0.14) * width);
    shapes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="hsl(38,30%,30%)" opacity="${(0.08 + rand() * 0.12).toFixed(3)}"/>`;
  }
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs><filter id="b"><feGaussianBlur stdDeviation="${Math.round(width * 0.012)}"/></filter></defs>
      <g filter="url(#b)">${shapes}</g>
    </svg>`,
  );
}

function scratchesSvg(width: number, height: number, rand: () => number) {
  const count = 10 + Math.floor(rand() * 12);
  let lines = "";
  for (let i = 0; i < count; i += 1) {
    const vertical = rand() > 0.45;
    const x1 = Math.round(rand() * width);
    const y1 = Math.round(rand() * height);
    const len = Math.round((0.25 + rand() * 0.7) * (vertical ? height : width));
    const x2 = vertical ? x1 + Math.round((rand() - 0.5) * 24) : x1 + len;
    const y2 = vertical ? y1 + len : y1 + Math.round((rand() - 0.5) * 24);
    const light = rand() > 0.4;
    const color = light ? "rgba(255,255,255,0.55)" : "rgba(40,30,20,0.45)";
    const w = (0.6 + rand() * 1.6).toFixed(2);
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
  }
  // Poussières
  for (let i = 0; i < 90; i += 1) {
    const cx = Math.round(rand() * width);
    const cy = Math.round(rand() * height);
    const r = (0.6 + rand() * 1.8).toFixed(2);
    lines += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,255,255,0.5)"/>`;
  }
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${lines}</svg>`,
  );
}

function vignetteSvg(width: number, height: number, strength: number) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <radialGradient id="v" cx="50%" cy="50%" r="72%">
          <stop offset="55%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="rgb(${Math.round(255 * strength)},${Math.round(
            255 * strength,
          )},${Math.round(255 * strength)})"/>
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#v)"/>
    </svg>`,
  );
}

/* -------------------------------------------------------------------------- */
/* Pipeline                                                                    */
/* -------------------------------------------------------------------------- */

async function blurPlaceholder(buffer: Buffer) {
  const tiny = await sharp(buffer).resize(16, 16, { fit: "inside" }).blur(1.2).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${tiny.toString("base64")}`;
}

async function makeAfter(source: Buffer, width: number, height: number) {
  // « Restauré » : contraste et netteté corrigés, grain léger, rien de plus.
  // Surtout pas de lissage : le résultat doit rester une photographie.
  return sharp(source)
    .resize(width, height, { fit: "cover", position: "centre" })
    .linear(1.06, -6)
    .modulate({ saturation: 1.06 })
    .sharpen({ sigma: 0.9, m1: 0.6, m2: 0.35 })
    .webp({ quality: 86, effort: 5 })
    .toBuffer();
}

async function makeBefore(source: Buffer, width: number, height: number, seed: number, severity: number) {
  const rand = mulberry32(seed);

  // 1. Décoloration + voile laiteux (noirs remontés) + flou optique
  const degraded = sharp(source)
    .resize(width, height, { fit: "cover", position: "centre" })
    .modulate({ saturation: 0.28, brightness: 0.94 })
    .linear(1.05, 16) // noirs remontés = photo "passée"
    .blur(0.9 + severity * 0.7);

  let buffer = await degraded.toBuffer();

  // 2. Taches d'humidité et moisissures
  buffer = await sharp(buffer)
    .composite([{ input: await stainsSvg(width, height, rand), blend: "multiply" }])
    .toBuffer();

  // 3. Bruit de capteur / grain argentique mal conservé
  buffer = await sharp(buffer)
    .composite([
      { input: await noiseBuffer(width, height, 30 + severity * 26, rand), blend: "overlay" },
    ])
    .toBuffer();

  // 4. Rayures, pliures, poussières
  buffer = await sharp(buffer)
    .composite([{ input: await scratchesSvg(width, height, rand), blend: "over" }])
    .toBuffer();

  // 5. Vignettage et artefacts de compression
  buffer = await sharp(buffer)
    .composite([{ input: await vignetteSvg(width, height, 0.45), blend: "multiply" }])
    .jpeg({ quality: Math.round(20 - severity * 8), chromaSubsampling: "4:2:0" })
    .toBuffer();

  return sharp(buffer).webp({ quality: 80, effort: 5 }).toBuffer();
}

async function buildOne(file: string, index: number) {
  const slug = file.replace(/\.(jpg|jpeg|png|webp)$/i, "");
  const sourcePath = path.join(SOURCES_DIR, file);
  const outDir = path.join(OUT_DIR, slug);
  await mkdir(outDir, { recursive: true });

  const meta = await sharp(sourcePath).metadata();
  const srcW = meta.width ?? 1200;
  const srcH = meta.height ?? 900;

  // Cadrage cohérent 4:5 pour les portraits, 3:2 pour les scènes
  const portrait = srcH > srcW;
  const width = DISPLAY_WIDTH;
  const height = portrait ? Math.round(DISPLAY_WIDTH * 1.25) : Math.round(DISPLAY_WIDTH * 0.667);

  const source = await sharp(sourcePath)
    .resize(width, height, { fit: "cover", position: "centre" })
    .toBuffer();

  const severity = [0.5, 1, 0.8, 0.6, 0.9][index % 5] ?? 0.8;

  const after = await makeAfter(source, width, height);
  const before = await makeBefore(source, width, height, 1000 + index * 77, severity);

  const afterThumb = await sharp(after).resize(THUMB_WIDTH).webp({ quality: 78 }).toBuffer();
  const beforeThumb = await sharp(before).resize(THUMB_WIDTH).webp({ quality: 78 }).toBuffer();

  await writeFile(path.join(outDir, "after.webp"), after);
  await writeFile(path.join(outDir, "before.webp"), before);
  await writeFile(path.join(outDir, "after-thumb.webp"), afterThumb);
  await writeFile(path.join(outDir, "before-thumb.webp"), beforeThumb);

  const blurAfter = await blurPlaceholder(afterThumb);
  const blurBefore = await blurPlaceholder(beforeThumb);

  // Fichier de métadonnées consommé par le seed
  const manifest = {
    slug,
    width,
    height,
    after: `gallery/${slug}/after.webp`,
    before: `gallery/${slug}/before.webp`,
    afterThumb: `gallery/${slug}/after-thumb.webp`,
    beforeThumb: `gallery/${slug}/before-thumb.webp`,
    blurAfter,
    blurBefore,
  };
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`  • ${slug} (${width}×${height})`);
}

async function main() {
  const files = (await readdir(SOURCES_DIR)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  if (files.length === 0) {
    console.error("Aucune source dans assets/sources");
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });
  for (const [index, file] of files.entries()) {
    await buildOne(file, index);
  }
  console.log(`✔ ${files.length} paire(s) avant/après générée(s)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
