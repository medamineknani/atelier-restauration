/**
 * Applique les migrations Drizzle.
 *
 * Fonctionne aussi bien sur Postgres managé (DATABASE_URL) que sur le Postgres
 * embarqué PGlite utilisé en développement — donc sans serveur ni Docker.
 */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

type Journal = { entries: { idx: number; tag: string }[] };
type Row = { tag?: string };
type Executor = (sql: string) => Promise<Row[]>;

async function main() {
  let journal: Journal;
  try {
    journal = JSON.parse(
      await readFile(path.join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf8"),
    ) as Journal;
  } catch {
    console.error("Aucune migration trouvée. Lance d'abord : npm run db:generate");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  let close: () => Promise<void>;

  let execute: Executor;
  if (databaseUrl) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(databaseUrl, { max: 1 });
    const db = drizzle(client);
    execute = async (sql) => (await db.execute(sql as never)) as unknown as Row[];
    close = async () => {
      await client.end();
    };
  } else {
    // PGlite ne crée pas les répertoires parents.
    await mkdir(".data", { recursive: true });
    const client = new PGlite({ dataDir: ".data/pg" });
    execute = async (sql) => {
      const result = await client.query<Record<string, unknown>>(sql);
      return result.rows as Row[];
    };
    close = async () => {
      await client.close();
    };
  }

  await execute(`create table if not exists __drizzle_migrations (
    id serial primary key,
    tag text not null unique,
    applied_at timestamptz not null default now()
  )`);

  const appliedRows = await execute("select tag from __drizzle_migrations");
  const applied = new Set(appliedRows.map((r) => String(r.tag)));

  let count = 0;
  for (const entry of journal.entries) {
    if (applied.has(entry.tag)) continue;
    const sqlText = await readFile(path.join(MIGRATIONS_DIR, `${entry.tag}.sql`), "utf8");
    for (const statement of sqlText.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean)) {
      await execute(statement);
    }
    await execute(
      `insert into __drizzle_migrations (tag) values ('${entry.tag}') on conflict do nothing`,
    );
    console.log(`  • ${entry.tag}`);
    count += 1;
  }

  console.log(count === 0 ? "✔ Base à jour" : `✔ ${count} migration(s) appliquée(s)`);
  await close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
