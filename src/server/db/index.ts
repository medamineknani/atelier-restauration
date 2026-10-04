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
  return drizzlePglite(client, { schema });
}

const globalForDb = globalThis as unknown as { __atelierDb?: DB };

export const db: DB = globalForDb.__atelierDb ?? createDb();

if (!globalForDb.__atelierDb) globalForDb.__atelierDb = db;

export { schema };
