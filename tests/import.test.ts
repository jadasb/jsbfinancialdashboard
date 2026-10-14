import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { DEFAULT_SETTINGS, buildPositions, round2, summarize } from "@/lib/calc";
import { latestQuotes, listContributions, listInstruments, listSleeves, listTrades } from "@/lib/data";
import { commitImport, isoDate, parseTracker } from "@/lib/import-tracker";

const ctx = {
  settings: DEFAULT_SETTINGS,
  tickerToSleeve: new Map([["VOO", "core"], ["SGOV", "ballast"], ["ITA", "defense"], ["NLR", "nuclear"], ["CEG", "comparison"], ["CCJ", "comparison"]]),
  sleeveTargets: new Map([["core", 0.65], ["ballast", 0.125], ["defense", 0.1125], ["nuclear", 0.1125]]),
};

describe("tracker import (the owner's actual file)", () => {
  const buf = readFileSync("data/paper-trading-tracker.xlsx");

  it("Excel serial 46303 is 8 Oct 2026", () => {
    expect(isoDate(46303)).toBe("2026-10-08");
  });

  it("parses the four 8 Oct paper buys with blank fill prices", async () => {
    const p = await parseTracker(buf, ctx);
    expect(p.errors).toEqual([]);
    expect(p.data.trades.map((t) => [t.tradeDate, t.ticker, t.amountAed, t.priceUsd])).toEqual([
      ["2026-10-08", "VOO", 2600, null],
      ["2026-10-08", "SGOV", 500, null],
      ["2026-10-08", "ITA", 450, null],
      ["2026-10-08", "NLR", 450, null],
    ]);
    expect(round2(p.data.trades.reduce((a, t) => a + t.grossUsd, 0))).toBe(1089.18);
    expect(round2(p.data.trades.reduce((a, t) => a + t.feeUsd, 0))).toBe(4.77);
    expect(p.data.contributions).toEqual([expect.objectContaining({ date: "2026-10-08", amountAed: 4000 })]);
    expect(p.warnings.join("\n")).toMatch(/4 ledger trade\(s\) have no fill price/);
  });

  it("commits as paper, is idempotent, and leaves the real book empty", async () => {
    const h = await createDb({ memory: true });
    const p = await parseTracker(buf, ctx);
    await commitImport(h.db, p.data);
    await commitImport(h.db, p.data); // re-import must not duplicate
    expect(await listTrades(h.db, "paper")).toHaveLength(4);
    expect(await listContributions(h.db, "paper")).toHaveLength(1);
    expect(await listTrades(h.db, "real")).toHaveLength(0);

    // Owner fills prices in the sheet later → re-import updates the same rows.
    const filled = { ...p.data, trades: p.data.trades.map((t) => ({ ...t, priceUsd: { VOO: 150, SGOV: 100.6, ITA: 158, NLR: 98 }[t.ticker]! })) };
    await commitImport(h.db, filled);
    const rows = await listTrades(h.db, "paper");
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.priceUsd != null && r.isPaper)).toBe(true);

    // End to end through the DB: same numbers as the spreadsheet check.
    const sleeves = await listSleeves(h.db);
    expect((await listInstruments(h.db)).length).toBe(6);
    const tl = rows.map((r) => ({ ...r, side: r.side as "buy" | "sell" }));
    const quotes = new Map([["VOO", 150], ["SGOV", 100.6], ["ITA", 158], ["NLR", 98]].map(([t, c]) => [t as string, { closeUsd: c as number, date: "2026-10-08", source: "test" }]));
    const snap = summarize(buildPositions(tl, quotes), sleeves, await listContributions(h.db, "paper"), tl, DEFAULT_SETTINGS);
    expect(round2(snap.costBasisUsd)).toBe(1089.18);
    expect(round2(snap.feesUsd)).toBe(4.77);
    expect(round2(snap.gainUsd!)).toBe(-4.77);
    expect(await latestQuotes(h.db, ["VOO"])).toEqual(new Map());
    await h.close();
  });
});
