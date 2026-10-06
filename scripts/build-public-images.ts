/**
 * Génère toutes les images statiques et icônes du site depuis `assets/brand`.
 *
 *  • hero / photobook : AVIF + WebP + JPEG de repli dans public/images,
 *    plus la vignette floutée 16 px servant de placeholder LCP au hero.
 *  • og-atelier.jpg   : image de partage 1200×630 (OpenGraph / Twitter).
 *  • icônes           : src/app/icon.png (32), src/app/apple-icon.png (180),
 *                       public/favicon.ico (32, PNG encapsulé dans un conteneur ICO).
 *
 * Les sources vivent dans `assets/brand` et non dans `assets/sources` : ce
 * dernier répertoire est scanné par `build-gallery.ts`, qui ferait du hero
 * et du photobook des entrées de galerie.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BRAND = path.join(process.cwd(), "assets", "brand");
const OUT = path.join(process.cwd(), "public", "images");
const APP = path.join(process.cwd(), "src", "app");

type PhotoTarget = { file: string; width: number; height: number };

const PHOTOS: PhotoTarget[] = [
  { file: "hero-atelier.jpg", width: 1800, height: 1200 },
  { file: "photobook-premium.jpg", width: 1400, height: 1000 },
];

const OG = { file: "og-atelier.jpg", width: 1200, height: 630 };
const ICON_SOURCE = "icon-source.png";

/** Encapsule un PNG dans un conteneur ICO (supporté par tous les navigateurs depuis Vista). */
function toIco(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // réservé
  header.writeUInt16LE(1, 2); // type : icône
  header.writeUInt16LE(1, 4); // nombre d'images

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // largeur
  entry.writeUInt8(size === 256 ? 0 : size, 1); // hauteur
  entry.writeUInt8(0, 2); // couleurs de la palette (0 = pas de palette)
  entry.writeUInt8(0, 3); // réservé
  entry.writeUInt16LE(1, 4); // plans
  entry.writeUInt16LE(32, 6); // profondeur de couleur
  entry.writeUInt32LE(png.length, 8); // taille des données
  entry.writeUInt32LE(22, 12); // décalage (6 + 16)

  return Buffer.concat([header, entry, png]);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  /* --- Hero et photobook ------------------------------------------------- */
  for (const target of PHOTOS) {
    const base = target.file.replace(/\.(jpe?g|png|webp)$/i, "");
    const source = path.join(BRAND, target.file);

    const pipeline = sharp(source)
      .resize(target.width, target.height, { fit: "cover", position: "centre" })
      .modulate({ saturation: 0.92 })
      .linear(1.03, -4);

    await pipeline.clone().avif({ quality: 58, effort: 4 }).toFile(path.join(OUT, `${base}.avif`));
    await pipeline.clone().webp({ quality: 78, effort: 5 }).toFile(path.join(OUT, `${base}.webp`));
    await pipeline
      .clone()
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(path.join(OUT, `${base}.jpg`));

    // Vignette floutée LCP (16 px) pour le hero
    if (base.startsWith("hero")) {
      const tiny = await sharp(source)
        .resize(16, 9, { fit: "cover" })
        .blur(1.5)
        .webp({ quality: 40 })
        .toBuffer();
      await writeFile(path.join(OUT, `${base}.b64.txt`), tiny.toString("base64"), "utf8");
    }

    console.log(`  • ${base} (${target.width}×${target.height})`);
  }

  /* --- Image de partage 1200×630 ----------------------------------------- */
  const ogBase = OG.file.replace(/\.(jpe?g|png|webp)$/i, "");
  await sharp(path.join(BRAND, OG.file))
    .resize(OG.width, OG.height, { fit: "cover", position: "centre" })
    .modulate({ saturation: 0.92 })
    .linear(1.03, -4)
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(OUT, `${ogBase}.jpg`));
  console.log(`  • ${ogBase} (${OG.width}×${OG.height})`);

  /* --- Icônes ------------------------------------------------------------- */
  const iconSource = path.join(BRAND, ICON_SOURCE);
  await mkdir(APP, { recursive: true });

  // La source laisse beaucoup d'air autour du signe : à 16 px il disparaîtrait.
  // On rogne le fond uniforme, puis on replace le signe agrandi sur un fond
  // plein, avec une marge courte.
  const mark = await sharp(iconSource).trim().png().toBuffer();

  const iconAt = async (size: number, fill: number) => {
    const inner = await sharp(mark)
      .resize(Math.round(size * fill), Math.round(size * fill), { fit: "inside" })
      .png()
      .toBuffer();
    return sharp({
      create: { width: size, height: size, channels: 4, background: { r: 16, g: 15, b: 13, alpha: 1 } },
    })
      .composite([{ input: inner, gravity: "centre" }])
      .png()
      .toBuffer();
  };

  const icon32 = await iconAt(32, 0.86);
  await writeFile(path.join(APP, "icon.png"), icon32);
  await writeFile(path.join(process.cwd(), "public", "favicon.ico"), toIco(icon32, 32));
  console.log("  • icon.png + favicon.ico (32×32)");

  await writeFile(path.join(APP, "apple-icon.png"), await iconAt(180, 0.8));
  console.log("  • apple-icon.png (180×180)");

  console.log("✔ Images publiques et icônes générés");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
