// Imports paper-trading-tracker.xlsx (Ledger, Contributions, Weekly Log; Setup is checked, not copied).
// Two steps: parseTracker() builds a preview with warnings; commitImport() writes it in one transaction.
// Everything imported is flagged paper. Re-importing updates rows by a stable key
// (date + ticker + occurrence), so filling fill prices in the sheet and re-importing is safe.
import ExcelJS from "exceljs";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db";
import { contributions, prices, trades } from "@/db/schema";
import { feeFor, round2, type PlanSettings } from "./calc";

export const ImportSchema = z.object({
  trades: z.array(
    z.object({
      importRef: z.string(),
      row: z.number(),
      tradeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      ticker: z.string(),
      sleeveId: z.string(),
      amountAed: z.number().positive(),
      grossUsd: z.number().positive(),
      feeUsd: z.number().nonnegative(),
      priceUsd: z.number().positive().nullable(),
      units: z.number().positive().nullable(),
      fxRate: z.number().positive(),
      note: z.string().nullable(),
    }),
  ),
  contributions: z.array(
    z.object({ importRef: z.string(), date: z.string(), amountAed: z.number().positive(), fxRate: z.number().positive() }),
  ),
  prices: z.array(z.object({ ticker: z.string(), date: z.string(), closeUsd: z.number().positive() })),
});
export type ImportData = z.infer<typeof ImportSchema>;
export type ImportPreview = { data: ImportData; warnings: string[]; errors: string[] };

export const IMPORT_SOURCE = "tracker";

type Cell = ExcelJS.CellValue;
type Plain = string | number | boolean | Date | ExcelJS.CellRichTextValue | ExcelJS.CellHyperlinkValue | ExcelJS.CellErrorValue;

const isFormula = (c: Cell): c is ExcelJS.CellFormulaValue | ExcelJS.CellSharedFormulaValue =>
  c != null && typeof c === "object" && !(c instanceof Date) && ("formula" in c || "sharedFormula" in c);

/** Resolve formula cells to their cached result; null for blanks and errors. */
function value(c: Cell): Plain | null {
  if (c == null) return null;
  if (isFormula(c)) {
    const r = c.result;
    if (r == null || (typeof r === "object" && !(r instanceof Date) && "error" in r)) return null;
    return r as Plain;
  }
  if (typeof c === "object" && !(c instanceof Date) && "error" in c) return null;
  return c as Plain;
}

function num(c: Cell): number | null {
  const v = value(c);
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v.replace(/,/g, "")))) return Number(v.replace(/,/g, ""));
  return null;
}

function str(c: Cell): string | null {
  const v = value(c);
  if (v == null) return null;
  if (typeof v === "object" && !(v instanceof Date) && "richText" in v) return v.richText.map((t) => t.text).join("").trim() || null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Excel serial (1900 system) or Date or ISO string → YYYY-MM-DD. */
export function isoDate(c: Cell): string | null {
  const v = value(c);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000).toISOString().slice(0, 10);
  }
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v.trim())) return v.trim().slice(0, 10);
  return null;
}

function headerMap(ws: ExcelJS.Worksheet): Map<string, number> {
  const m = new Map<string, number>();
  ws.getRow(1).eachCell((cell, col) => {
    const h = str(cell.value);
    if (h) m.set(h.toLowerCase().replace(/\s+/g, " "), col);
  });
  return m;
}

function col(h: Map<string, number>, ...names: string[]): number | null {
  for (const n of names) for (const [k, v] of h) if (k.startsWith(n)) return v;
  return null;
}

export async function parseTracker(
  buf: ArrayBuffer | Buffer,
  ctx: { settings: PlanSettings; tickerToSleeve: Map<string, string>; sleeveTargets: Map<string, number> },
): Promise<ImportPreview> {
  const wb = new ExcelJS.Workbook();
  const warnings: string[] = [];
  const errors: string[] = [];
  const data: ImportData = { trades: [], contributions: [], prices: [] };
  try {
    await wb.xlsx.load(buf as ArrayBuffer);
  } catch (e) {
    return { data, warnings, errors: [`Not a readable .xlsx file: ${(e as Error).message}`] };
  }
  const peg = ctx.settings.pegAedPerUsd;

  // Setup: compare, do not overwrite.
  const setup = wb.getWorksheet("Setup");
  if (setup) {
    const checks: [string, number | null, number][] = [
      ["AED/USD peg", num(setup.getCell("B3").value), peg],
      ["Monthly contribution (AED)", num(setup.getCell("B4").value), ctx.settings.monthlyContributionAed],
      ["Fee minimum (USD)", num(setup.getCell("B5").value), ctx.settings.feeMinUsd],
      ["Fee rate", num(setup.getCell("B6").value), ctx.settings.feeRate],
    ];
    for (const [label, sheet, app] of checks) {
      if (sheet != null && Math.abs(sheet - app) > 1e-9) warnings.push(`Setup: ${label} is ${sheet} in the sheet but ${app} in the app. The app setting is used.`);
    }
    for (let r = 9; r <= 12; r++) {
      const t = str(setup.getCell(`B${r}`).value)?.toUpperCase();
      const target = num(setup.getCell(`C${r}`).value);
      const sleeve = t ? ctx.tickerToSleeve.get(t) : undefined;
      if (t && target != null && sleeve && Math.abs((ctx.sleeveTargets.get(sleeve) ?? -1) - target) > 1e-9) {
        warnings.push(`Setup: ${t} target is ${(target * 100).toFixed(2)}% in the sheet but ${((ctx.sleeveTargets.get(sleeve) ?? 0) * 100).toFixed(2)}% in the app.`);
      }
    }
  } else warnings.push("No Setup sheet found; skipped the settings check.");

  // Ledger
  const ledger = wb.getWorksheet("Ledger");
  if (!ledger) errors.push("No Ledger sheet found.");
  else {
    const h = headerMap(ledger);
    const c = {
      date: col(h, "date"), ticker: col(h, "ticker"), aed: col(h, "aed allocated", "aed"), gross: col(h, "usd gross"),
      fee: col(h, "fee"), price: col(h, "fill price"), units: col(h, "units"), notes: col(h, "notes"),
    };
    if (!c.date || !c.ticker || !c.aed) errors.push("Ledger: expected columns Date, Ticker and AED allocated in row 1.");
    else {
      const seen = new Map<string, number>();
      let missingFill = 0;
      ledger.eachRow((row, r) => {
        if (r === 1) return;
        const ticker = str(row.getCell(c.ticker!).value)?.toUpperCase();
        const date = isoDate(row.getCell(c.date!).value);
        const aed = num(row.getCell(c.aed!).value);
        if (!ticker && aed == null) return; // empty template row
        if (!ticker || !date || aed == null) {
          errors.push(`Ledger row ${r}: needs a date, ticker and AED amount. Skipped.`);
          return;
        }
        if (aed <= 0) {
          errors.push(`Ledger row ${r}: AED amount must be positive (sells are entered in the app). Skipped.`);
          return;
        }
        const sleeveId = ctx.tickerToSleeve.get(ticker);
        if (!sleeveId) {
          errors.push(`Ledger row ${r}: ${ticker} is not a known instrument. Add it in Settings first. Skipped.`);
          return;
        }
        const gross = aed / peg;
        const fee = feeFor(gross, ctx.settings);
        const sheetGross = c.gross ? num(row.getCell(c.gross).value) : null;
        const sheetFee = c.fee ? num(row.getCell(c.fee).value) : null;
        if (sheetGross != null && Math.abs(sheetGross - gross) > 0.01) warnings.push(`Ledger row ${r}: sheet USD gross ${sheetGross.toFixed(2)} differs from AED/peg ${gross.toFixed(2)}. Using AED/peg.`);
        if (sheetFee != null && Math.abs(round2(sheetFee) - fee) > 0.005) warnings.push(`Ledger row ${r}: sheet fee ${sheetFee.toFixed(2)} differs from fee rule ${fee.toFixed(2)}. Using fee rule.`);
        const price = c.price ? num(row.getCell(c.price).value) : null;
        // Units typed by hand override; units the sheet derived by formula are recomputed by the app.
        const unitsCell = c.units ? row.getCell(c.units).value : null;
        const units = unitsCell != null && !isFormula(unitsCell) ? num(unitsCell) : null;
        if (price == null && units == null) missingFill++;
        const key = `${date}:${ticker}`;
        const n = (seen.get(key) ?? 0) + 1;
        seen.set(key, n);
        data.trades.push({
          importRef: `${IMPORT_SOURCE}:ledger:${key}:${n}`, row: r, tradeDate: date, ticker, sleeveId,
          amountAed: aed, grossUsd: gross, feeUsd: fee,
          priceUsd: price != null && price > 0 ? price : null,
          units: units != null && units > 0 ? units : null,
          fxRate: peg, note: c.notes ? str(row.getCell(c.notes).value) : null,
        });
      });
      if (missingFill > 0) warnings.push(`${missingFill} ledger trade(s) have no fill price. They import as cost only; value and gain stay blank until a fill price is entered.`);
      if (data.trades.length) warnings.push("Fill date is assumed equal to the trade date for imported rows. Edit a trade if it filled on a later day.");
    }
  }

  // Contributions (+ the benchmark VOO price for that day, if entered)
  const contrib = wb.getWorksheet("Contributions");
  if (contrib) {
    const h = headerMap(contrib);
    const cDate = col(h, "date"), cAed = col(h, "aed"), cVoo = col(h, "voo price");
    if (cDate && cAed) {
      const seen = new Map<string, number>();
      contrib.eachRow((row, r) => {
        if (r === 1) return;
        const date = isoDate(row.getCell(cDate).value);
        const aed = num(row.getCell(cAed).value);
        if (date == null && aed == null) return;
        if (!date || aed == null || aed <= 0) {
          errors.push(`Contributions row ${r}: needs a date and a positive AED amount. Skipped.`);
          return;
        }
        const n = (seen.get(date) ?? 0) + 1;
        seen.set(date, n);
        data.contributions.push({ importRef: `${IMPORT_SOURCE}:contrib:${date}:${n}`, date, amountAed: aed, fxRate: peg });
        const voo = cVoo ? num(row.getCell(cVoo).value) : null;
        if (voo != null && voo > 0) data.prices.push({ ticker: "VOO", date, closeUsd: voo });
      });
    }
  }

  // Weekly Log: date column + one column per ticker header.
  const weekly = wb.getWorksheet("Weekly Log");
  if (weekly) {
    const tickerCols: [string, number][] = [];
    weekly.getRow(1).eachCell((cell, colNo) => {
      const t = str(cell.value)?.toUpperCase();
      if (t && ctx.tickerToSleeve.has(t)) tickerCols.push([t, colNo]);
    });
    let rows = 0;
    weekly.eachRow((row, r) => {
      if (r === 1) return;
      const date = isoDate(row.getCell(1).value);
      if (!date) return;
      for (const [t, colNo] of tickerCols) {
        const p = num(row.getCell(colNo).value);
        if (p != null && p > 0) { data.prices.push({ ticker: t, date, closeUsd: p }); rows++; }
      }
    });
    if (rows === 0) warnings.push("Weekly Log has no prices entered yet.");
  }

  // Same ticker/date twice (e.g. Contributions VOO and Weekly Log VOO): keep the last.
  const uniq = new Map(data.prices.map((p) => [`${p.ticker}:${p.date}`, p]));
  data.prices = [...uniq.values()];
  return { data, warnings, errors };
}

export async function commitImport(db: DB, data: ImportData) {
  const counts = { trades: 0, contributions: 0, prices: 0 };
  await db.transaction(async (tx) => {
    for (const t of data.trades) {
      await tx
        .insert(trades)
        .values({
          tradeDate: t.tradeDate, fillDate: t.tradeDate, ticker: t.ticker, side: "buy", units: t.units, priceUsd: t.priceUsd,
          grossUsd: t.grossUsd, feeUsd: t.feeUsd, fxRateAedUsd: t.fxRate, amountAed: t.amountAed, sleeveId: t.sleeveId,
          isPaper: true, note: t.note, importRef: t.importRef,
        })
        .onConflictDoUpdate({
          target: trades.importRef,
          set: {
            tradeDate: t.tradeDate, ticker: t.ticker, units: t.units, priceUsd: t.priceUsd, grossUsd: t.grossUsd,
            feeUsd: t.feeUsd, fxRateAedUsd: t.fxRate, amountAed: t.amountAed, sleeveId: t.sleeveId, note: t.note,
            updatedAt: sql`now()`,
          },
        });
      counts.trades++;
    }
    for (const c of data.contributions) {
      await tx
        .insert(contributions)
        .values({ date: c.date, amountAed: c.amountAed, fxRate: c.fxRate, isPaper: true, importRef: c.importRef })
        .onConflictDoUpdate({ target: contributions.importRef, set: { date: c.date, amountAed: c.amountAed, fxRate: c.fxRate } });
      counts.contributions++;
    }
    for (const p of data.prices) {
      await tx
        .insert(prices)
        .values({ ...p, source: IMPORT_SOURCE })
        .onConflictDoUpdate({ target: [prices.ticker, prices.date, prices.source], set: { closeUsd: p.closeUsd, fetchedAt: sql`now()` } });
      counts.prices++;
    }
  });
  return counts;
}
