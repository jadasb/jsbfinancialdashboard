// Pure portfolio maths. No I/O, so every number on the dashboard is testable.
//
// Conventions (match the interim spreadsheet):
//   BUY : gross_usd is the cash leaving the account, fee included.
//         units = (gross - fee) / fill price. Cost basis = gross (fees are part of cost).
//   SELL: gross_usd is units x price. Cash received = gross - fee.
//         Cost removed uses the average cost per unit at the time of the sale.
//   FX  : cost in AED uses each trade's own rate; current value in AED uses the
//         current peg setting. While the peg holds these are the same number.

export type PlanSettings = {
  pegAedPerUsd: number;
  monthlyContributionAed: number;
  feeMinUsd: number;
  feeRate: number;
  driftThresholdPp: number;
  priceTtlMinutes: number;
};

export const DEFAULT_SETTINGS: PlanSettings = {
  pegAedPerUsd: 3.6725,
  monthlyContributionAed: 4000,
  feeMinUsd: 1,
  feeRate: 0.0025,
  driftThresholdPp: 5,
  priceTtlMinutes: 30,
};

export type TradeLike = {
  id?: number;
  tradeDate: string;
  fillDate?: string | null;
  ticker: string;
  side: "buy" | "sell";
  units: number | null;
  priceUsd: number | null;
  grossUsd: number;
  feeUsd: number;
  fxRateAedUsd: number;
  sleeveId: string;
};

export type SleeveLike = {
  id: string;
  name: string;
  targetPct: number;
  countsInPortfolio: boolean;
  sort: number;
};

export type Quote = { closeUsd: number; date: string; source: string; fetchedAt?: Date | string };

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Commission: greater of the minimum or the rate, rounded to cents. */
export function feeFor(grossUsd: number, s: Pick<PlanSettings, "feeMinUsd" | "feeRate">): number {
  if (!(grossUsd > 0)) return 0;
  return round2(Math.max(s.feeMinUsd, s.feeRate * grossUsd));
}

export const aedToUsd = (aed: number, peg: number) => aed / peg;

/** Units for a trade: explicit units win; else derived from the fill price. Null when unknowable. */
export function resolveUnits(t: Pick<TradeLike, "side" | "units" | "priceUsd" | "grossUsd" | "feeUsd">): number | null {
  if (t.units != null && t.units > 0) return t.units;
  if (t.priceUsd == null || !(t.priceUsd > 0)) return null;
  return t.side === "buy" ? (t.grossUsd - t.feeUsd) / t.priceUsd : t.grossUsd / t.priceUsd;
}

export type Position = {
  ticker: string;
  sleeveId: string;
  units: number;
  costBasisUsd: number;
  costBasisAed: number;
  feesUsd: number;
  realizedUsd: number;
  boughtUsd: number;
  firstDate: string | null;
  pendingBuys: number; // buys without a fill price: value cannot be computed
  quote: Quote | null;
  valueUsd: number | null;
  gainUsd: number | null;
  gainPct: number | null;
  problems: string[];
};

const tradeOrder = (a: TradeLike, b: TradeLike) =>
  (a.fillDate ?? a.tradeDate).localeCompare(b.fillDate ?? b.tradeDate) || (a.id ?? 0) - (b.id ?? 0);

const NO_PRICE = "No price available.";

export function buildPositions(trades: TradeLike[], quotes: Map<string, Quote>): Position[] {
  const byTicker = new Map<string, Position>();
  for (const t of [...trades].sort(tradeOrder)) {
    let p = byTicker.get(t.ticker);
    if (!p) {
      p = {
        ticker: t.ticker, sleeveId: t.sleeveId, units: 0, costBasisUsd: 0, costBasisAed: 0, feesUsd: 0,
        realizedUsd: 0, boughtUsd: 0, firstDate: null, pendingBuys: 0, quote: null, valueUsd: null,
        gainUsd: null, gainPct: null, problems: [],
      };
      byTicker.set(t.ticker, p);
    }
    p.feesUsd += t.feeUsd;
    p.firstDate ??= t.fillDate ?? t.tradeDate;
    const units = resolveUnits(t);

    if (t.side === "buy") {
      p.boughtUsd += t.grossUsd;
      p.costBasisUsd += t.grossUsd;
      p.costBasisAed += t.grossUsd * t.fxRateAedUsd;
      if (units == null) p.pendingBuys += 1;
      else p.units += units;
      continue;
    }

    // SELL
    if (units == null) {
      p.problems.push(`Sell on ${t.tradeDate} has no units or price.`);
      continue;
    }
    if (p.pendingBuys > 0) {
      p.problems.push(`Sell on ${t.tradeDate} cannot be costed until earlier buys have fill prices.`);
      continue;
    }
    if (units > p.units + 1e-9) {
      p.problems.push(`Sell on ${t.tradeDate} exceeds units held (${units.toFixed(4)} > ${p.units.toFixed(4)}).`);
      continue;
    }
    const share = p.units > 0 ? units / p.units : 0;
    const costOut = p.costBasisUsd * share;
    const costOutAed = p.costBasisAed * share;
    p.realizedUsd += t.grossUsd - t.feeUsd - costOut;
    p.costBasisUsd -= costOut;
    p.costBasisAed -= costOutAed;
    p.units -= units;
    if (p.units < 1e-9) { p.units = 0; p.costBasisUsd = 0; p.costBasisAed = 0; }
  }

  for (const p of byTicker.values()) {
    const q = quotes.get(p.ticker) ?? null;
    p.quote = q;
    if (p.pendingBuys > 0) p.problems.push(`${p.pendingBuys} buy(s) missing a fill price.`);
    if (!q) p.problems.push(NO_PRICE);
    if (q && p.pendingBuys === 0 && p.problems.length === 0) {
      p.valueUsd = p.units * q.closeUsd;
      p.gainUsd = p.valueUsd - p.costBasisUsd;
      p.gainPct = p.costBasisUsd > 0 ? p.gainUsd / p.costBasisUsd : null;
    }
  }
  return [...byTicker.values()];
}

export type SleeveRow = {
  sleeve: SleeveLike;
  positions: Position[];
  costBasisUsd: number;
  valueUsd: number | null;
  gainUsd: number | null;
  gainPct: number | null;
  weight: number | null;
  driftPp: number | null;
  status: "ok" | "over" | "under" | "unknown";
};

export type Snapshot = {
  complete: boolean;
  costBasisUsd: number;
  costBasisAed: number;
  valueUsd: number | null;
  valueAed: number | null;
  gainUsd: number | null;
  gainAed: number | null;
  gainPct: number | null;
  realizedUsd: number;
  feesUsd: number;
  boughtUsd: number;
  feeDragPct: number | null;
  contributedUsd: number;
  contributedAed: number;
  cashUsd: number; // contributed minus net cash into trades
  accountValueUsd: number | null; // holdings + cash
  growthUsd: number | null; // accountValue - contributed
  sleeves: SleeveRow[];
  comparisons: Position[];
  problems: string[];
};

export function summarize(
  positions: Position[],
  sleeves: SleeveLike[],
  contributions: { amountAed: number; fxRate: number }[],
  trades: Pick<TradeLike, "side" | "grossUsd" | "feeUsd" | "sleeveId">[],
  s: PlanSettings,
): Snapshot {
  const sleeveById = new Map(sleeves.map((x) => [x.id, x]));
  const counts = (sleeveId: string) => sleeveById.get(sleeveId)?.countsInPortfolio ?? true;
  const held = positions.filter((p) => counts(p.sleeveId));
  const comparisons = positions.filter((p) => !counts(p.sleeveId));
  const complete = held.every((p) => p.valueUsd != null);

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const costBasisUsd = sum(held.map((p) => p.costBasisUsd));
  const costBasisAed = sum(held.map((p) => p.costBasisAed));
  const valueUsd = complete ? sum(held.map((p) => p.valueUsd ?? 0)) : null;
  const feesUsd = sum(held.map((p) => p.feesUsd));
  const boughtUsd = sum(held.map((p) => p.boughtUsd));
  const realizedUsd = sum(held.map((p) => p.realizedUsd));

  const portfolioTrades = trades.filter((t) => counts(t.sleeveId));
  const netIntoTrades = sum(portfolioTrades.map((t) => (t.side === "buy" ? t.grossUsd : -(t.grossUsd - t.feeUsd))));
  const contributedUsd = sum(contributions.map((c) => c.amountAed / c.fxRate));
  const contributedAed = sum(contributions.map((c) => c.amountAed));
  const cashUsd = contributedUsd - netIntoTrades;
  const accountValueUsd = valueUsd == null ? null : valueUsd + cashUsd;

  const problems: string[] = [];
  const unpriced = held.filter((p) => !p.quote).map((p) => p.ticker);
  if (unpriced.length) problems.push(`No price yet for ${unpriced.join(", ")}.`);
  for (const p of held) for (const msg of p.problems) if (msg !== NO_PRICE) problems.push(`${p.ticker}: ${msg}`);
  if (contributions.length === 0 && portfolioTrades.length > 0) {
    problems.push("No contributions logged: cash and contribution-vs-growth figures are not meaningful.");
  } else if (cashUsd < -0.01) {
    problems.push(`Trades exceed logged contributions by $${(-cashUsd).toFixed(2)}. Log the missing contribution.`);
  }

  const sleeveRows: SleeveRow[] = sleeves
    .filter((x) => x.countsInPortfolio)
    .sort((a, b) => a.sort - b.sort)
    .map((sleeve) => {
      const ps = held.filter((p) => p.sleeveId === sleeve.id);
      const sComplete = ps.every((p) => p.valueUsd != null);
      const cost = sum(ps.map((p) => p.costBasisUsd));
      const value = sComplete ? sum(ps.map((p) => p.valueUsd ?? 0)) : null;
      const weight = value != null && valueUsd != null && valueUsd > 0 ? value / valueUsd : null;
      const driftPp = weight != null ? (weight - sleeve.targetPct) * 100 : null;
      const status: SleeveRow["status"] =
        driftPp == null ? "unknown" : driftPp >= s.driftThresholdPp ? "over" : driftPp <= -s.driftThresholdPp ? "under" : "ok";
      return {
        sleeve, positions: ps, costBasisUsd: cost, valueUsd: value,
        gainUsd: value != null ? value - cost : null,
        gainPct: value != null && cost > 0 ? (value - cost) / cost : null,
        weight, driftPp, status,
      };
    })
    .filter((r) => r.sleeve.targetPct > 0 || r.positions.length > 0);

  const gainUsd = valueUsd != null ? valueUsd - costBasisUsd : null;
  return {
    complete, costBasisUsd, costBasisAed, valueUsd,
    valueAed: valueUsd != null ? valueUsd * s.pegAedPerUsd : null,
    gainUsd,
    gainAed: valueUsd != null ? valueUsd * s.pegAedPerUsd - costBasisAed : null,
    gainPct: gainUsd != null && costBasisUsd > 0 ? gainUsd / costBasisUsd : null,
    realizedUsd, feesUsd, boughtUsd,
    feeDragPct: boughtUsd > 0 ? feesUsd / boughtUsd : null,
    contributedUsd, contributedAed, cashUsd, accountValueUsd,
    growthUsd: accountValueUsd != null && contributions.length > 0 ? accountValueUsd - contributedUsd : null,
    sleeves: sleeveRows, comparisons, problems,
  };
}

/** Split an integer total across weights so the parts sum exactly (largest remainder). */
export function splitWhole(total: number, weights: number[]): number[] {
  const wSum = weights.reduce((a, b) => a + b, 0);
  if (wSum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / wSum);
  const floors = raw.map(Math.floor);
  let left = Math.round(total - floors.reduce((a, b) => a + b, 0));
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    floors[i]! += 1;
    left -= 1;
  }
  return floors;
}

export type PlanRow = { sleeveId: string; name: string; targetPct: number; aed: number; usd: number; feeUsd: number; feePct: number | null };
export type Plan = { mode: "default" | "rebalance"; reason: string; rows: PlanRow[]; totalFeeUsd: number };

/**
 * Next-contribution planner (brief section 4):
 * - Every sleeve within the drift band (default ±5pp): use the standard split (2,600/500/450/450 AED).
 * - Any sleeve outside the band: send new money to underweight sleeves first, without selling.
 *   If the money covers every gap, the rest is split by target. If not, it is split in
 *   proportion to each gap.
 */
export function planContribution(
  sleeves: SleeveLike[],
  valueUsdBySleeve: Map<string, number> | null,
  contributionAed: number,
  s: PlanSettings,
): Plan {
  const active = sleeves.filter((x) => x.countsInPortfolio && x.targetPct > 0).sort((a, b) => a.sort - b.sort);
  const C = Math.round(contributionAed);
  const make = (aeds: number[], mode: Plan["mode"], reason: string): Plan => {
    const rows = active.map((x, i) => {
      const aed = aeds[i] ?? 0;
      const usd = aed / s.pegAedPerUsd;
      const fee = feeFor(usd, s);
      return { sleeveId: x.id, name: x.name, targetPct: x.targetPct, aed, usd, feeUsd: fee, feePct: usd > 0 ? fee / usd : null };
    });
    return { mode, reason, rows, totalFeeUsd: round2(rows.reduce((a, r) => a + r.feeUsd, 0)) };
  };
  const standard = () => splitWhole(C, active.map((x) => x.targetPct));

  if (!valueUsdBySleeve) return make(standard(), "default", "Standard split: holdings cannot be valued yet (missing fill prices or quotes).");
  const V = active.map((x) => (valueUsdBySleeve.get(x.id) ?? 0) * s.pegAedPerUsd);
  const total = V.reduce((a, b) => a + b, 0);
  if (total <= 0) return make(standard(), "default", "Standard split: nothing held yet.");

  const drifts = active.map((x, i) => (V[i]! / total - x.targetPct) * 100);
  const worst = Math.max(...drifts.map(Math.abs));
  if (worst < s.driftThresholdPp) {
    return make(standard(), "default", `Standard split: every sleeve is within ±${s.driftThresholdPp}pp of target (largest drift ${worst.toFixed(1)}pp).`);
  }

  const T = total + C;
  const need = active.map((x, i) => Math.max(0, x.targetPct * T - V[i]!));
  const needSum = need.reduce((a, b) => a + b, 0);
  const weights = needSum >= C ? need : need.map((n, i) => n + (C - needSum) * active[i]!.targetPct);
  const reason = needSum >= C
    ? `Rebalancing with new money: a sleeve is ${worst.toFixed(1)}pp off target. All of this contribution goes to underweight sleeves; nothing is sold.`
    : `Rebalancing with new money: a sleeve is ${worst.toFixed(1)}pp off target. Gaps are filled first; the rest follows target weights.`;
  return make(splitWhole(C, weights), "rebalance", reason);
}
