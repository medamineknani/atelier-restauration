import "server-only";

import { createReadStream, stat } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, normalize, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import type { StorageDriver } from "./types";

/**
 * Pilote système de fichiers.
 *
 * Réservé au développement et aux installations sur serveur unique : les
 * objets sont posés dans `STORAGE_LOCAL_DIR`, jamais servis directement par
 * le serveur web. Rien de ce répertoire ne doit se trouver dans `public/`.
 */
export function createLocalDriver(root: string): StorageDriver {
  const base = resolve(root);

  /**
   * Empêche toute remontée hors du répertoire racine : une clé contenant
   * `../` ou absolue est rejetée. C'est la seule défense contre une clé
   * forgée qui viserait `/etc/passwd`.
   */
  function safePath(key: string) {
    const clean = normalize(key).replace(/^(\.\.[/\\])+/, "");
    const full = resolve(base, clean);
    if (full !== base && !full.startsWith(base + sep)) {
      throw new Error(`Clé de stockage invalide : ${key}`);
    }
    return full;
  }

  return {
    name: "local",

    async put(key, body) {
      const full = safePath(key);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, body);
    },

    async get(key) {
      try {
        return await readFile(safePath(key));
      } catch {
        return null;
      }
    },

    async getStream(key) {
      try {
        const full = safePath(key);
        await new Promise<void>((resolve, reject) =>
          stat(full, (error) => (error ? reject(error) : resolve())),
        );
        return Readable.toWeb(createReadStream(full)) as ReadableStream<Uint8Array>;
      } catch {
        return null;
      }
    },

    async remove(key) {
      try {
        await rm(safePath(key), { force: true });
      } catch {
        /* un fichier déjà absent n'est pas une erreur */
      }
    },

    // Pas d'envoi direct possible : le serveur reçoit le fichier et le range
    // lui-même (voir /api/uploads/local).
    async createUploadUrl() {
      return null;
    },
  };
}
