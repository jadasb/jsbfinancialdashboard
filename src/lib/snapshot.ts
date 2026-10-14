import { getDb } from "@/db";
import { buildPositions, planContribution, summarize } from "./calc";
import { getSettings, lastFetch, latestQuotes, listContributions, listInstruments, listSleeves, listTrades, type Book } from "./data";
import { refreshPrices } from "./market-data";

export async function loadSnapshot(book: Book) {
  const db = await getDb();
  const [settings, sleeves, insts, trades, contributions] = await Promise.all([
    getSettings(db), listSleeves(db), listInstruments(db), listTrades(db, book), listContributions(db, book),
  ]);
  const tickers = [...new Set([...insts.map((i) => i.ticker), ...trades.map((t) => t.ticker)])];

  // Refresh only when the cache is older than the TTL; failures are logged and shown, never filled in.
  let refreshError: string | null = null;
  try {
    await refreshPrices(db, tickers);
  } catch (e) {
    refreshError = (e as Error).message;
  }

  const [quotes, fetchLog] = await Promise.all([latestQuotes(db, tickers), lastFetch(db)]);
  const tl = trades.map((t) => ({ ...t, side: t.side as "buy" | "sell" }));
  const positions = buildPositions(tl, quotes);
  const snap = summarize(positions, sleeves, contributions, tl, settings);
  const values = snap.complete ? new Map(snap.sleeves.map((r) => [r.sleeve.id, r.valueUsd ?? 0])) : null;
  const plan = planContribution(sleeves, values, settings.monthlyContributionAed, settings);
  return { settings, snap, plan, quotes, insts, fetchLog, refreshError, tradeCount: trades.length, hasKey: !!process.env.MARKET_DATA_API_KEY };
}
