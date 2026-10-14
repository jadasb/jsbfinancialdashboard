// Twelve Data client (https://twelvedata.com/docs#quote).
// One request per symbol: the docs specify the single-symbol /quote shape but not
// the batch response shape, so we do not rely on it. 1 credit per symbol.
// Failures are returned per ticker and logged; a price is never filled in.
import type { DB } from "@/db";
import { getSettings, lastFetch, logFetch, upsertPrice } from "./data";

export const PROVIDER = "twelvedata";

export type FetchResult =
  | { ticker: string; ok: true; closeUsd: number; date: string; marketOpen: boolean | null }
  | { ticker: string; ok: false; error: string };

type Fetcher = typeof fetch;

export function parseQuote(ticker: string, body: unknown): FetchResult {
  if (!body || typeof body !== "object") return { ticker, ok: false, error: "Empty response" };
  const b = body as Record<string, unknown>;
  if (b.status === "error") return { ticker, ok: false, error: `${b.code ?? "?"}: ${String(b.message ?? "unknown error")}` };
  const close = Number(b.close);
  const date = typeof b.datetime === "string" ? b.datetime.slice(0, 10) : "";
  if (!(close > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ticker, ok: false, error: "Response missing a valid close or datetime" };
  }
  if (typeof b.symbol === "string" && b.symbol.toUpperCase() !== ticker.toUpperCase()) {
    return { ticker, ok: false, error: `Provider returned ${b.symbol}, expected ${ticker}` };
  }
  return { ticker, ok: true, closeUsd: close, date, marketOpen: typeof b.is_market_open === "boolean" ? b.is_market_open : null };
}

export async function fetchQuotes(tickers: string[], apiKey: string, fetcher: Fetcher = fetch): Promise<FetchResult[]> {
  return Promise.all(tickers.map(async (ticker): Promise<FetchResult> => {
    try {
      const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(ticker)}`;
      const res = await fetcher(url, {
        headers: { Authorization: `apikey ${apiKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      const body = await res.json().catch(() => null);
      const parsed = parseQuote(ticker, body);
      return !res.ok && parsed.ok ? { ticker, ok: false, error: `HTTP ${res.status}` } : parsed;
    } catch (e) {
      return { ticker, ok: false, error: (e as Error).name === "TimeoutError" ? "Timed out" : (e as Error).message };
    }
  }));
}

export type RefreshOutcome =
  | { status: "skipped"; reason: string }
  | { status: "done"; results: FetchResult[] };

/**
 * Refresh prices if the cache is older than the TTL (or when forced).
 * Live quotes are stored with source "twelvedata"; manual and imported prices are never overwritten.
 */
export async function refreshPrices(db: DB, tickers: string[], opts: { force?: boolean; fetcher?: Fetcher } = {}): Promise<RefreshOutcome> {
  const key = process.env.MARKET_DATA_API_KEY?.trim();
  if (!key) return { status: "skipped", reason: "MARKET_DATA_API_KEY is not set. Prices are manual only." };
  if (tickers.length === 0) return { status: "skipped", reason: "No tickers to price." };

  if (!opts.force) {
    const s = await getSettings(db);
    const last = await lastFetch(db); // any attempt, so a failing ticker cannot burn credits on every page load
    if (last && Date.now() - last.fetchedAt.getTime() < s.priceTtlMinutes * 60_000) {
      return { status: "skipped", reason: "Cache is fresh." };
    }
  }

  const results = await fetchQuotes(tickers, key, opts.fetcher);
  for (const r of results) if (r.ok) await upsertPrice(db, { ticker: r.ticker, date: r.date, closeUsd: r.closeUsd, source: PROVIDER });
  const failed = results.filter((r): r is Extract<FetchResult, { ok: false }> => !r.ok);
  await logFetch(db, {
    provider: PROVIDER,
    ok: failed.length === 0,
    tickers,
    message: failed.length ? failed.map((f) => `${f.ticker}: ${f.error}`).join("; ") : `Updated ${results.length} tickers`,
  });
  return { status: "done", results };
}
