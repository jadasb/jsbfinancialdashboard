import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { lastFetch, latestQuotes, upsertPrice } from "@/lib/data";
import { parseQuote, refreshPrices } from "@/lib/market-data";

// Shape from https://twelvedata.com/docs#quote (example values, not market data).
const ok = (symbol: string, close: string) => ({ symbol, datetime: "2026-10-14", close, previous_close: "1", is_market_open: false });

describe("Twelve Data quote parsing", () => {
  it("parses a quote", () => {
    expect(parseQuote("VOO", ok("VOO", "148.85001"))).toEqual({ ticker: "VOO", ok: true, closeUsd: 148.85001, date: "2026-10-14", marketOpen: false });
  });
  it("surfaces provider errors instead of a number", () => {
    expect(parseQuote("VOO", { code: 429, message: "You have run out of API credits", status: "error" })).toEqual({
      ticker: "VOO", ok: false, error: "429: You have run out of API credits",
    });
    expect(parseQuote("VOO", { symbol: "VOO", close: "abc", datetime: "2026-10-14" }).ok).toBe(false);
    expect(parseQuote("VOO", ok("SPY", "1")).ok).toBe(false);
  });
});

describe("refreshPrices", () => {
  it("stores good quotes, logs failures, respects the cache, never overwrites manual prices", async () => {
    const h = await createDb({ memory: true });
    process.env.MARKET_DATA_API_KEY = "test";
    await upsertPrice(h.db, { ticker: "NLR", date: "2026-10-13", closeUsd: 99, source: "manual" });
    let calls = 0;
    const fetcher = (async (url: string) => {
      calls++;
      const sym = new URL(url).searchParams.get("symbol")!;
      const body = sym === "NLR" ? { code: 404, message: "symbol not found", status: "error" } : ok(sym, "100");
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;

    const r = await refreshPrices(h.db, ["VOO", "NLR"], { fetcher });
    expect(r.status).toBe("done");
    const q = await latestQuotes(h.db, ["VOO", "NLR"]);
    expect(q.get("VOO")).toMatchObject({ closeUsd: 100, source: "twelvedata" });
    expect(q.get("NLR")).toMatchObject({ closeUsd: 99, source: "manual" });
    const log = await lastFetch(h.db);
    expect(log?.ok).toBe(false);
    expect(log?.message).toMatch(/NLR: 404: symbol not found/);

    // Within TTL: no second call, even though the last attempt partly failed.
    expect((await refreshPrices(h.db, ["VOO", "NLR"], { fetcher })).status).toBe("skipped");
    expect(calls).toBe(2);
    delete process.env.MARKET_DATA_API_KEY;
    expect((await refreshPrices(h.db, ["VOO"], { fetcher, force: true })).status).toBe("skipped");
    await h.close();
  });
});
