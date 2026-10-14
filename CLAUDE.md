# CLAUDE.md

Read docs/investment-dashboard-brief.md before every session.

## Working style
- Direct, decisive, outcome-driven. Deep reasoning, not surface answers.
- Blunt, honest feedback. No filler, flattery, or chatbot language.
- The output must work, not just read well. If something is almost right, fix it.
- It should feel right (design, tone) and perform (accuracy, usability).

## Hard rules
- Never invent market data, prices, or filings. If a data source fails, show the failure clearly.
- Never present research output as a buy or sell instruction. Label it research.
- Never store brokerage credentials, account numbers, or ID documents anywhere.
- Flag any assumption you make.

## Allocation (Version A)
| Sleeve | Target | AED / month | Paper-trade instrument |
|---|---|---|---|
| US equity (S&P 500) | 65% | 2,600 | VOO |
| Short-term Treasuries / TIPS | 12.5% | 500 | SGOV |
| Defense / aerospace | 11.25% | 450 | ITA |
| Nuclear energy | 11.25% | 450 | NLR |
Wildcard parked at 0%. Comparisons (paper only): CEG, CCJ.

## Build phases
Phase 0 and Phase 1 are built. Do not start a later phase without the owner's explicit approval.

## Codebase rules
- All portfolio maths lives in `src/lib/calc.ts` and must stay pure and tested (`npm test`).
- Migrations are append-only in `src/db/migrations.ts`; mirror changes in `src/db/schema.ts`.
- Every server action and route handler calls `requireSession()` / `hasSession()`, in addition to middleware.
