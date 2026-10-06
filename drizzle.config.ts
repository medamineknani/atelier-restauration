import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit pilote les migrations.
 * En développement la base est un Postgres embarqué (PGlite) dans `.data/pg` —
 * `npm run db:migrate` l'applique directement, sans serveur ni Docker.
 * En production, `DATABASE_URL` pointe vers un Postgres managé.
 */
export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./.data/pg",
  },
  verbose: true,
  strict: true,
} satisfies Config;
