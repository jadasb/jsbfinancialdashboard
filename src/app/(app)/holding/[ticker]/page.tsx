import Link from "next/link";
import { notFound } from "next/navigation";
import { currentBook } from "@/lib/book";
import { resolveUnits } from "@/lib/calc";
import { aed, pct, pp, price, shortDate, signedPct, signedUsd, tone, units, usd } from "@/lib/format";
import { loadSnapshot } from "@/lib/snapshot";
import { getDb } from "@/db";
import { listTrades } from "@/lib/data";
import { QuickBuy } from "./quick-buy";

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }) {
  return { title: decodeURIComponent((await params).ticker).toUpperCase() };
}

export default async function HoldingPage({ params, searchParams }: { params: Promise<{ ticker: string }>; searchParams: Promise<{ added?: string }> }) {
  const ticker = decodeURIComponent((await params).ticker).toUpperCase();
  const { added } = await searchParams;
  const book = await currentBook();
  const { settings: s, snap, quotes, insts } = await loadSnapshot(book);
  const inst = insts.find((i) => i.ticker === ticker);
  if (!inst) notFound();

  const all = [...snap.sleeves.flatMap((r) => r.positions), ...snap.comparisons];
  const pos = all.find((p) => p.ticker === ticker) ?? null;
  const sleeveRow = snap.sleeves.find((r) => r.sleeve.id === inst.sleeveId) ?? null;
  const quote = quotes.get(ticker) ?? null;
  const log = (await listTrades(await getDb(), book)).filter((t) => t.ticker === ticker);
  const today = new Date(Date.now() + 4 * 3_600_000).toISOString().slice(0, 10);
  const isComparison = inst.sleeveId === "comparison";

  return (
    <div className="space-y-12">
      <Link href="/" className="inline-block text-sm text-muted">← Snapshot</Link>

      <section>
        <p className="eyebrow">{sleeveRow?.sleeve.name ?? (isComparison ? "Comparison (paper only)" : inst.sleeveId)}</p>
        <h1 className="font-serif text-5xl tracking-tight mt-2">{ticker}</h1>
        <p className="text-muted mt-1">{inst.name}</p>
        <p className="num mt-4">
          <span className="font-serif text-3xl">{price(quote?.closeUsd)}</span>
          <span className="text-sm text-faint ml-2">{quote ? `${shortDate(quote.date)} · ${quote.source}` : "no price yet"}</span>
        </p>
      </section>

      {added && <p role="status" className="text-pos text-sm">Purchase added. Every figure below and on the snapshot is updated.</p>}

      <section className="rounded-lg border border-line bg-surface p-4 sm:p-6">
        <h2 className="font-serif text-2xl tracking-tight mb-5">Add a purchase</h2>
        {isComparison && book === "real" ? (
          <p className="text-sm text-muted">{ticker} is a paper-only comparison. Switch to the paper book to log it.</p>
        ) : (
          <QuickBuy ticker={ticker} book={book} feeMinUsd={s.feeMinUsd} feeRate={s.feeRate} pegAedPerUsd={s.pegAedPerUsd} today={today} lastPrice={quote?.closeUsd ?? null} />
        )}
      </section>

      {pos && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
          {[
            ["Value", usd(pos.valueUsd), pos.valueUsd != null ? aed(pos.valueUsd * s.pegAedPerUsd) : undefined],
            ["Gain / loss", <span key="g" className={tone(pos.gainUsd)}>{signedUsd(pos.gainUsd)}</span>, <span key="gp" className={tone(pos.gainUsd)}>{signedPct(pos.gainPct)}</span>],
            ["Invested", usd(pos.costBasisUsd), `fees ${usd(pos.feesUsd)}`],
            ["Shares", pos.pendingBuys > 0 ? "—" : units(pos.units), pos.units > 0 && pos.pendingBuys === 0 ? `avg ${price(pos.costBasisUsd / pos.units)}` : undefined],
          ].map(([label, value, sub]) => (
            <div key={String(label)}>
              <p className="eyebrow">{label}</p>
              <p className="num font-serif text-3xl tracking-tight mt-2 leading-none">{value}</p>
              {sub && <p className="num text-sm text-muted mt-2">{sub}</p>}
            </div>
          ))}
          {sleeveRow && sleeveRow.sleeve.targetPct > 0 && (
            <p className="col-span-2 lg:col-span-4 text-sm text-muted num">
              Sleeve weight {pct(sleeveRow.weight)} vs target {pct(sleeveRow.sleeve.targetPct)} · drift {pp(sleeveRow.driftPp)}
            </p>
          )}
          {pos.problems.length > 0 && <p className="col-span-2 lg:col-span-4 text-sm text-warn">{pos.problems.join(" ")}</p>}
        </section>
      )}

      <section>
        <h2 className="font-serif text-2xl tracking-tight">Purchase log <span className="text-muted text-lg capitalize">· {book}</span></h2>
        <div className="overflow-x-auto mt-4">
          <table className="data">
            <thead><tr><th>Date</th><th>Amount</th><th>Price</th><th>Shares</th><th className="hidden sm:table-cell">Fee</th><th></th></tr></thead>
            <tbody>
              {log.length === 0 && <tr><td colSpan={6} className="l text-muted">No purchases of {ticker} in this book yet.</td></tr>}
              {log.map((t) => (
                <tr key={t.id}>
                  <td className="l">{shortDate(t.fillDate ?? t.tradeDate)}{t.side === "sell" && <span className="block text-xs text-neg">sell</span>}</td>
                  <td>{usd(t.grossUsd)}</td>
                  <td className={t.priceUsd == null ? "text-warn" : ""}>{t.priceUsd == null ? "missing" : price(t.priceUsd)}</td>
                  <td>{units(resolveUnits({ ...t, side: t.side as "buy" | "sell" }))}</td>
                  <td className="hidden sm:table-cell">{usd(t.feeUsd)}</td>
                  <td><Link href={`/ledger/trade/${t.id}`} className="text-muted underline underline-offset-4 hover:text-ink">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
