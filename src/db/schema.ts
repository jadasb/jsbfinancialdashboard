// Mirrors src/db/migrations.ts. The SQL there is the source of truth.
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const num = (name: string) => numeric(name, { mode: "number" });

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sleeves = pgTable("sleeves", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  targetPct: num("target_pct").notNull(),
  purpose: text("purpose"),
  sort: integer("sort").notNull().default(0),
  countsInPortfolio: boolean("counts_in_portfolio").notNull().default(true),
});

export const instruments = pgTable("instruments", {
  ticker: text("ticker").primaryKey(),
  name: text("name").notNull(),
  sleeveId: text("sleeve_id").notNull(),
  currency: text("currency").notNull().default("USD"),
  expenseRatio: num("expense_ratio"),
  notes: text("notes"),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  tradeDate: date("trade_date", { mode: "string" }).notNull(),
  fillDate: date("fill_date", { mode: "string" }),
  ticker: text("ticker").notNull(),
  side: text("side", { enum: ["buy", "sell"] }).notNull(),
  units: num("units"),
  priceUsd: num("price_usd"),
  grossUsd: num("gross_usd").notNull(),
  feeUsd: num("fee_usd").notNull(),
  fxRateAedUsd: num("fx_rate_aed_usd").notNull(),
  amountAed: num("amount_aed"),
  sleeveId: text("sleeve_id").notNull(),
  isPaper: boolean("is_paper").notNull(),
  note: text("note"),
  importRef: text("import_ref").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contributions = pgTable("contributions", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  amountAed: num("amount_aed").notNull(),
  fxRate: num("fx_rate").notNull(),
  isPaper: boolean("is_paper").notNull(),
  note: text("note"),
  importRef: text("import_ref").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const prices = pgTable(
  "prices",
  {
    ticker: text("ticker").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    closeUsd: num("close_usd").notNull(),
    source: text("source").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.ticker, t.date, t.source] })],
);

export const priceFetchLog = pgTable("price_fetch_log", {
  id: serial("id").primaryKey(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  provider: text("provider").notNull(),
  ok: boolean("ok").notNull(),
  tickers: text("tickers").notNull(),
  message: text("message"),
});

export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull(),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  success: boolean("success").notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
export type Contribution = typeof contributions.$inferSelect;
export type Sleeve = typeof sleeves.$inferSelect;
export type Instrument = typeof instruments.$inferSelect;
export type PriceRow = typeof prices.$inferSelect;
