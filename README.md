# Ledger — private investment dashboard

Phase 0 (scaffold, auth, deploy) and Phase 1 (ledger, import, prices, snapshot, drift, planner, fees).
Brief: [docs/investment-dashboard-brief.md](docs/investment-dashboard-brief.md). Tracking and research only; never a buy or sell instruction.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind 4 · Drizzle ORM · Postgres (Neon in production, PGlite locally) · Twelve Data for quotes · Vitest.

| Path | What it is |
|---|---|
| `src/lib/calc.ts` | All portfolio maths (fees, average cost, gain/loss, drift, planner). Pure, fully tested. |
| `src/lib/import-tracker.ts` | Reads `paper-trading-tracker.xlsx` (Ledger, Contributions, Weekly Log). |
| `src/lib/market-data.ts` | Twelve Data client with a database cache and a visible failure log. |
| `src/db/migrations.ts` | Schema + seed. Applied automatically on first request (advisory-locked). |
| `src/middleware.ts` | Blocks every page and API route without a valid session. |

## Run locally

Node 22 is installed at `~/.local/node` (no admin rights). Add it to your shell once:

```bash
echo 'export PATH="$HOME/.local/node/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

Then, from this folder:

```bash
npm install
```

```bash
cp .env.example .env.local
```

Fill `.env.local`:

```bash
npm run hash-password -- 'your long password'
```

Paste the output into `APP_PASSWORD_HASH`. Set `SESSION_SECRET` to the output of:

```bash
openssl rand -base64 48
```

Leave `DATABASE_URL` empty locally (the app uses an embedded Postgres in `.data/`). Add `MARKET_DATA_API_KEY` if you have one.

```bash
npm run dev
```

Open http://localhost:3000 and sign in.

## Test

```bash
npm test
```

27 tests, including the brief's acceptance case (4,000 AED at 3.6725 = $1,089.18 invested, $4.77 fees), a full import of the real tracker file, rebalancing, sells, missing-price handling, rate-limit-safe price caching, and the 1 Nov / 1 Jan fill-date rules.

```bash
npm run lint
```

## Deploy to Vercel

1. Create a **private** GitHub repository and push this folder (`.env.local` and `.data/` are gitignored).
2. Vercel → **Add New → Project** → import the repo. Framework: Next.js (default). Node 22 is pinned in `package.json`.
3. Vercel → project → **Storage** → add **Neon** (Postgres) from the Marketplace. It sets `DATABASE_URL`. Use the **pooled** connection string if both are offered.
4. Vercel → **Settings → Environment Variables** (Production and Preview):
   - `APP_PASSWORD_HASH` — from `npm run hash-password`. Use a different password from local.
   - `SESSION_SECRET` — new `openssl rand -base64 48` value. Never reuse the local one.
   - `MARKET_DATA_API_KEY` — Twelve Data key (optional; without it, prices are manual).
5. **Deploy.** Tables are created on the first request. To create them beforehand instead:
   ```bash
   DATABASE_URL='postgres://…' npm run db:migrate
   ```
6. Check: open the URL → login screen. A wrong password is rejected. After signing in, `/api/health` returns `{"ok":true,"database":"postgres",…}`.
7. Vercel → **Settings → Deployment Protection**: enable protection for preview deployments.
8. iPhone: open the URL in Safari → Share → **Add to Home Screen**.

Every push to `main` redeploys.

## Using it

**Adding a purchase (phone or laptop):** Snapshot → tap a ticker (e.g. VOO) → enter the $ amount, pick the date from the calendar, enter the price per share → **Add purchase**. Fee and shares preview as you type. The trade lands in that stock's purchase log and the ledger, the purchase price is stored as a price point, and (unless unticked) the money is logged as a contribution. Every figure on the snapshot recalculates.

**Backup:** Settings → Backup → download a full JSON backup or a trades CSV. Data already lives in the cloud database; this is an extra copy you control.

1. **Import** → choose `paper-trading-tracker.xlsx` → Preview → Import. The 8 Oct 2026 buys arrive in the paper book with fill prices marked missing.
2. **Ledger** → Edit each trade → enter the Sarwa fill price. (Or fill the sheet's yellow cells and re-import: rows update in place. Re-importing overwrites in-app edits to imported rows.)
3. **Prices** → refresh, or type a close manually.
4. **Snapshot** shows value, gain/loss in USD and AED, fees and fee drag, contributions vs growth, drift against target, and the next payday split.

## How numbers are defined

- **Buy:** amount = cash out including fee. Fee = max($1, 0.25% × amount), rounded to cents. Units = (amount − fee) ÷ fill price, unless units are typed explicitly.
- **Cost basis** includes fees. Average-cost method; sells realise P/L against average cost.
- **AED:** cost uses each trade's recorded rate; value uses the current peg setting.
- **Drift** = sleeve weight − target, in percentage points, on market value.
- **Planner:** standard split (2,600 / 500 / 450 / 450 AED) while every sleeve is within ±5pp. If any sleeve is outside the band, new money fills underweight sleeves first; nothing is sold.
- **Fill date:** 1st of the month, or the next NYSE open (weekends; New Year's Day, including the Monday-observed case).
- **Missing data** is shown as a blank with a reason. Nothing is estimated.
