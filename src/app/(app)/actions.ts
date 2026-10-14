"use server";
// All mutations. Each one re-checks the session (middleware is the first line, this is the second).
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { contributions, instruments, prices, sleeves, trades } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { feeFor, type PlanSettings } from "@/lib/calc";
import { getSettings, listInstruments, listSleeves, parseBook, saveSettings, tradeTickers, upsertPrice } from "@/lib/data";
import { ImportSchema, commitImport, parseTracker, type ImportPreview } from "@/lib/import-tracker";
import { refreshPrices } from "@/lib/market-data";

export type FormState = { error?: string; ok?: string } | undefined;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.");
const optNum = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().finite().nullable());
const optDate = z.preprocess((v) => (v === "" || v == null ? null : v), isoDate.nullable());
const firstError = (e: z.ZodError) => e.issues[0] ? `${e.issues[0].path.join(".") || "Input"}: ${e.issues[0].message}` : "Invalid input.";

// ---------- book (paper / real) ----------

export async function setBook(formData: FormData) {
  await requireSession();
  const jar = await cookies();
  jar.set("book", parseBook(formData.get("book")), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

// ---------- trades ----------

const TradeForm = z.object({
  book: z.enum(["paper", "real"]),
  side: z.enum(["buy", "sell"]),
  tradeDate: isoDate,
  fillDate: optDate,
  ticker: z.string().trim().toUpperCase().min(1),
  amountCurrency: z.enum(["AED", "USD"]),
  amount: optNum,
  priceUsd: optNum,
  units: optNum,
  feeUsd: optNum,
  note: z.string().trim().max(500).optional().transform((v) => v || null),
});

async function tradeValues(formData: FormData) {
  const parsed = TradeForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) } as const;
  const f = parsed.data;
  const db = await getDb();
  const s = await getSettings(db);
  const [inst] = await db.select().from(instruments).where(eq(instruments.ticker, f.ticker));
  if (!inst) return { error: `${f.ticker} is not a known instrument. Add it in Settings.` } as const;
  if (inst.sleeveId === "comparison" && f.book === "real") return { error: "Comparison tickers are paper only." } as const;
  if (f.priceUsd != null && f.priceUsd <= 0) return { error: "Fill price must be positive." } as const;
  if (f.units != null && f.units <= 0) return { error: "Units must be positive." } as const;
  if (f.feeUsd != null && f.feeUsd < 0) return { error: "Fee cannot be negative." } as const;
  if (f.fillDate && f.fillDate < f.tradeDate) return { error: "Fill date cannot be before the trade date." } as const;

  let gross: number;
  if (f.side === "buy") {
    if (f.amount == null || f.amount <= 0) return { error: "Enter the amount invested (AED or USD)." } as const;
    gross = f.amountCurrency === "AED" ? f.amount / s.pegAedPerUsd : f.amount;
  } else {
    if (f.units == null || f.priceUsd == null) return { error: "A sell needs units and a fill price." } as const;
    gross = f.amount != null && f.amount > 0 ? (f.amountCurrency === "AED" ? f.amount / s.pegAedPerUsd : f.amount) : f.units * f.priceUsd;
  }
  const fee = f.feeUsd ?? feeFor(gross, s);
  if (f.side === "buy" && fee >= gross) return { error: "Fee is larger than the amount invested." } as const;

  return {
    values: {
      tradeDate: f.tradeDate, fillDate: f.fillDate ?? f.tradeDate, ticker: f.ticker, side: f.side,
      units: f.units, priceUsd: f.priceUsd, grossUsd: gross, feeUsd: fee, fxRateAedUsd: s.pegAedPerUsd,
      amountAed: gross * s.pegAedPerUsd, sleeveId: inst.sleeveId, isPaper: f.book === "paper", note: f.note,
    },
  } as const;
}

export async function createTrade(_: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const r = await tradeValues(formData);
  if ("error" in r) return { error: r.error };
  await (await getDb()).insert(trades).values(r.values);
  revalidatePath("/", "layout");
  redirect(`/ledger?saved=trade`);
}

export async function updateTrade(_: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Missing trade id." };
  const r = await tradeValues(formData);
  if ("error" in r) return { error: r.error };
  await (await getDb()).update(trades).set({ ...r.values, updatedAt: sql`now()` }).where(eq(trades.id, id));
  revalidatePath("/", "layout");
  redirect(`/ledger?saved=trade`);
}

export async function deleteTrade(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) await (await getDb()).delete(trades).where(eq(trades.id, id));
  revalidatePath("/", "layout");
  redirect(`/ledger?saved=deleted`);
}

/**
 * Quick purchase from a holding page: $ amount, date, price per share.
 * Writes the trade, optionally the matching contribution (so cash stays at zero),
 * and records the purchase price as a price point (source "fill").
 */
export async function addPurchase(_: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const date = String(formData.get("date") ?? "");
  if (date > todayUae()) return { error: "Purchase date cannot be in the future." };
  const fd = new FormData();
  for (const [k, v] of formData) fd.set(k, v);
  fd.set("side", "buy");
  fd.set("tradeDate", date);
  fd.set("fillDate", date);
  fd.set("units", "");
  fd.set("feeUsd", "");
  if (!fd.get("priceUsd")) return { error: "Enter the price per share at the time of purchase." };

  const r = await tradeValues(fd);
  if ("error" in r) return { error: r.error };
  const v = r.values;
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.insert(trades).values(v);
    if (formData.get("logContribution") === "on") {
      await tx.insert(contributions).values({
        date: v.tradeDate, amountAed: v.grossUsd * v.fxRateAedUsd, fxRate: v.fxRateAedUsd, isPaper: v.isPaper,
        note: `Logged with ${v.ticker} purchase`,
      });
    }
    await tx
      .insert(prices)
      .values({ ticker: v.ticker, date: v.tradeDate, closeUsd: v.priceUsd!, source: "fill" })
      .onConflictDoUpdate({ target: [prices.ticker, prices.date, prices.source], set: { closeUsd: v.priceUsd!, fetchedAt: sql`now()` } });
  });
  revalidatePath("/", "layout");
  redirect(`/holding/${encodeURIComponent(v.ticker)}?added=1`);
}

function todayUae(): string {
  return new Date(Date.now() + 4 * 3_600_000).toISOString().slice(0, 10);
}

// ---------- contributions ----------

const ContributionForm = z.object({
  book: z.enum(["paper", "real"]),
  date: isoDate,
  amountAed: z.coerce.number().positive("Amount must be positive."),
  note: z.string().trim().max(500).optional().transform((v) => v || null),
});

export async function saveContribution(_: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const parsed = ContributionForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const db = await getDb();
  const s = await getSettings(db);
  const v = { date: parsed.data.date, amountAed: parsed.data.amountAed, fxRate: s.pegAedPerUsd, isPaper: parsed.data.book === "paper", note: parsed.data.note };
  const id = Number(formData.get("id"));
  if (Number.isInteger(id) && id > 0) await db.update(contributions).set(v).where(eq(contributions.id, id));
  else await db.insert(contributions).values(v);
  revalidatePath("/", "layout");
  redirect(`/ledger?saved=contribution`);
}

export async function deleteContribution(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) await (await getDb()).delete(contributions).where(eq(contributions.id, id));
  revalidatePath("/", "layout");
  redirect(`/ledger?saved=deleted`);
}

// ---------- prices ----------

const PriceForm = z.object({
  ticker: z.string().trim().toUpperCase().min(1),
  date: isoDate,
  closeUsd: z.coerce.number().positive("Price must be positive."),
});

export async function addManualPrice(_: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const parsed = PriceForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const db = await getDb();
  const [inst] = await db.select().from(instruments).where(eq(instruments.ticker, parsed.data.ticker));
  if (!inst) return { error: `${parsed.data.ticker} is not a known instrument.` };
  await upsertPrice(db, { ...parsed.data, source: "manual" });
  revalidatePath("/", "layout");
  return { ok: `Saved ${parsed.data.ticker} ${parsed.data.date} at $${parsed.data.closeUsd}.` };
}

export async function deletePrice(formData: FormData) {
  await requireSession();
  const ticker = String(formData.get("ticker") ?? ""), date = String(formData.get("date") ?? ""), source = String(formData.get("source") ?? "");
  await (await getDb()).delete(prices).where(and(eq(prices.ticker, ticker), eq(prices.date, date), eq(prices.source, source)));
  revalidatePath("/", "layout");
}

export async function refreshNow(_: FormState): Promise<FormState> {
  await requireSession();
  const db = await getDb();
  const tickers = [...new Set([...(await listInstruments(db)).map((i) => i.ticker), ...(await tradeTickers(db))])];
  const r = await refreshPrices(db, tickers, { force: true });
  revalidatePath("/", "layout");
  if (r.status === "skipped") return { error: r.reason };
  const failed = r.results.filter((x) => !x.ok);
  return failed.length
    ? { error: `Failed: ${failed.map((f) => `${f.ticker} (${"error" in f ? f.error : ""})`).join(", ")}. Other prices updated.` }
    : { ok: `Updated ${r.results.length} prices.` };
}

// ---------- import ----------

export type ImportState = { preview?: ImportPreview; payload?: string; error?: string; done?: string } | undefined;

export async function previewImport(_: ImportState, formData: FormData): Promise<ImportState> {
  await requireSession();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose the .xlsx file first." };
  if (file.size > 5 * 1024 * 1024) return { error: "File is larger than 5 MB." };
  const db = await getDb();
  const [s, insts, sls] = await Promise.all([getSettings(db), listInstruments(db), listSleeves(db)]);
  const preview = await parseTracker(Buffer.from(await file.arrayBuffer()), {
    settings: s,
    tickerToSleeve: new Map(insts.map((i) => [i.ticker, i.sleeveId])),
    sleeveTargets: new Map(sls.map((x) => [x.id, x.targetPct])),
  });
  return { preview, payload: JSON.stringify(preview.data) };
}

export async function confirmImport(_: ImportState, formData: FormData): Promise<ImportState> {
  await requireSession();
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { error: "Import data was lost. Preview the file again." };
  }
  const parsed = ImportSchema.safeParse(raw);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const db = await getDb();
  const known = new Map((await listInstruments(db)).map((i) => [i.ticker, i.sleeveId]));
  if (parsed.data.trades.some((t) => known.get(t.ticker) !== t.sleeveId)) return { error: "Instrument list changed since preview. Preview again." };
  const c = await commitImport(db, parsed.data);
  revalidatePath("/", "layout");
  return { done: `Imported into the paper book: ${c.trades} trades, ${c.contributions} contributions, ${c.prices} prices.` };
}

// ---------- settings ----------

const SettingsForm = z.object({
  pegAedPerUsd: z.coerce.number().positive(),
  monthlyContributionAed: z.coerce.number().positive(),
  feeMinUsd: z.coerce.number().min(0),
  feeRate: z.coerce.number().min(0).max(0.05),
  driftThresholdPp: z.coerce.number().positive().max(50),
  priceTtlMinutes: z.coerce.number().int().min(5).max(1440),
});

export async function savePlanSettings(_: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const raw = Object.fromEntries(formData);
  // The form shows the fee rate as a percent.
  const parsed = SettingsForm.safeParse({ ...raw, feeRate: Number(raw.feeRatePct) / 100 });
  if (!parsed.success) return { error: firstError(parsed.error) };
  await saveSettings(await getDb(), parsed.data satisfies PlanSettings);
  revalidatePath("/", "layout");
  return { ok: "Settings saved. Existing trades keep the fees and FX they were recorded with." };
}

export async function saveTargets(_: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const db = await getDb();
  const all = await listSleeves(db);
  const updates: { id: string; target: number }[] = [];
  for (const sl of all.filter((x) => x.countsInPortfolio)) {
    const v = Number(formData.get(`target_${sl.id}`));
    if (!Number.isFinite(v) || v < 0 || v > 100) return { error: `${sl.name}: target must be 0–100%.` };
    updates.push({ id: sl.id, target: Math.round(v * 1000) / 100000 });
  }
  const total = updates.reduce((a, u) => a + u.target, 0);
  if (Math.abs(total - 1) > 1e-6) return { error: `Targets add up to ${(total * 100).toFixed(3)}%, not 100%.` };
  await db.transaction(async (tx) => {
    for (const u of updates) await tx.update(sleeves).set({ targetPct: u.target }).where(eq(sleeves.id, u.id));
  });
  revalidatePath("/", "layout");
  return { ok: "Targets saved." };
}

const InstrumentForm = z.object({
  ticker: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9.\-]{0,9}$/, "Use a US ticker like VOO or BRK.B."),
  name: z.string().trim().min(1).max(120),
  sleeveId: z.string().min(1),
  notes: z.string().trim().max(500).optional().transform((v) => v || null),
});

export async function addInstrument(_: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const parsed = InstrumentForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const db = await getDb();
  if (!(await listSleeves(db)).some((x) => x.id === parsed.data.sleeveId)) return { error: "Unknown sleeve." };
  const res = await db.insert(instruments).values(parsed.data).onConflictDoNothing().returning({ t: instruments.ticker });
  if (res.length === 0) return { error: `${parsed.data.ticker} already exists.` };
  revalidatePath("/", "layout");
  return { ok: `${parsed.data.ticker} added. It is research tracking only until you record a trade.` };
}
