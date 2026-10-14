import { getDb } from "@/db";
import { addManualPrice, deletePrice } from "../actions";
import { ActionForm, Submit } from "@/components/forms";
import { Field } from "@/components/field";
import { lastFetch, listInstruments, recentPrices } from "@/lib/data";
import { ago, price, shortDate } from "@/lib/format";
import { RefreshButton } from "./refresh";

export const metadata = { title: "Prices" };

export default async function PricesPage() {
  const db = await getDb();
  const [insts, rows, log] = await Promise.all([listInstruments(db), recentPrices(db, 80), lastFetch(db)]);
  const hasKey = !!process.env.MARKET_DATA_API_KEY;
  return (
    <div className="space-y-12">
      <section>
        <h1 className="font-serif text-3xl tracking-tight">Prices</h1>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          Live quotes come from Twelve Data and are cached. Manual and imported prices are kept separately and never overwritten.
          Valuations use the latest date available for each ticker.
        </p>
        <div className="mt-6 flex flex-wrap items-start gap-6">
          <RefreshButton disabled={!hasKey} />
          <div className="text-sm">
            <p className="eyebrow">Last fetch</p>
            {log ? (
              <p className={`mt-1 ${log.ok ? "text-muted" : "text-neg"}`}>
                {ago(log.fetchedAt)} · {log.ok ? "ok" : "failed"} · {log.message}
              </p>
            ) : (
              <p className="mt-1 text-muted">{hasKey ? "Not fetched yet." : "MARKET_DATA_API_KEY is not set."}</p>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl tracking-tight">Enter a price</h2>
        <p className="text-sm text-muted mt-1">For fills or weekly closes you read in Sarwa. Stored with source &ldquo;manual&rdquo;.</p>
        <ActionForm action={addManualPrice} className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end mt-4">
          <Field label="Ticker">
            <select name="ticker" className="field">{insts.map((i) => <option key={i.ticker}>{i.ticker}</option>)}</select>
          </Field>
          <Field label="Date"><input type="date" name="date" className="field" required defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
          <Field label="Close (USD)"><input name="closeUsd" inputMode="decimal" className="field num" required /></Field>
          <div><Submit>Save price</Submit></div>
        </ActionForm>
      </section>

      <section>
        <h2 className="font-serif text-2xl tracking-tight">Price cache</h2>
        <div className="overflow-x-auto mt-4">
          <table className="data">
            <thead><tr><th>Ticker</th><th>Date</th><th>Close</th><th className="l">Source</th><th>Fetched</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="l text-muted">No prices stored.</td></tr>}
              {rows.map((r) => (
                <tr key={`${r.ticker}-${r.date}-${r.source}`}>
                  <td className="font-medium">{r.ticker}</td>
                  <td>{shortDate(r.date)}</td>
                  <td>{price(r.closeUsd)}</td>
                  <td className="l text-muted">{r.source}</td>
                  <td className="text-muted">{ago(r.fetchedAt)}</td>
                  <td>
                    {r.source !== "twelvedata" && (
                      <form action={deletePrice}>
                        <input type="hidden" name="ticker" value={r.ticker} />
                        <input type="hidden" name="date" value={r.date} />
                        <input type="hidden" name="source" value={r.source} />
                        <button className="text-muted underline underline-offset-4 hover:text-neg text-xs">Remove</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
