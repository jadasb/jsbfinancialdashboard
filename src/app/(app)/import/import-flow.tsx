"use client";
import { useActionState } from "react";
import Link from "next/link";
import { confirmImport, previewImport, type ImportState } from "../actions";
import { Submit } from "@/components/forms";

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ImportFlow() {
  const [preview, previewAction] = useActionState<ImportState, FormData>(previewImport, undefined);
  const [result, confirmAction] = useActionState<ImportState, FormData>(confirmImport, undefined);
  const p = preview?.preview;

  if (result?.done) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-pos">{result.done}</p>
        <div className="flex gap-3"><Link className="btn" href="/">View snapshot</Link><Link className="btn btn-ghost" href="/ledger">Open ledger</Link></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <form action={previewAction} className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="eyebrow">Tracker file (.xlsx)</span>
          <input type="file" name="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required className="field mt-1.5" />
        </label>
        <Submit className="btn btn-ghost" pending="Reading…">Preview</Submit>
      </form>
      {preview?.error && <p role="alert" className="text-neg text-sm">{preview.error}</p>}

      {p && (
        <div className="space-y-6">
          {p.errors.length > 0 && (
            <div className="rounded-md border border-neg/40 px-4 py-3 text-sm text-neg space-y-1">
              {p.errors.map((e) => <p key={e}>{e}</p>)}
            </div>
          )}
          {p.warnings.length > 0 && (
            <div className="rounded-md bg-warn-bg text-warn px-4 py-3 text-sm space-y-1">
              {p.warnings.map((w) => <p key={w}>{w}</p>)}
            </div>
          )}
          <div>
            <p className="eyebrow">Will import into the paper book</p>
            <p className="mt-2 text-sm">
              {p.data.trades.length} trades · {p.data.contributions.length} contributions · {p.data.prices.length} prices
            </p>
          </div>
          {p.data.trades.length > 0 && (
            <div className="overflow-x-auto">
              <table className="data">
                <thead><tr><th>Date</th><th className="l">Ticker</th><th>AED</th><th>USD gross</th><th>Fee</th><th>Fill price</th></tr></thead>
                <tbody>
                  {p.data.trades.map((t) => (
                    <tr key={t.importRef}>
                      <td className="l">{t.tradeDate}</td>
                      <td className="l font-medium">{t.ticker}</td>
                      <td>{money(t.amountAed)}</td>
                      <td>{money(t.grossUsd)}</td>
                      <td>{money(t.feeUsd)}</td>
                      <td className={t.priceUsd == null ? "text-warn" : ""}>{t.priceUsd == null ? "missing" : money(t.priceUsd)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="l text-muted">Total</td><td></td>
                    <td className="font-medium">{money(p.data.trades.reduce((a, t) => a + t.amountAed, 0))}</td>
                    <td className="font-medium">{money(p.data.trades.reduce((a, t) => a + t.grossUsd, 0))}</td>
                    <td className="font-medium">{money(p.data.trades.reduce((a, t) => a + t.feeUsd, 0))}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <form action={confirmAction}>
            <input type="hidden" name="payload" value={preview?.payload ?? ""} />
            <Submit pending="Importing…">Import to paper book</Submit>
            {result?.error && <p role="alert" className="text-neg text-sm mt-3">{result.error}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
