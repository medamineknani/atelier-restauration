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
 * État conservé hors du module : Next évalue ce fichier dans deux graphes
 * distincts (celui des composants serveur et celui des actions de route), et
 * le rejoue à chaque rechargement à chaud. Sans ce relais sur `globalThis`,
 * on ouvrirait plusieurs fois le même répertoire PGlite, qui n'accepte qu'un
 * seul client à la fois.
 */
const globalForDb = globalThis as unknown as {
  __atelierDb?: DB;
  __atelierPglite?: PGlite;
  __atelierDbClosing?: Promise<void>;
  __atelierDbShutdownHooked?: boolean;
};

/**
 * Client base de données.
 *
 * - Avec `DATABASE_URL` : Postgres managé (production / staging).
 * - Sans : Postgres embarqué (PGlite) dans `.data/pg`. **Même dialecte SQL**,
 *   aucun serveur ni Docker à installer pour développer.
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
 *
 * La promesse est mémorisée : deux `close()` simultanés sur le même client se
 * gênent et n'aboutissent jamais, ce qui arriverait à chaque arrêt puisque ce
 * module est évalué dans deux graphes.
 */
export function closeDb(): Promise<void> {
  if (globalForDb.__atelierDbClosing) return globalForDb.__atelierDbClosing;

  const client = globalForDb.__atelierPglite;
  if (!client) return Promise.resolve();

  globalForDb.__atelierDbClosing = Promise.race([
    client.close(),
    // En cas de fermeture récalcitrante, on ne bloque pas l'arrêt du serveur.
    new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
  ]);

  return globalForDb.__atelierDbClosing;
}

/**
 * Ferme la base puis arrête le processus.
 *
 * Le serveur ne doit pas s'éteindre avant que PGlite ait écrit : d'où
 * l'attente, puis la sortie explicite.
 */
function shutdown(code: number) {
  return () => {
    void closeDb().finally(() => process.exit(code));
  };
}

if (globalForDb.__atelierPglite && !globalForDb.__atelierDbShutdownHooked) {
  globalForDb.__atelierDbShutdownHooked = true;
  // Uniquement sur signal. `beforeExit` serait une maladresse grave : Node
  // l'émet dès que la boucle d'événements se vide, ce qui arrive à un serveur
  // même en pleine activité — on l'a vu couper net un parcours au milieu.
  process.once("SIGINT", shutdown(130));
  process.once("SIGTERM", shutdown(143));
}

export { schema };
