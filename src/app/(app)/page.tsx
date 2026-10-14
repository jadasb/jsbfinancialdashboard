import Link from "next/link";
import { currentBook } from "@/lib/book";
import { expectedFill, nextPayday } from "@/lib/calendar";
import { aed, ago, pct, pp, price, shortDate, signedAed, signedPct, signedUsd, tone, units, usd } from "@/lib/format";
import { loadSnapshot } from "@/lib/snapshot";

export const metadata = { title: "Snapshot" };

function Stat({ label, value, sub, className = "" }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="eyebrow">{label}</p>
      <p className="num font-serif text-3xl sm:text-4xl tracking-tight mt-2 leading-none">{value}</p>
      {sub && <p className="num text-sm text-muted mt-2">{sub}</p>}
    </div>
  );
}

function DriftBar({ driftPp, threshold }: { driftPp: number | null; threshold: number }) {
  if (driftPp == null) return <span className="text-faint">—</span>;
  const span = Math.max(threshold * 2, Math.abs(driftPp) * 1.2);
  const w = Math.min(50, (Math.abs(driftPp) / span) * 50);
  const out = Math.abs(driftPp) >= threshold;
  return (
    <div className="relative h-1.5 w-24 sm:w-32 bg-line/60 rounded-full ml-auto" aria-hidden>
      <div className="absolute top-[-3px] bottom-[-3px] w-px bg-muted left-1/2" />
      <div
        className={`absolute top-0 bottom-0 rounded-full ${out ? "bg-neg" : "bg-ink/70"}`}
        style={driftPp >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
      />
    </div>
  );
}

export default async function SnapshotPage() {
  const book = await currentBook();
  const { settings: s, snap, plan, quotes, insts, fetchLog, refreshError, tradeCount, hasKey } = await loadSnapshot(book);
  const payday = nextPayday();
  const fill = expectedFill(payday);
  const comparisonTickers = insts.filter((i) => i.sleeveId === "comparison").map((i) => i.ticker);

  if (tradeCount === 0) {
    return (
      <section className="max-w-xl">
        <p className="eyebrow">{book} book</p>
        <h1 className="font-serif text-4xl mt-2 tracking-tight">No trades yet.</h1>
        <p className="text-muted mt-3 leading-relaxed">
          {book === "paper"
            ? "Import the paper-trading tracker to bring over the 8 October 2026 buys, or add trades by hand."
            : "The real book starts with the first Sarwa buy in January 2027. Record each fill in the ledger."}
        </p>
        <p className="eyebrow mt-8">Add a purchase</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {insts.filter((i) => book === "paper" || i.sleeveId !== "comparison").map((i) => (
            <Link key={i.ticker} href={`/holding/${i.ticker}`} className="btn btn-ghost">{i.ticker}</Link>
          ))}
        </div>
        {book === "paper" && (
          <p className="text-sm text-muted mt-6">
            Or <Link className="underline underline-offset-4" href="/import">import the tracker spreadsheet</Link>.
          </p>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-14">
      {/* Data health: every gap is stated, never papered over. */}
      {(snap.problems.length > 0 || refreshError || (fetchLog && !fetchLog.ok) || !hasKey) && (
        <section className="rounded-md bg-warn-bg text-warn px-4 py-3 text-sm space-y-1">
          {!hasKey && <p>No market-data key set: valuations use manual and imported prices only.</p>}
          {refreshError && <p>Price refresh failed: {refreshError}</p>}
          {fetchLog && !fetchLog.ok && <p>Last price fetch ({ago(fetchLog.fetchedAt)}) had failures: {fetchLog.message}</p>}
          {snap.problems.map((p) => <p key={p}>{p}</p>)}
        </section>
      )}

      <section>
        <p className="eyebrow">{book} book · current value</p>
        <p className="num font-serif text-6xl sm:text-7xl tracking-tight mt-3 leading-none">{usd(snap.valueUsd)}</p>
        <p className="num text-muted mt-3">
          {aed(snap.valueAed)}
          {snap.gainUsd != null && (
            <>
              {" · "}
              <span className={tone(snap.gainUsd)}>{signedUsd(snap.gainUsd)} ({signedPct(snap.gainPct)})</span>
            </>
          )}
        </p>
        {!snap.complete && <p className="text-sm text-warn mt-2">Value is blank until every holding has a fill price and a quote.</p>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8 mt-10 pt-8 border-t border-line">
          <Stat label="Invested (cost incl. fees)" value={usd(snap.costBasisUsd)} sub={aed(snap.costBasisAed)} />
          <Stat
            label="Gain / loss"
            value={<span className={tone(snap.gainUsd)}>{signedUsd(snap.gainUsd)}</span>}
            sub={<span className={tone(snap.gainAed)}>{signedAed(snap.gainAed)}</span>}
          />
          <Stat label="Fees paid" value={usd(snap.feesUsd)} sub={`${pct(snap.feeDragPct)} of money invested`} />
          <Stat label="Realized" value={<span className={tone(snap.realizedUsd)}>{signedUsd(snap.realizedUsd)}</span>} sub="from sales" />
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl tracking-tight">Contributions vs growth</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8 mt-6">
          <Stat label="Put in" value={usd(snap.contributedUsd)} sub={aed(snap.contributedAed)} />
          <Stat label="Uninvested cash" value={usd(snap.cashUsd)} />
          <Stat label="Account value" value={usd(snap.accountValueUsd)} sub="holdings + cash" />
          <Stat label="Earned" value={<span className={tone(snap.growthUsd)}>{signedUsd(snap.growthUsd)}</span>} sub="after fees" />
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-2xl tracking-tight">Allocation vs target</h2>
          <p className="text-xs text-muted">Rebalance band ±{s.driftThresholdPp}pp</p>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="data">
            <thead>
              <tr><th>Sleeve</th><th className="hidden sm:table-cell">Target</th><th>Actual</th><th>Drift</th><th className="hidden sm:table-cell"></th><th className="hidden sm:table-cell">Value</th><th className="hidden sm:table-cell">Gain</th></tr>
            </thead>
            <tbody>
              {snap.sleeves.map((r) => (
                <tr key={r.sleeve.id}>
                  <td className="l">
                    <span className="font-medium whitespace-normal">{r.sleeve.name}</span>
                    <span className="block text-xs text-faint">
                      {r.positions.length === 0 ? "—" : r.positions.map((p, i) => (
                        <span key={p.ticker}>{i > 0 && ", "}<Link href={`/holding/${p.ticker}`} className="hover:text-ink">{p.ticker}</Link></span>
                      ))}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell">{pct(r.sleeve.targetPct)}</td>
                  <td>
                    {pct(r.weight)}
                    <span className="block text-xs text-faint sm:hidden">of {pct(r.sleeve.targetPct)}</span>
                  </td>
                  <td className={r.status === "over" || r.status === "under" ? "text-neg font-medium" : ""}>{pp(r.driftPp)}</td>
                  <td className="hidden sm:table-cell"><DriftBar driftPp={r.driftPp} threshold={s.driftThresholdPp} /></td>
                  <td className="hidden sm:table-cell">{usd(r.valueUsd)}</td>
                  <td className={`hidden sm:table-cell ${tone(r.gainUsd)}`}>{signedPct(r.gainPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-2xl tracking-tight">Holdings</h2>
          <p className="text-xs text-muted">Tap a ticker to add a purchase</p>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="data">
            <thead>
              <tr><th>Ticker</th><th className="hidden sm:table-cell">Units</th><th className="hidden sm:table-cell">Avg cost</th><th>Price</th><th>Value</th><th className="hidden sm:table-cell">Gain $</th><th>Gain %</th><th className="hidden sm:table-cell">Fees</th></tr>
            </thead>
            <tbody>
              {snap.sleeves.flatMap((r) => r.positions).map((p) => (
                <tr key={p.ticker}>
                  <td className="l">
                    <Link href={`/holding/${p.ticker}`} className="font-medium underline decoration-line underline-offset-4 hover:decoration-ink">{p.ticker}</Link>
                    {p.pendingBuys > 0 && <span className="block text-xs text-warn">needs fill price</span>}
                  </td>
                  <td className="hidden sm:table-cell">{p.pendingBuys > 0 ? "—" : units(p.units)}</td>
                  <td className="hidden sm:table-cell">{p.units > 0 && p.pendingBuys === 0 ? price(p.costBasisUsd / p.units) : "—"}</td>
                  <td>
                    {price(p.quote?.closeUsd)}
                    {p.quote && <span className="block text-xs text-faint">{shortDate(p.quote.date)}<span className="hidden sm:inline"> · {p.quote.source}</span></span>}
                  </td>
                  <td>{usd(p.valueUsd)}</td>
                  <td className={`hidden sm:table-cell ${tone(p.gainUsd)}`}>{signedUsd(p.gainUsd)}</td>
                  <td className={tone(p.gainUsd)}>{signedPct(p.gainPct)}</td>
                  <td className="hidden sm:table-cell">{usd(p.feesUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-faint mt-3 leading-relaxed">
          Cost in AED uses each trade&rsquo;s recorded rate; value in AED uses the current peg ({s.pegAedPerUsd}). While the peg holds, they match.
        </p>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h2 className="font-serif text-2xl tracking-tight">Next contribution</h2>
          <p className="text-sm text-muted num">
            Payday {shortDate(payday)}
            {fill !== payday && <> · fills {shortDate(fill)} (US market closed on the 1st)</>}
          </p>
        </div>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">{plan.reason}</p>
        <div className="overflow-x-auto mt-4">
          <table className="data">
            <thead><tr><th>Sleeve</th><th className="hidden sm:table-cell">Target</th><th>AED</th><th className="hidden sm:table-cell">USD</th><th>Est. fee</th><th className="hidden sm:table-cell">Fee %</th></tr></thead>
            <tbody>
              {plan.rows.map((r) => (
                <tr key={r.sleeveId}>
                  <td className="l font-medium !whitespace-normal">{r.name}</td>
                  <td className="hidden sm:table-cell">{pct(r.targetPct)}</td>
                  <td className="font-medium">{aed(r.aed, true)}</td>
                  <td className="hidden sm:table-cell">{usd(r.usd)}</td>
                  <td>{usd(r.feeUsd)}</td>
                  <td className={`hidden sm:table-cell ${r.feePct != null && r.feePct > 0.0075 ? "text-warn" : ""}`}>{pct(r.feePct)}</td>
                </tr>
              ))}
              <tr>
                <td className="l text-muted">Total</td><td className="hidden sm:table-cell"></td>
                <td className="font-medium">{aed(plan.rows.reduce((a, r) => a + r.aed, 0), true)}</td>
                <td className="hidden sm:table-cell">{usd(plan.rows.reduce((a, r) => a + r.usd, 0))}</td>
                <td>{usd(plan.totalFeeUsd)}</td><td className="hidden sm:table-cell"></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-faint mt-3">Fee estimate uses the recorded rule (greater of ${s.feeMinUsd} or {(s.feeRate * 100).toFixed(2)}%). Verify current Sarwa fees.</p>
      </section>

      {comparisonTickers.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl tracking-tight">Comparisons</h2>
          <p className="text-sm text-muted mt-1">NLR&rsquo;s two largest holdings. Paper only, no money assigned.</p>
          <div className="flex gap-10 mt-4">
            {comparisonTickers.map((t) => {
              const q = quotes.get(t);
              return (
                <Link key={t} href={`/holding/${t}`} className="block hover:opacity-80">
                  <p className="eyebrow">{t}</p>
                  <p className="num font-serif text-2xl mt-1">{price(q?.closeUsd)}</p>
                  <p className="text-xs text-faint mt-1">{q ? `${shortDate(q.date)} · ${q.source}` : "no price yet"}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
