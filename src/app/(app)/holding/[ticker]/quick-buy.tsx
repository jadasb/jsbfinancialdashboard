"use client";
import { useActionState, useState } from "react";
import { addPurchase } from "../../actions";
import { Submit } from "@/components/forms";
import { Field } from "@/components/field";

type Props = {
  ticker: string;
  book: "paper" | "real";
  feeMinUsd: number;
  feeRate: number;
  pegAedPerUsd: number;
  today: string;
  lastPrice: number | null;
};

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export function QuickBuy({ ticker, book, feeMinUsd, feeRate, pegAedPerUsd, today, lastPrice }: Props) {
  const [state, action] = useActionState(addPurchase, undefined);
  const [currency, setCurrency] = useState<"USD" | "AED">("USD");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");

  const amt = Number(amount), px = Number(price);
  const usd = amt > 0 ? (currency === "USD" ? amt : amt / pegAedPerUsd) : 0;
  const fee = usd > 0 ? Math.round(Math.max(feeMinUsd, feeRate * usd) * 100) / 100 : 0;
  const shares = usd > fee && px > 0 ? (usd - fee) / px : null;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="ticker" value={ticker} />
      <input type="hidden" name="book" value={book} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Amount invested">
          <div className="flex gap-2">
            <select name="amountCurrency" className="field !w-24" value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "AED")}>
              <option>USD</option>
              <option>AED</option>
            </select>
            <input name="amount" inputMode="decimal" required className="field num" placeholder={currency === "USD" ? "e.g. 123.45" : "e.g. 450"}
              value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </Field>
        <Field label="Date of purchase">
          <input type="date" name="date" required max={today} defaultValue={today} className="field" />
        </Field>
        <Field label="Price per share (USD)" hint={lastPrice ? `Latest stored: $${lastPrice.toFixed(2)}. Enter your actual fill.` : "Your actual fill price."}>
          <input name="priceUsd" inputMode="decimal" required className="field num" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
      </div>

      <p className="text-sm text-muted num" aria-live="polite">
        {usd > 0 ? (
          <>
            {money(usd)} in · fee {money(fee)} · {shares != null ? <span className="text-ink">{shares.toFixed(4)} shares</span> : "enter a price to see shares"}
          </>
        ) : (
          "Fee and shares appear as you type."
        )}
      </p>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="logContribution" defaultChecked className="mt-1 size-4 accent-[var(--accent)]" />
        <span>
          Also log this as money added to the account
          <span className="block text-xs text-faint">Untick if you already logged the month&rsquo;s 4,000 AED as one contribution.</span>
        </span>
      </label>

      <div className="flex items-center gap-4">
        <Submit pending="Adding…">Add purchase</Submit>
        <span className="text-xs text-muted capitalize">{book} book</span>
      </div>
      {state?.error && <p role="alert" className="text-sm text-neg">{state.error}</p>}
    </form>
  );
}
