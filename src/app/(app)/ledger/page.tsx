import Link from "next/link";
import { getDb } from "@/db";
import { ContributionForm } from "@/components/contribution-form";
import { TradeForm } from "@/components/trade-form";
import { currentBook } from "@/lib/book";
import { resolveUnits } from "@/lib/calc";
import { getSettings, listContributions, listInstruments, listTrades } from "@/lib/data";
import { aed, price, shortDate, units, usd } from "@/lib/format";

export const metadata = { title: "Ledger" };

const SAVED: Record<string, string> = { trade: "Trade saved.", contribution: "Contribution saved.", deleted: "Deleted." };

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const book = await currentBook();
  const db = await getDb();
  const [instruments, trades, contribs, s] = await Promise.all([listInstruments(db), listTrades(db, book), listContributions(db, book), getSettings(db)]);

  return (
    <div className="space-y-14">
      {saved && SAVED[saved] && <p role="status" className="text-sm text-pos">{SAVED[saved]}</p>}

      <section>
        <h1 className="font-serif text-3xl tracking-tight">Trades <span className="text-muted text-xl capitalize">· {book}</span></h1>
        <div className="overflow-x-auto mt-4">
          <table className="data">
            <thead><tr><th>Date</th><th className="l">Ticker</th><th className="l">Side</th><th>AED</th><th>USD gross</th><th>Fee</th><th>Fill</th><th>Units</th><th></th></tr></thead>
            <tbody>
              {trades.length === 0 && <tr><td colSpan={9} className="l text-muted">No trades in this book.</td></tr>}
              {trades.map((t) => {
                const u = resolveUnits({ ...t, side: t.side as "buy" | "sell" });
                return (
                  <tr key={t.id}>
                    <td className="l">
                      {shortDate(t.tradeDate)}
                      {t.fillDate && t.fillDate !== t.tradeDate && <span className="block text-xs text-faint">filled {shortDate(t.fillDate)}</span>}
                    </td>
                    <td className="l font-medium">{t.ticker}</td>
                    <td className="l capitalize">{t.side}</td>
                    <td>{aed(t.amountAed)}</td>
                    <td>{usd(t.grossUsd)}</td>
                    <td>{usd(t.feeUsd)}</td>
                    <td className={t.priceUsd == null ? "text-warn" : ""}>{t.priceUsd == null ? "missing" : price(t.priceUsd)}</td>
                    <td>{units(u)}</td>
                    <td><Link href={`/ledger/trade/${t.id}`} className="text-muted underline underline-offset-4 hover:text-ink">Edit</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <details className="mt-6 group" open={trades.length === 0}>
          <summary className="btn btn-ghost cursor-pointer list-none w-fit">Add a trade</summary>
          <div className="mt-6"><TradeForm instruments={instruments} book={book} /></div>
        </details>
      </section>

      <section>
        <h2 className="font-serif text-3xl tracking-tight">Contributions</h2>
        <p className="text-sm text-muted mt-1">Money moved into the account. Used for cash and contributions-vs-growth.</p>
        <div className="overflow-x-auto mt-4">
          <table className="data">
            <thead><tr><th>Date</th><th>AED</th><th>USD</th><th className="l">Note</th><th></th></tr></thead>
            <tbody>
              {contribs.length === 0 && <tr><td colSpan={5} className="l text-muted">No contributions in this book.</td></tr>}
              {contribs.map((c) => (
                <tr key={c.id}>
                  <td className="l">{shortDate(c.date)}</td>
                  <td>{aed(c.amountAed)}</td>
                  <td>{usd(c.amountAed / c.fxRate)}</td>
                  <td className="l text-muted">{c.note ?? ""}</td>
                  <td><Link href={`/ledger/contribution/${c.id}`} className="text-muted underline underline-offset-4 hover:text-ink">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="mt-6">
          <summary className="btn btn-ghost cursor-pointer list-none w-fit">Add a contribution</summary>
          <div className="mt-6"><ContributionForm book={book} defaultAed={s.monthlyContributionAed} /></div>
        </details>
      </section>
    </div>
  );
}
