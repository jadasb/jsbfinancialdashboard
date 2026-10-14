// Database reads/writes used by pages and actions. Keeps SQL out of the UI.
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { contributions, instruments, priceFetchLog, prices, settings, sleeves, trades } from "@/db/schema";
import { DEFAULT_SETTINGS, type PlanSettings, type Quote } from "./calc";

export type Book = "paper" | "real";
export const isPaperBook = (b: Book) => b === "paper";
export const parseBook = (v: unknown): Book => (v === "real" ? "real" : "paper");

export async function getSettings(db: DB): Promise<PlanSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.key, "plan"));
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<PlanSettings>) ?? {}) };
}

export async function saveSettings(db: DB, s: PlanSettings): Promise<void> {
  await db
    .insert(settings)
    .values({ key: "plan", value: s })
    .onConflictDoUpdate({ target: settings.key, set: { value: s, updatedAt: new Date() } });
}

export const listSleeves = (db: DB) => db.select().from(sleeves).orderBy(asc(sleeves.sort));
export const listInstruments = (db: DB) => db.select().from(instruments).orderBy(asc(instruments.ticker));

export const listTrades = (db: DB, book: Book) =>
  db.select().from(trades).where(eq(trades.isPaper, isPaperBook(book))).orderBy(desc(trades.tradeDate), desc(trades.id));

export const listContributions = (db: DB, book: Book) =>
  db.select().from(contributions).where(eq(contributions.isPaper, isPaperBook(book))).orderBy(desc(contributions.date), desc(contributions.id));

/** Latest price per ticker: newest date wins; on the same date, the most recently fetched row. */
export async function latestQuotes(db: DB, tickers: string[]): Promise<Map<string, Quote>> {
  const out = new Map<string, Quote>();
  if (tickers.length === 0) return out;
  const rows = await db
    .selectDistinctOn([prices.ticker])
    .from(prices)
    .where(inArray(prices.ticker, tickers))
    .orderBy(prices.ticker, desc(prices.date), desc(prices.fetchedAt));
  for (const r of rows) out.set(r.ticker, { closeUsd: r.closeUsd, date: r.date, source: r.source, fetchedAt: r.fetchedAt });
  return out;
}

export async function recentPrices(db: DB, limit = 60) {
  return db.select().from(prices).orderBy(desc(prices.date), desc(prices.fetchedAt)).limit(limit);
}

export async function upsertPrice(db: DB, p: { ticker: string; date: string; closeUsd: number; source: string }) {
  await db
    .insert(prices)
    .values({ ...p, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: [prices.ticker, prices.date, prices.source],
      set: { closeUsd: p.closeUsd, fetchedAt: new Date() },
    });
}

export async function lastFetch(db: DB) {
  const [row] = await db.select().from(priceFetchLog).orderBy(desc(priceFetchLog.fetchedAt)).limit(1);
  return row ?? null;
}

export async function lastSuccessfulFetch(db: DB) {
  const [row] = await db
    .select()
    .from(priceFetchLog)
    .where(eq(priceFetchLog.ok, true))
    .orderBy(desc(priceFetchLog.fetchedAt))
    .limit(1);
  return row ?? null;
}

export async function logFetch(db: DB, entry: { provider: string; ok: boolean; tickers: string[]; message?: string }) {
  await db.insert(priceFetchLog).values({ ...entry, tickers: entry.tickers.join(",") });
  await db.delete(priceFetchLog).where(sql`${priceFetchLog.fetchedAt} < now() - interval '30 days'`);
}

export async function tradeTickers(db: DB): Promise<string[]> {
  const rows = await db.selectDistinct({ t: trades.ticker }).from(trades);
  return rows.map((r) => r.t);
}

export { and, eq };
