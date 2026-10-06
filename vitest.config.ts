import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Tests unitaires.
 *
 * Deux alias suffisent :
 *  - `@/` vers `src/`, pour que les tests importent comme le code ;
 *  - `server-only`, que Next fournit lui-même et qui n'existe donc pas hors de
 *    Next. Dans un test Node, tout est serveur : le module est un simple vide.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "src/test/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
