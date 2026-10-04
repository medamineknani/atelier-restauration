/**
 * Prépare les images statiques du site (hero, photobook) depuis assets/sources.
 * Sortie AVIF + WebP + JPEG de repli, dans public/images.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCES = path.join(process.cwd(), "assets", "sources");
const OUT = path.join(process.cwd(), "public", "images");

type Target = { file: string; width: number; height: number; focus?: string };

const TARGETS: Target[] = [
  { file: "hero-atelier.jpg", width: 1800, height: 1200 },
  { file: "photobook-premium.jpg", width: 1400, height: 1000 },
];

async function main() {
  await mkdir(OUT, { recursive: true });

  for (const target of TARGETS) {
    const base = target.file.replace(/\.(jpe?g|png|webp)$/i, "");
    const source = path.join(SOURCES, target.file);

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
      const tiny = await sharp(source).resize(16, 9, { fit: "cover" }).blur(1.5).webp({ quality: 40 }).toBuffer();
      const { writeFile } = await import("node:fs/promises");
      await writeFile(path.join(OUT, `${base}.b64.txt`), tiny.toString("base64"), "utf8");
    }

    console.log(`  • ${base} (${target.width}×${target.height})`);
  }
  console.log("✔ Images publiques générées");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
