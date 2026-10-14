// Ordered, append-only. Never edit an applied migration; add a new one.
export const migrations: { name: string; sql: string }[] = [
  {
    name: "0001_init",
    sql: `
-- Phase 0/1 schema. Money in USD unless the column name says AED.

CREATE TABLE IF NOT EXISTS settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sleeves (
  id                   text PRIMARY KEY,
  name                 text NOT NULL,
  target_pct           numeric(8,5) NOT NULL CHECK (target_pct >= 0 AND target_pct <= 1),
  purpose              text,
  sort                 integer NOT NULL DEFAULT 0,
  counts_in_portfolio  boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS instruments (
  ticker         text PRIMARY KEY,
  name           text NOT NULL,
  sleeve_id      text NOT NULL REFERENCES sleeves(id),
  currency       text NOT NULL DEFAULT 'USD',
  expense_ratio  numeric(8,6),
  notes          text
);

CREATE TABLE IF NOT EXISTS trades (
  id               serial PRIMARY KEY,
  trade_date       date NOT NULL,
  fill_date        date,
  ticker           text NOT NULL REFERENCES instruments(ticker),
  side             text NOT NULL CHECK (side IN ('buy','sell')),
  units            numeric(24,10),
  price_usd        numeric(18,6),
  gross_usd        numeric(18,6) NOT NULL CHECK (gross_usd >= 0),
  fee_usd          numeric(12,4) NOT NULL CHECK (fee_usd >= 0),
  fx_rate_aed_usd  numeric(12,6) NOT NULL CHECK (fx_rate_aed_usd > 0),
  amount_aed       numeric(18,4),
  sleeve_id        text NOT NULL REFERENCES sleeves(id),
  is_paper         boolean NOT NULL,
  note             text,
  import_ref       text UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trades_book_date_idx ON trades (is_paper, trade_date);

CREATE TABLE IF NOT EXISTS contributions (
  id          serial PRIMARY KEY,
  date        date NOT NULL,
  amount_aed  numeric(18,4) NOT NULL CHECK (amount_aed > 0),
  fx_rate     numeric(12,6) NOT NULL CHECK (fx_rate > 0),
  is_paper    boolean NOT NULL,
  note        text,
  import_ref  text UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- One row per ticker/day/source. Valuation uses the latest date across sources.
CREATE TABLE IF NOT EXISTS prices (
  ticker      text NOT NULL,
  date        date NOT NULL,
  close_usd   numeric(18,6) NOT NULL CHECK (close_usd > 0),
  source      text NOT NULL,
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticker, date, source)
);

-- Every provider call is logged so failures are visible, never silent.
CREATE TABLE IF NOT EXISTS price_fetch_log (
  id          serial PRIMARY KEY,
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  provider    text NOT NULL,
  ok          boolean NOT NULL,
  tickers     text NOT NULL,
  message     text
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id            serial PRIMARY KEY,
  ip            text NOT NULL,
  attempted_at  timestamptz NOT NULL DEFAULT now(),
  success       boolean NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempts_ip_time_idx ON login_attempts (ip, attempted_at);
`,
  },
  {
    name: "0002_seed",
    sql: `
-- Plan defaults from the brief (section 2). Edit later in Settings; this never overwrites.

INSERT INTO settings (key, value) VALUES ('plan', '{
  "pegAedPerUsd": 3.6725,
  "monthlyContributionAed": 4000,
  "feeMinUsd": 1,
  "feeRate": 0.0025,
  "driftThresholdPp": 5,
  "priceTtlMinutes": 30
}'::jsonb) ON CONFLICT (key) DO NOTHING;

INSERT INTO sleeves (id, name, target_pct, purpose, sort, counts_in_portfolio) VALUES
  ('core',       'US equity (S&P 500)',          0.65,   'Long-term growth engine',               1, true),
  ('ballast',    'Short-term Treasuries / TIPS', 0.125,  'Ballast; home for ~10-year money',      2, true),
  ('defense',    'Defense / aerospace',          0.1125, 'Satellite, budget-driven theme',        3, true),
  ('nuclear',    'Nuclear energy',               0.1125, 'Satellite, conviction theme',           4, true),
  ('wildcard',   'Wildcard (parked)',            0,      'Parked at 0% until a pick is named',    5, true),
  ('comparison', 'Comparisons (paper only)',     0,      'Tracked against NLR; no money assigned', 6, false)
ON CONFLICT (id) DO NOTHING;

-- Expense ratios left NULL unless the brief states one; verify at the fund provider.
INSERT INTO instruments (ticker, name, sleeve_id, expense_ratio, notes) VALUES
  ('VOO',  'Vanguard S&P 500 ETF',                 'core',       0.0003, 'Paper-trade pick, not a recommendation.'),
  ('SGOV', 'iShares 0-3 Month Treasury Bond ETF',  'ballast',    NULL,   'Paper-trade pick. Verify fee.'),
  ('ITA',  'iShares U.S. Aerospace & Defense ETF', 'defense',    NULL,   'Paper-trade pick. Verify fee.'),
  ('NLR',  'VanEck Uranium and Nuclear ETF',       'nuclear',    NULL,   'Reported 0.52%-0.56%; sources differ. Verify.'),
  ('CEG',  'Constellation Energy',                 'comparison', NULL,   'NLR top holding. Comparison only.'),
  ('CCJ',  'Cameco',                               'comparison', NULL,   'NLR top holding. Comparison only.')
ON CONFLICT (ticker) DO NOTHING;
`,
  },
];
