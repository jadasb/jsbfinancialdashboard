// One database API, two engines:
//   DATABASE_URL set   -> Neon Postgres (production, Vercel)
//   DATABASE_URL unset -> PGlite, real Postgres compiled to WASM, stored in .data/pglite (local dev, tests)
// Migrations run automatically on first use, guarded by an advisory lock so
// concurrent cold starts cannot apply the same migration twice.
import type { SQL } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { migrations } from "./migrations";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

type Query = (sql: string) => Promise<Record<string, unknown>[]>;
type RawTx = <T>(fn: (q: Query) => Promise<T>) => Promise<T>;

const MIGRATION_LOCK_ID = 727274;

async function runMigrations(transaction: RawTx): Promise<string[]> {
  return transaction(async (q) => {
    await q(`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_ID})`);
    await q(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const done = new Set((await q("SELECT name FROM schema_migrations")).map((r) => String(r.name)));
    const applied: string[] = [];
    for (const m of migrations) {
      if (done.has(m.name)) continue;
      if (!/^[0-9a-z_]+$/.test(m.name)) throw new Error(`Bad migration name: ${m.name}`);
      await q(m.sql);
      await q(`INSERT INTO schema_migrations (name) VALUES ('${m.name}')`);
      applied.push(m.name);
    }
    return applied;
  });
}

async function createPglite(dataDir: string | undefined) {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  if (dataDir) {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dataDir, { recursive: true });
  }
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  await client.waitReady;
  const transaction: RawTx = (fn) =>
    client.transaction(async (tx) =>
      fn(async (sql) => {
        const results = await tx.exec(sql);
        return (results.at(-1)?.rows ?? []) as Record<string, unknown>[];
      }),
    );
  const db = drizzle({ client, schema }) as unknown as DB;
  return { db, transaction, close: () => client.close() };
}

async function createNeon(url: string) {
  const { Pool } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const pool = new Pool({ connectionString: url });
  const transaction: RawTx = async (fn) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const out = await fn(async (sql) => (await client.query(sql)).rows);
      await client.query("COMMIT");
      return out;
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  };
  const db = drizzle({ client: pool, schema }) as unknown as DB;
  return { db, transaction, close: () => pool.end() };
}

export type DbHandle = { db: DB; close: () => Promise<void>; migrated: string[] };

/** Create a connection and bring the schema up to date. `memory` gives a throwaway PGlite for tests. */
export async function createDb(opts: { url?: string; pgliteDir?: string; memory?: boolean } = {}): Promise<DbHandle> {
  const h = opts.url
    ? await createNeon(opts.url)
    : await createPglite(opts.memory ? undefined : (opts.pgliteDir ?? ".data/pglite"));
  const migrated = await runMigrations(h.transaction);
  return { db: h.db, close: h.close, migrated };
}

const g = globalThis as unknown as { __dbHandle?: Promise<DbHandle> };

/** Process-wide connection (survives Next dev hot reloads). */
export function getDb(): Promise<DB> {
  if (!g.__dbHandle) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url && process.env.VERCEL) {
      return Promise.reject(new Error("DATABASE_URL is not set. Add it in Vercel → Settings → Environment Variables."));
    }
    g.__dbHandle = createDb({ url: url || undefined, pgliteDir: process.env.PGLITE_DIR }).catch((e) => {
      g.__dbHandle = undefined;
      throw e;
    });
  }
  return g.__dbHandle.then((h) => h.db);
}

/** Raw SQL returning rows. Both drivers expose results as { rows }. */
export async function queryRows<T extends Record<string, unknown>>(db: DB, q: SQL): Promise<T[]> {
  return ((await db.execute(q)) as unknown as { rows: T[] }).rows;
}

export { schema };
