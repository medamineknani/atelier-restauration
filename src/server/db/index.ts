import "server-only";

import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/config/env";
import * as schema from "./schema";

export type DB = PgliteDatabase<typeof schema>;

/**
 * Client base de données.
 *
 * - Avec `DATABASE_URL` : Postgres managé (production / staging).
 * - Sans : Postgres embarqué (PGlite) dans `.data/pg`. **Même dialecte SQL**,
 *   aucun serveur ni Docker à installer pour développer.
 *
 * L'instance est mise en cache sur `globalThis` : en développement, le rechargement
 * à chaud des modules ne doit pas ouvrir deux fois la base.
 */
function createDb(): DB {
  if (env.DATABASE_URL) {
    const client = postgres(env.DATABASE_URL, { max: 5, prepare: false });
    return drizzlePostgres(client, { schema }) as unknown as DB;
  }

  // PGlite ne crée pas les répertoires parents.
  mkdirSync(".data", { recursive: true });
  const client = new PGlite({ dataDir: ".data/pg" });
  globalForDb.__atelierPglite = client;
  return drizzlePglite(client, { schema });
}

const globalForDb = globalThis as unknown as {
  __atelierDb?: DB;
  __atelierPglite?: PGlite;
  __atelierDbClosed?: boolean;
};

export const db: DB = globalForDb.__atelierDb ?? createDb();

if (!globalForDb.__atelierDb) globalForDb.__atelierDb = db;

/**
 * Ferme la base embarquée.
 *
 * PGlite tient l'état de Postgres dans un module WebAssembly : s'il meurt sans
 * fermer, le répertoire `.data/pg` reste dans un état que le démarrage suivant
 * ne sait plus relire — toutes les requêtes échouent alors par
 * « RuntimeError: Aborted() », et il ne reste qu'à tout reconstruire.
 *
 * Autrement dit : arrêter le serveur de développement effaçait les commandes,
 * les clients et les réglages. D'où cette fermeture explicite.
 */
export async function closeDb(): Promise<void> {
  const client = globalForDb.__atelierPglite;
  if (!client || globalForDb.__atelierDbClosed) return;
  globalForDb.__atelierDbClosed = true;

  // En cas de fermeture récalcitrante, on ne bloque pas l'arrêt du serveur.
  await Promise.race([
    client.close(),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
}

/**
 * Ferme la base puis arrête le processus.
 *
 * Le serveur ne doit pas s'éteindre avant que PGlite ait écrit : d'où
 * l'attente, puis la sortie explicite.
 */
function shutdown(signal: string) {
  return () => {
    void closeDb().finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
  };
}

if (globalForDb.__atelierPglite) {
  // `beforeExit` couvre les arrêts sans signal ; les deux signaux couvrent
  // Ctrl-C et l'arrêt demandé par l'outil ou l'hébergeur.
  process.once("beforeExit", shutdown("beforeExit"));
  process.once("SIGINT", shutdown("SIGINT"));
  process.once("SIGTERM", shutdown("SIGTERM"));
}

export { schema };
