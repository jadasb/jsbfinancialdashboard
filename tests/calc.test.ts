import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS as S,
  aedToUsd,
  buildPositions,
  feeFor,
  planContribution,
  round2,
  splitWhole,
  summarize,
  type Quote,
  type SleeveLike,
  type TradeLike,
} from "@/lib/calc";

const SLEEVES: SleeveLike[] = [
  { id: "core", name: "US equity (S&P 500)", targetPct: 0.65, countsInPortfolio: true, sort: 1 },
  { id: "ballast", name: "Short-term Treasuries / TIPS", targetPct: 0.125, countsInPortfolio: true, sort: 2 },
  { id: "defense", name: "Defense / aerospace", targetPct: 0.1125, countsInPortfolio: true, sort: 3 },
  { id: "nuclear", name: "Nuclear energy", targetPct: 0.1125, countsInPortfolio: true, sort: 4 },
  { id: "wildcard", name: "Wildcard (parked)", targetPct: 0, countsInPortfolio: true, sort: 5 },
  { id: "comparison", name: "Comparisons", targetPct: 0, countsInPortfolio: false, sort: 6 },
];

const SPLIT: [string, string, number][] = [
  ["VOO", "core", 2600],
  ["SGOV", "ballast", 500],
  ["ITA", "defense", 450],
  ["NLR", "nuclear", 450],
];

// Format-only prices (from the tracker's Read Me example). Not market data.
const FILLS: Record<string, number> = { VOO: 150, SGOV: 100.6, ITA: 158, NLR: 98 };

function paydayBuys(date: string, fills: Record<string, number | null>): TradeLike[] {
  return SPLIT.map(([ticker, sleeveId, aed]) => {
    const gross = aedToUsd(aed, S.pegAedPerUsd);
    return {
      tradeDate: date, fillDate: date, ticker, sleeveId, side: "buy", units: null,
      priceUsd: fills[ticker] ?? null, grossUsd: gross, feeUsd: feeFor(gross, S), fxRateAedUsd: S.pegAedPerUsd,
    };
  });
}

const q = (closeUsd: number): Quote => ({ closeUsd, date: "2026-10-15", source: "test" });

describe("fees", () => {
  it("is the greater of $1 or 0.25%, in cents", () => {
    expect(feeFor(707.9646, S)).toBe(1.77);
    expect(feeFor(136.147, S)).toBe(1);
    expect(feeFor(400, S)).toBe(1);
    expect(feeFor(1000, S)).toBe(2.5);
    expect(feeFor(0, S)).toBe(0);
  });
});

describe("brief acceptance case (tracker test)", () => {
  const trades = paydayBuys("2026-10-08", FILLS);

  it("4,000 AED at 3.6725 = $1,089.18 invested and $4.77 fees", () => {
    const gross = trades.reduce((a, t) => a + t.grossUsd, 0);
    const fees = trades.reduce((a, t) => a + t.feeUsd, 0);
    expect(round2(gross)).toBe(1089.18);
    expect(round2(fees)).toBe(4.77);
  });

  it("units = (gross - fee) / fill, matching the spreadsheet formula", () => {
    const pos = buildPositions(trades, new Map());
    const voo = pos.find((p) => p.ticker === "VOO")!;
    expect(voo.units).toBeCloseTo((2600 / 3.6725 - 1.77) / 150, 10);
    expect(voo.costBasisUsd).toBeCloseTo(2600 / 3.6725, 10);
    expect(voo.costBasisAed).toBeCloseTo(2600, 8);
  });

  it("valued at the fill prices, loss equals fees exactly", () => {
    const quotes = new Map(Object.entries(FILLS).map(([k, v]) => [k, q(v)]));
    const pos = buildPositions(trades, quotes);
    const snap = summarize(pos, SLEEVES, [{ amountAed: 4000, fxRate: 3.6725 }], trades, S);
    expect(snap.complete).toBe(true);
    expect(round2(snap.costBasisUsd)).toBe(1089.18);
    expect(round2(snap.gainUsd!)).toBe(-4.77);
    expect(round2(snap.feesUsd)).toBe(4.77);
    expect(snap.feeDragPct!).toBeCloseTo(4.77 / 1089.17631, 5);
    expect(snap.cashUsd).toBeCloseTo(0, 8);
    expect(round2(snap.growthUsd!)).toBe(-4.77);
  });

  it("drift at purchase is only the fee distortion (well under 1pp)", () => {
    const quotes = new Map(Object.entries(FILLS).map(([k, v]) => [k, q(v)]));
    const snap = summarize(buildPositions(trades, quotes), SLEEVES, [], trades, S);
    const core = snap.sleeves.find((r) => r.sleeve.id === "core")!;
    // Core pays $1.77 on $707.96; satellites pay $1 on ~$122.53, so core ends slightly overweight.
    const expectedCore = (707.9646 - 1.77) / (1089.1763 - 4.77);
    expect(core.weight!).toBeCloseTo(expectedCore, 5);
    for (const r of snap.sleeves) expect(Math.abs(r.driftPp!)).toBeLessThan(1);
    expect(snap.sleeves.every((r) => r.status === "ok")).toBe(true);
  });

  it("missing fill prices are reported, never guessed", () => {
    const pending = paydayBuys("2026-10-08", {});
    const quotes = new Map(Object.entries(FILLS).map(([k, v]) => [k, q(v)]));
    const snap = summarize(buildPositions(pending, quotes), SLEEVES, [{ amountAed: 4000, fxRate: 3.6725 }], pending, S);
    expect(snap.complete).toBe(false);
    expect(snap.valueUsd).toBeNull();
    expect(snap.gainUsd).toBeNull();
    expect(round2(snap.costBasisUsd)).toBe(1089.18);
    expect(snap.problems.join(" ")).toMatch(/missing a fill price/);
  });
});

describe("gain/loss and average cost", () => {
  it("averages cost across buys and books realized P/L on sells", () => {
    const t: TradeLike[] = [
      { tradeDate: "2026-11-02", ticker: "VOO", sleeveId: "core", side: "buy", units: 10, priceUsd: 100, grossUsd: 1002.5, feeUsd: 2.5, fxRateAedUsd: 3.6725 },
      { tradeDate: "2026-12-01", ticker: "VOO", sleeveId: "core", side: "buy", units: 10, priceUsd: 120, grossUsd: 1203, feeUsd: 3, fxRateAedUsd: 3.6725 },
      { tradeDate: "2027-01-04", ticker: "VOO", sleeveId: "core", side: "sell", units: 5, priceUsd: 130, grossUsd: 650, feeUsd: 1.63, fxRateAedUsd: 3.6725 },
    ];
    const [p] = buildPositions(t, new Map([["VOO", q(140)]]));
    const avg = (1002.5 + 1203) / 20;
    expect(p!.units).toBe(15);
    expect(p!.realizedUsd).toBeCloseTo(650 - 1.63 - 5 * avg, 8);
    expect(p!.costBasisUsd).toBeCloseTo(15 * avg, 8);
    expect(p!.valueUsd).toBeCloseTo(15 * 140, 8);
    expect(p!.gainUsd).toBeCloseTo(15 * 140 - 15 * avg, 8);
  });

  it("explicit units override the price-derived units", () => {
    const [p] = buildPositions(
      [{ tradeDate: "2026-10-08", ticker: "VOO", sleeveId: "core", side: "buy", units: 4.7, priceUsd: 150, grossUsd: 707.96, feeUsd: 1.77, fxRateAedUsd: 3.6725 }],
      new Map(),
    );
    expect(p!.units).toBe(4.7);
  });

  it("rejects overselling instead of producing negative units", () => {
    const [p] = buildPositions(
      [
        { tradeDate: "2026-10-08", ticker: "ITA", sleeveId: "defense", side: "buy", units: 1, priceUsd: 100, grossUsd: 101, feeUsd: 1, fxRateAedUsd: 3.6725 },
        { tradeDate: "2026-10-09", ticker: "ITA", sleeveId: "defense", side: "sell", units: 2, priceUsd: 100, grossUsd: 200, feeUsd: 1, fxRateAedUsd: 3.6725 },
      ],
      new Map([["ITA", q(100)]]),
    );
    expect(p!.units).toBe(1);
    expect(p!.problems[0]).toMatch(/exceeds units held/);
    expect(p!.valueUsd).toBeNull();
  });

  it("keeps comparison holdings out of portfolio totals", () => {
    const trades: TradeLike[] = [
      ...paydayBuys("2026-10-08", FILLS),
      { tradeDate: "2026-10-08", ticker: "CEG", sleeveId: "comparison", side: "buy", units: 1, priceUsd: 270, grossUsd: 271, feeUsd: 1, fxRateAedUsd: 3.6725 },
    ];
    const quotes = new Map([...Object.entries(FILLS), ["CEG", 300]].map(([k, v]) => [k as string, q(v as number)]));
    const snap = summarize(buildPositions(trades, quotes), SLEEVES, [{ amountAed: 4000, fxRate: 3.6725 }], trades, S);
    expect(round2(snap.costBasisUsd)).toBe(1089.18);
    expect(snap.comparisons.map((p) => p.ticker)).toEqual(["CEG"]);
    expect(snap.cashUsd).toBeCloseTo(0, 8);
  });
});

describe("next-contribution planner", () => {
  it("splitWhole sums exactly", () => {
    expect(splitWhole(4000, [0.65, 0.125, 0.1125, 0.1125])).toEqual([2600, 500, 450, 450]);
    expect(splitWhole(4001, [1, 1, 1]).reduce((a, b) => a + b)).toBe(4001);
  });

  it("uses the standard 2,600/500/450/450 split when nothing is held", () => {
    const plan = planContribution(SLEEVES, new Map(), 4000, S);
    expect(plan.mode).toBe("default");
    expect(plan.rows.map((r) => r.aed)).toEqual([2600, 500, 450, 450]);
    expect(plan.totalFeeUsd).toBe(4.77);
  });

  it("uses the standard split when holdings cannot be valued", () => {
    const plan = planContribution(SLEEVES, null, 4000, S);
    expect(plan.rows.map((r) => r.aed)).toEqual([2600, 500, 450, 450]);
    expect(plan.reason).toMatch(/cannot be valued/);
  });

  it("uses the standard split inside the ±5pp band", () => {
    const v = new Map([["core", 680], ["ballast", 120], ["defense", 105], ["nuclear", 95]]);
    expect(planContribution(SLEEVES, v, 4000, S).mode).toBe("default");
  });

  it("sends new money to underweight sleeves when drift exceeds 5pp, never negative", () => {
    // Nuclear crashed: 5% weight vs 11.25% target; core rallied.
    const v = new Map([["core", 7200], ["ballast", 1250], ["defense", 1050], ["nuclear", 500]]);
    const plan = planContribution(SLEEVES, v, 4000, S);
    expect(plan.mode).toBe("rebalance");
    const by = Object.fromEntries(plan.rows.map((r) => [r.sleeveId, r.aed]));
    expect(Object.values(by).reduce((a, b) => a + b, 0)).toBe(4000);
    expect(Math.min(...Object.values(by))).toBeGreaterThanOrEqual(0);
    expect(by.nuclear!).toBeGreaterThan(450);
    expect(by.core!).toBeLessThan(2600);
  });
});
