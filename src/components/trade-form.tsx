import type { Instrument, Trade } from "@/db/schema";
import { createTrade, updateTrade } from "@/app/(app)/actions";
import { ActionForm, Submit } from "./forms";
import { Field } from "./field";

// Editing re-submits the amount, so prefill the exact figure the trade was entered with:
// AED when it has one (no rounding drift), else USD gross.
function amountDefault(t?: Trade): { currency: "AED" | "USD"; amount: string } {
  if (!t) return { currency: "AED", amount: "" };
  if (t.amountAed != null) return { currency: "AED", amount: String(+t.amountAed.toFixed(4)) };
  return { currency: "USD", amount: String(t.grossUsd) };
}

export function TradeForm({ instruments, book, trade }: { instruments: Instrument[]; book: "paper" | "real"; trade?: Trade }) {
  const today = new Date().toISOString().slice(0, 10);
  const edit = !!trade;
  const amt = amountDefault(trade);
  return (
    <ActionForm action={edit ? updateTrade : createTrade} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {edit && <input type="hidden" name="id" value={trade.id} />}
      <Field label="Book">
        <select name="book" className="field" defaultValue={trade ? (trade.isPaper ? "paper" : "real") : book}>
          <option value="paper">Paper</option>
          <option value="real">Real</option>
        </select>
      </Field>
      <Field label="Side">
        <select name="side" className="field" defaultValue={trade?.side ?? "buy"}>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
      </Field>
      <Field label="Trade date" hint="Payday / order date">
        <input type="date" name="tradeDate" className="field" required defaultValue={trade?.tradeDate ?? today} />
      </Field>
      <Field label="Fill date" hint="Blank = same as trade date">
        <input type="date" name="fillDate" className="field" defaultValue={trade?.fillDate ?? ""} />
      </Field>
      <Field label="Ticker">
        <select name="ticker" className="field" required defaultValue={trade?.ticker ?? "VOO"}>
          {instruments.map((i) => (
            <option key={i.ticker} value={i.ticker}>{i.ticker} · {i.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Amount" hint="Buy: money in, fee included. Sell: blank = units × price.">
        <div className="flex gap-2">
          <select name="amountCurrency" className="field !w-24" defaultValue={amt.currency}>
            <option>AED</option>
            <option>USD</option>
          </select>
          <input name="amount" inputMode="decimal" className="field num" defaultValue={amt.amount} />
        </div>
      </Field>
      <Field label="Fill price (USD)" hint="From Sarwa. Blank = pending.">
        <input name="priceUsd" inputMode="decimal" className="field num" defaultValue={trade?.priceUsd ?? ""} />
      </Field>
      <Field label="Units" hint="Blank = (amount − fee) ÷ price">
        <input name="units" inputMode="decimal" className="field num" defaultValue={trade?.units ?? ""} />
      </Field>
      <Field label="Fee (USD)" hint="Blank = fee rule">
        <input name="feeUsd" inputMode="decimal" className="field num" defaultValue={trade?.feeUsd ?? ""} />
      </Field>
      <Field label="Note" className="col-span-2 sm:col-span-3">
        <input name="note" className="field" maxLength={500} defaultValue={trade?.note ?? ""} />
      </Field>
      <div className="col-span-2 sm:col-span-4">
        <Submit>{edit ? "Save trade" : "Add trade"}</Submit>
      </div>
    </ActionForm>
  );
}
