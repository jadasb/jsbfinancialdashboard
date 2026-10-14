# Investment Plan & Dashboard Build Brief

**Prepared:** 14 October 2026 (updated: core switched to S&P 500)
**Status:** Paper trading started 8 October 2026. First real investment: January 2027.
**Disclaimer:** Analysis for research and education, not licensed financial advice. All market data in this document is a dated snapshot and must be refreshed before use.

---

## 0. Instructions for the Claude reading this

You are being handed a complete brief for a personal investment dashboard. Read the whole document before responding.

**Your job**
1. Confirm in a few lines that you understand the plan, the constraints, and the build order.
2. Propose the architecture in section 10 (adjust only with a stated reason).
3. Build **Phase 0 and Phase 1 only**. Stop and wait for approval before starting later phases.
4. Produce working code, not pseudocode. After each phase, give exact run, test, and deploy steps.

**Working style the owner expects**
- Direct, decisive, outcome-driven. Short, sharp prompts.
- Deep analytical reasoning and logical explanations, not surface-level answers.
- Blunt, honest feedback. Do not tell the owner what she wants to hear.
- No cheesy, generic, or typical chatbot language. No filler or flattery.
- High standard: the output must work, not just read well. If something is almost right but not quite, fix it.
- She is a creative strategist: it should feel right (design, tone) and perform (accuracy, usability).

**Hard rules**
- Never invent market data, prices, or filings. If a data source fails, show the failure clearly.
- Never present research output as a buy or sell instruction. Label it research.
- Never store brokerage credentials, account numbers, or ID documents anywhere.
- Flag any assumption you make.

---

## 1. Owner and goal

- Beginner investor based in the UAE (a non-US person), investing alone through the **Sarwa** app, which offers **US-listed securities only**.
- Starting **January 2027**.
- Budget: **4,000 AED per month**, invested in one go on the **1st of each month (payday)**. At the AED/USD peg of 3.6725 that is about **$1,089 per month**.
- Time horizon: roughly **30 years** (retirement-style), with a portion of money on a **~10-year** outlook.
- Risk profile: about **75% medium risk, 25% higher risk**.
- An emergency fund will be built **separately**, outside this portfolio.
- Stated concern: the US market could crash or stop outperforming given geopolitics and war involvement.
- Core decision (8 Oct 2026): an **S&P 500 fund** as the core. This supersedes her earlier preference for a global fund. Her US-risk concern stays on record, and the Claude building this should flag, once and plainly, that the plan is now effectively 100% US equity (see decisions log).
- Wants to code a multi-layer dashboard (section 9) and deploy it on **Vercel**, accessible on desktop and iPhone.

---

## 2. Final allocation (Version A, no gold, no commodities)

| Sleeve | Target | AED / month | USD / month (approx.) | Role | Paper-trade instrument |
|---|---|---|---|---|---|
| US equity (S&P 500) | 65% | 2,600 | 708 | Long-term growth engine | VOO |
| Short-term Treasuries / TIPS | 12.5% | 500 | 136 | Ballast; home for ~10-year money | SGOV |
| Defense / aerospace | 11.25% | 450 | 123 | Satellite, budget-driven theme | ITA |
| Nuclear energy | 11.25% | 450 | 123 | Satellite, conviction theme | NLR |

Wildcard sleeve (own-industry names or capped cannabis): **parked at 0%** until the owner names a pick. The placement of nuclear (replacing the wildcard slot) is an assumption made to get a complete, testable portfolio; the owner can change it.

The paper-trade instruments (VOO, SGOV, ITA, NLR) are picks to start the experiment, not recommendations.

- About 87.5% equities and 12.5% defensive. Satellites total 22.5%: the 900 AED left after core (2,600) and ballast (500), split evenly across defense and nuclear (an assumption).
- **Execution decision:** all four buys placed on the 1st of every month (a full split), not alternated. It costs about $12 a year more in commissions than alternating satellite sleeves, and keeps every sleeve on target every month and the tracking simple.
- If the 1st falls on a weekend or US market holiday, the order fills at the next US open. The dashboard must record the **actual fill date**.

---

## 3. Decisions log (so you do not re-propose rejected ideas)

| Decision | Reason |
|---|---|
| Core is an S&P 500 fund (owner decision, 8 Oct 2026) | Supersedes an earlier global-fund choice (VT). Trade-off to keep visible: the S&P 500 is 100% US, its top ten holdings are about 38% of the fund, and technology is over a third of it, so the core now carries more tech and single-country risk than a global fund (which is still about 62% US). Defense (ITA) and nuclear (NLR) are also US-heavy, so total equity exposure is mostly US. The owner earlier said she is concerned the US could crash or stop outperforming. She then chose the S&P 500 on 8 Oct 2026 without discussing this trade-off, so it has been flagged to her but not yet debated. |
| Do not hold S&P 500 and a global fund as separate buckets | Heavy overlap; same US mega-caps counted twice. |
| Removed dedicated AI/tech satellite | Core already carries heavy tech weight (top holdings are tech names). Owner does not want to be heavily weighted in tech. |
| Removed healthcare sleeve | Owner decision. |
| Removed agriculture | Owner decision. |
| Removed gold, copper, and agriculture; no direct commodity sleeve | Owner decision. Replaced by short-term Treasuries/TIPS as ballast. Later exception: nuclear via NLR (below), which includes uranium miners. |
| Shein-on-oil thesis not pursued | Shein is Hong Kong-listed (not on Sarwa); oil is only one driver of its problems (US small-package duty exemption removed, tariffs, Temu competition, EU investigation). A single-event macro bet conflicts with a long-term payday-buying plan. |
| Nuclear energy satellite via **NLR** only | Owner chose NLR. NLR already holds Cameco (CCJ) and Constellation Energy (CEG) as its two largest positions (about 8% each), so owning NLR plus CEG plus CCJ would double-count. Use CEG and CCJ only as paper-trade comparisons. |
| Nuclear brings back commodity and AI-power exposure | Acknowledged: uranium miners are commodity-linked and CEG's story is data-centre power demand. Treat it as a conviction theme sized at about 11%, not a diversifier. |

---

## 4. Rules

- **Buying:** all trades on the 1st. No market timing.
- **Rebalancing:** first direct each month's contributions toward any sleeve below target before selling anything. Only act if a sleeve drifts about **5 percentage points** from target. The dashboard should show drift and a suggested allocation of the next contribution.
- **Thesis log:** before buying any individual stock (defense, wildcard), record: why own it, how it makes money, 5-year margin trend, debt and cash, sell criteria written in advance, and review date.
- **Drawdown rule:** decide in advance what to do if the equity portion halves. The only plan-consistent answer is to keep contributing.
- **Cannabis:** if included at all, it is a small slice of the wildcard sleeve (a few percent of the total portfolio at most). Regulatory status and balance sheet must be researched first.
- **Paper-trade period:** started **8 October 2026** with the four sleeves above (4,000 AED split 2,600 / 500 / 450 / 450). Next paper payday buys: 1 Nov 2026 (a Sunday, so fills Mon 2 Nov), 1 Dec 2026, and 1 Jan 2027 (US holiday, fills Mon 4 Jan). An interim spreadsheet tracker (paper-trading-tracker.xlsx) holds the ledger. The app must import that ledger, support a "paper" flag on trades, and keep paper and real separate. Track a VOO-only benchmark with the same contributions.

---

## 5. Research notes by sleeve (candidates to research, not recommendations)

Confirm every ticker is available on Sarwa and check current fees before acting.

### US equity core: S&P 500
- **VOO** (Vanguard S&P 500 ETF): expense ratio 0.03%; about 505 holdings; top ten about 38% of the fund (Vanguard fact sheet at 31 Dec 2025: 37.9%; other sources 34% to 39%); technology about 38% of the fund on that fact sheet; dividend yield about 1.0% to 1.3%; P/E about 27.5x on the same fact sheet (stale; refresh). Top holdings are Nvidia, Microsoft and Apple.
- Alternatives to compare on Sarwa: IVV (iShares Core S&P 500), SPY (higher fee), and State Street's low-cost S&P 500 ETF (SPYM; verify ticker and fee). Mutual-fund versions (for example VFIAX, FXAIX) will not be on Sarwa.
- Overlap to note: the S&P 500 already contains Constellation Energy (CEG) and large aerospace and defense names, so the NLR and ITA satellites partly double up on the core.
- Questions to answer: sector weights, concentration trend, dividend withholding impact, and how the core would behave in a yield-driven selloff (it falls with the rest of US equities).
- Cost context: 0.03% against 0.06% (VT) is immaterial next to the concentration question.

### Short-term Treasuries / TIPS
- Candidate categories: ultra-short Treasury or T-bill ETFs (examples to research: SGOV, BIL, SHV), short-term TIPS (example: VTIP), broad TIPS (examples: TIP, SCHP).
- Key concept: **duration**. Short-duration funds barely move when yields change; longer ones can fall sharply when yields rise.
- Cash-like yields are currently high (US 10-year around 5.28% on 2 Oct 2026). Also check Sarwa's own cash product rates.
- Question: how interest from US bond funds is treated for a UAE-resident non-US investor (verify with a tax adviser).

### Defense / aerospace (11.25%)
- Reasoning: partial hedge to geopolitical risk, but it is a **budget and backlog story**, not a war-headline trade.
- Facts to verify at build time: the proposed FY2027 US defense budget is $1.5 trillion versus $901 billion approved for FY2026 (a proposal, not law); the House passed a $1.15 trillion authorization; Lockheed rose 10.6% and RTX 7.7% on 23 July 2026 after saying depleted stockpiles need replenishing; RTX backlog about $289 billion.
- Candidates: RTX, Lockheed Martin (LMT), Northrop Grumman (NOC), General Dynamics (GD), L3Harris (LHX). Sector ETFs: ITA, PPA, XAR, SHLD.
- Risks: budget politics, supply-chain limits, fixed-price contract losses, and fragile ceasefire headlines. Some investors exclude defense on values grounds; the owner decides.

### Nuclear energy (11.25%): NLR
- **NLR** (VanEck Uranium and Nuclear ETF): about 28 holdings; top two are Cameco (CCJ) and Constellation Energy (CEG) at roughly 8% each; individual weights capped at 8%; sector mix roughly 46% energy (uranium miners), 38% utilities, 15% industrials; includes non-US names (for example Fortum, CEZ, CGN Power, Kazatomprom). Expense ratio reported between 0.52% and 0.56% (sources differ; verify). Annual distribution.
- **Price and volatility (verify at build time):** closed about $102.74 on 2 Oct 2026; down about 17% year-to-date, about 12% over the prior month, and about 39% below its all-time high of $168.12; one-year volatility about 40%. Drivers of the recent fall are not verified; research them (candidates: higher bond yields hitting capital-intensive, long-dated names; uranium price moves; sentiment).
- **CEG:** largest US nuclear fleet; thesis tied to long-term power contracts with large technology companies (verify current deals). Closer to the AI-power theme the owner wanted less of.
- **CCJ:** uranium producer; moves with the uranium price and mine operations. Next earnings reported as 30 Oct 2026.
- **Policy tailwind:** renewed support for nuclear in the US, France, Japan and China (fund provider commentary).
- **Learning experiment:** hold NLR, CEG and CCJ in the paper ledger as comparisons to see how the fund behaves against its two largest holdings.

### Wildcard (parked)
- Idea: use the owner's own-industry edge (fashion, beauty, lifestyle, ad-driven platforms, creator economy). Treat as an edge to test against valuation, not a certainty.
- Context: consumer discretionary was about -7% year-to-date as of early October 2026.
- Cannabis is allowed only as a capped, high-risk slice. No current regulatory research has been done yet.

---

## 6. Market snapshot (last verified: 2 October 2026; refresh before use)

- **S&P 500:** 7,722.72 close (record 7,798.99 on 13 Aug); up about 12% year-to-date late September.
- **Nasdaq:** 27,190.86, up about 17% year-to-date.
- **US 10-year Treasury yield:** about 5.28%, highest since 2007. 30-year about 5.5%, highest since 2004.
- **Crude oil:** about $91 (Brent about $96 on 29 Sept; above $108 mid-September).
- **Dollar index:** about 102. **Gold:** about $4,172 (not held in this plan).
- **Backdrop:** US/Israel-Iran war since 28 Feb 2026; Strait of Hormuz disruption keeping oil elevated; energy-driven inflation; the Fed returned to rate hikes in September; the RBA raised to 4.6% (fourth hike of 2026); Japan's 10-year yield about 3.1% (highest since 1996). Market breadth is weak and the AI buildout is propping up the economy.
- **Upcoming:** Q3 earnings season starts about 12 Oct; US midterm elections in early November.
- **Transmission chain:** war, then oil, then inflation, then central-bank hikes, then higher bond yields, then lower stock valuations (rate-sensitive sectors suffer most). A firm dollar tightens conditions for Asia and for dollar-priced assets. In yield-driven selloffs, global and US equities fall together; an S&P 500 core takes this shock in full, with no country diversification.

---

## 7. Costs and tax items to verify before January

- **Sarwa Trade fees:** reported as the greater of $1 or 0.25% per stock/ETF trade. A 450 AED buy (about $123) therefore costs about 0.8%, and a 500 AED buy (about $136) about 0.7%. Confirm current fees, minimum order size, and whether fractional shares are supported.
- **Dividend withholding:** US dividends paid to non-US residents face withholding (default rate can be high); a W-8BEN is typically required. Rate depends on tax residence. Verify for a UAE resident.
- **US estate tax:** applies to non-US individuals with US-situs assets above a modest threshold, based on domicile rather than citizenship. Verify with a cross-border tax adviser.
- **Domicile alternative:** Irish-domiciled (UCITS) funds can reduce US withholding and estate-tax exposure, but are not available on Sarwa. Would need another broker; trade-off to weigh.
- **Tax residence and home-country obligations:** verify any obligations tied to citizenship or a future relocation.

---

## 8. Concepts glossary (plain language, then proper)

**ETF / index fund**
- Simple: one bag of mixed sweets instead of buying each sweet.
- Proper: a pooled fund tracking an index, traded like a stock; instant diversification for a small annual fee.

**Diversification and correlation**
- Simple: do not keep all eggs in one basket, and make sure the baskets are not on the same wobbly table.
- Proper: diversification works only when holdings do not move together. Correlation runs from +1 (together) to -1 (opposite) and rises in crises.

**Market-cap weighting and concentration**
- Simple: the biggest kids get the biggest pizza slices, and as they eat more they get even bigger.
- Proper: weight equals company market value divided by total market value; a few giants can dominate an index.

**Expense ratio**
- Simple: a tiny slice of every cake the baker keeps each year.
- Proper: the annual fund fee as a percentage of assets, deducted inside the fund price. Compounds over decades.

**Drawdown and sequence risk**
- Simple: in a video game, how far your score falls from its best before you recover.
- Proper: peak-to-trough decline; a 50% fall needs a 100% gain to recover. Sequence risk (order of returns) bites when withdrawing, not while contributing.

**Dollar-cost averaging (DCA)**
- Simple: buying a bit every month so you are not stuck buying everything on an expensive day.
- Proper: investing fixed amounts on a schedule averages the entry price. Lump-sum investing tends to do slightly better statistically; DCA reduces regret and suits regular income.

**Rebalancing**
- Simple: you set 75 chocolates to 25 gummies; if gummies grow too numerous, trade a few back.
- Proper: restoring target weights by calendar or by threshold bands. Directing new contributions to underweight sleeves rebalances without selling.

**Dividend withholding tax**
- Simple: a company sends pocket money, but a foreign tax collector takes some first.
- Proper: tax deducted at source on dividends paid to non-residents unless a treaty lowers it.

**ADR (American Depositary Receipt)**
- Simple: a ticket sold at the American shop that stands for a share in a foreign company.
- Proper: a certificate allowing a foreign company's shares to trade on US exchanges in dollars; may carry fees and home-country withholding.

**Sleeve**
- Simple: a compartment in a lunchbox, each with its own food and size.
- Proper: a defined slice of the portfolio with its own purpose, target weight, and rules; makes mistakes contained and rebalancing simple.

**Duration**
- Proper: how sensitive a bond fund's price is to interest-rate changes. Short duration means small price moves.

---

## 9. Dashboard specification

The owner wants a multi-layer dashboard.

### Layer 1: Portfolio snapshot
- Total invested, current value, gain/loss in USD and AED, and percentage.
- Same figures **per sleeve** and per holding.
- Contribution versus growth split (money put in versus what it earned).
- Allocation versus target with **drift** per sleeve and a suggested split of the next contribution (default 2,600 / 500 / 450 / 450 AED).
- Fees paid to date (commission rule: greater of $1 or 0.25%), and fee drag as a percentage.
- Paper/real toggle.

### Layer 2: Industry and macro
- **Macro strip** at the top: US 10-year yield, Brent crude, dollar index, VIX.
- Per-sleeve news and a watchlist of candidate companies (defense, wildcard).
- **Weekly summary email**: what happened in the sectors she holds, notable emerging companies to research, and flagged risks. Labelled as research, never as a buy or sell call, with source links and stated uncertainty.

### Layer 3: Key investors and insiders
- Quarterly **13F filings** from SEC EDGAR (for example Berkshire Hathaway): delayed up to 45 days, long US equities only.
- **Congressional trade disclosures**: delayed, reported in value ranges.
- Display a clear "delayed data, not a timing signal" label.

### Extras (later phases)
1. **Benchmark comparison:** portfolio versus the same contributions placed in the S&P 500 fund (VOO) alone. Primary honesty metric. Consider adding a second benchmark of VT (global) so the cost or benefit of the US-only core is visible over time.
2. **Look-through exposure:** how much of each large company (for example Nvidia, Microsoft) is held across the fund plus direct picks.
3. Money-weighted return (XIRR) and a time-weighted return.
4. Drawdown view (worst peak-to-trough).
5. Dividend log including withholding.
6. Thesis log per individual stock with sell criteria and review dates.
7. Goal projector (target amount and date, showing a range of outcomes, not one line).
8. Next-buy reminder for the 1st of each month.

### Weekly review dashboard (owner's specified layout; also built in the interim spreadsheet)
A table the owner updates weekly and assesses, grouped by layer, with these columns:
`Company | Code | This week % | $ invested to date | Since first investment % (price) | Overall P/L % | Overall P/L $ | Trend (last 4 weeks, up/down arrows)`

Groups and rows:
- **CORE** (65%): VOO
- **BALLAST** (12.5%): SGOV
- **SATELLITE** (22.5%): ITA, NLR
- **COMPARISONS** (paper only, no money assigned): CEG, CCJ (NLR's two largest holdings)
- **TOTAL** row, plus the benchmark row (same contributions, 100% VOO) and portfolio-minus-benchmark in percentage points.

Definitions: "This week %" is the change from the previous weekly close. "Since first investment %" is price change only from the baseline row (8 Oct 2026). "Overall P/L %" and "$" use cost basis including fees. Weekly prices are logged on the same weekday each week with no gaps; an indexed-performance chart (baseline = 100) sits below the table.

**News block at the bottom:** one entry per holding (core, ballast, each satellite, each comparison) describing the current news that may be affecting it and why it may matter. Refreshed weekly, with sources and dates, labelled as research and never as a buy or sell call. In the app this is generated from the news layer and can be AI-summarised once an Anthropic API key exists.

**Interim spreadsheet (paper-trading-tracker.xlsx), to be imported as the starting data:**
- `Setup`: peg, monthly contribution, fee rule, tickers, target weights, auto-linked current prices.
- `Ledger`: dated trades (date, ticker, sleeve, AED allocated, USD gross, fee, fill price, units). The 8 Oct 2026 paper buys are pre-listed as 2,600 / 500 / 450 / 450 AED across VOO, SGOV, ITA, NLR; **fill prices are still to be entered by the owner**.
- `Contributions`: dated contributions with the benchmark's VOO price for each date.
- `Weekly Log`: weekly closing prices for VOO, SGOV, ITA, NLR, CEG, CCJ, plus indexed columns.
- `Dashboard`, `Weekly Dashboard`: the calculated views described above.

### Data model (minimum)
- `sleeves` (id, name, target_pct, purpose)
- `instruments` (ticker, name, sleeve_id, currency, expense_ratio, notes)
- `trades` (id, trade_date, fill_date, ticker, side, units, price_usd, fee_usd, fx_rate_aed_usd, sleeve_id, is_paper, note)
- `contributions` (date, amount_aed, fx_rate)
- `prices` (ticker, date, close_usd, source)
- `macro_snapshots` (date, us10y, brent, dxy, vix)
- `theses` (ticker, why, business_model, margin_notes, debt_cash_notes, sell_criteria, review_date, status)
- `news_items`, `filings_13f`, `congress_trades` (later phases)
- `settings` (target weights, fee rule, peg)

### Key calculations
- Average cost basis per holding; unrealized gain/loss (USD and AED using the transaction-date or current FX, stated clearly).
- Drift = actual weight minus target weight per sleeve.
- Fee = max($1, 0.25% of trade value).
- XIRR from dated cash flows (contributions in, current value out).
- Benchmark: simulate buying the benchmark ticker with the same dated contributions.

---

## 10. Technical architecture (recommended)

- **Framework:** Next.js (App Router) with TypeScript and Tailwind CSS. Mobile-first responsive.
- **Hosting:** Vercel.
- **Database:** hosted Postgres (for example Neon through the Vercel Marketplace, or Supabase). Multi-device access means browser localStorage must not be the primary store. Verify current Vercel storage options in the docs when building.
- **Auth:** single-user. Password plus signed session cookie, with the password stored as a hash in an environment variable. **Every page and every API route must require login.** Rate-limit login attempts. Add `noindex` headers and a `robots.txt` that blocks crawling.
- **Market data:** pick one provider with a free or low-cost tier (for example Twelve Data, Finnhub, Financial Modeling Prep, or Alpha Vantage). Cache prices, handle rate limits, and show data freshness. Do not rely on unofficial scraping as the main source.
- **FX:** AED is pegged to USD at 3.6725; keep it as a setting.
- **Filings data:** SEC EDGAR is free and requires a descriptive User-Agent header. Congressional disclosures come from official disclosure sites or a paid aggregator; verify terms.
- **Weekly email:** Vercel Cron triggers a protected API route (verify the cron frequency limits on the plan). The route gathers news and prices, optionally summarizes with the **Anthropic API**, and sends via an email service (for example Resend).
  - **Important:** a Claude Pro chat subscription does **not** include API access. Using the Anthropic API requires a separate Anthropic Console account with API billing. Make this optional: build the email first as a plain digest and add AI summarization once an API key exists.
- **Secrets:** environment variables only (`DATABASE_URL`, `APP_PASSWORD_HASH`, `SESSION_SECRET`, `MARKET_DATA_API_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`). Never commit `.env` files.
- **PWA:** web manifest, app icons, `apple-touch-icon`, `theme-color`, and standalone display so it behaves like an app on iPhone.
- **Design direction:** premium, restrained, editorial; dark and light themes; clear typography; large readable numbers. It should feel like a considered creative-direction piece, not a generic finance template.

### Build phases and acceptance criteria

**Phase 0: scaffold, auth, deploy (do this first to prove the pipeline)**
- Repo created, app deployed to Vercel, login works, database connected.
- Accepts: visiting the URL on an iPhone shows the login screen, and a wrong password is rejected.

**Phase 1: ledger and snapshot**
- Add, edit, delete trades; paper/real flag; contribution log.
- Price fetching with caching; positions; per-sleeve and total gain/loss in USD and AED; allocation versus target; drift; next-contribution planner (2,600 / 500 / 450 / 450 AED); fee tracker.
- Import the interim spreadsheet ledger (columns: date, ticker, sleeve, AED allocated, USD gross, fee, fill price, units) so paper history carries over.
- Accepts: entering a sample set of trades produces correct cost basis, gain/loss, and drift that match a manual spreadsheet check (the interim tracker's test case: 4,000 AED split 2,600 / 500 / 450 / 450 at a 3.6725 peg gives $1,089.18 invested and $4.77 in fees).

**Phase 2: analytics**
- Benchmark comparison, XIRR, contribution versus growth, drawdown view, look-through exposure (manual entry of top fund holdings is acceptable).

**Phase 3: macro and weekly email**
- Macro strip, sector news per sleeve, watchlist, weekly digest email on a schedule.

**Phase 4: investor-filings layer**
- 13F and congressional data with delay labels.

**Phase 5: thesis log, goal projector, dividend and withholding log**

---

## 11. Deploy on Vercel and use on iPhone

1. Create a **private** GitHub repository for the project.
2. Get the project code into the repo. If the owner's plan includes Claude Code, it can create the project, commit, and push. Otherwise generate the files in the chat, download them, and upload or push them to the repo.
3. In Vercel, choose **Add New Project**, import the GitHub repo, and keep the Next.js framework default.
4. Add a hosted Postgres database (Vercel Marketplace or Supabase) and copy its connection string into `DATABASE_URL`.
5. In Vercel **Settings, Environment Variables**, add the secrets listed in section 10. Run the database migration command the build provides.
6. Click **Deploy**. Confirm the deployed URL loads and the login works.
7. Turn on deployment protection for preview URLs so unfinished builds are not public (verify the current setting names in the Vercel docs).
8. Optional: add a custom domain.
9. **iPhone:** open the URL in Safari, tap the Share icon, then **Add to Home Screen**. On desktop, bookmark it.
10. Every push to the main branch redeploys automatically.

Note: Vercel's free (Hobby) plan is intended for personal, non-commercial use; check current plan limits for cron frequency, function duration, and storage.

---

## 12. Security and privacy

- The dashboard holds personal financial data. Treat it as private.
- Never store Sarwa login details, bank details, passport, or ID numbers.
- All routes behind login; secrets in environment variables; HTTPS only.
- There is no Sarwa API confirmed. Holdings enter through a **manual ledger** (or a CSV import if Sarwa provides statement exports). Do not attempt to scrape Sarwa.

---

## 14. Project setup (for a new code project)

Suggested starting structure, so the building Claude has everything in one place:

```
investment-dashboard/
  CLAUDE.md                        # short rules file (below)
  docs/investment-dashboard-brief.md   # this document
  data/paper-trading-tracker.xlsx  # interim ledger to import in Phase 1
  src/ ...                         # the Next.js app
```

**CLAUDE.md should contain:** (1) section 0 of this brief (working style and hard rules); (2) the final allocation table; (3) the build-phase rule: build Phase 0 and Phase 1 only, then stop for approval; (4) the line "Read docs/investment-dashboard-brief.md before every session."

**Before starting, the owner should have ready:** a GitHub account, a Vercel account, a market-data API key, her Sarwa fill prices for 8 Oct 2026, and (optional, later) an Anthropic API key and an email-service key.

---

## 13. Starter prompt to paste into the other Claude account

> I am attaching a full brief for a personal investment dashboard (the document above). Read all of it first. Then: (1) confirm in five lines or fewer what you understand the plan, constraints, and build order to be; (2) list any assumptions or risks you see, bluntly; (3) build Phase 0 and Phase 1 only, as working code, with exact steps for running locally and deploying to Vercel; (4) stop and wait for my approval before Phase 2. Match my working style from section 0: direct, deep, no filler.

**Tip:** if the other account supports Projects, create one and add this document to its knowledge so it persists across chats.
