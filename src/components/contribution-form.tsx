import type { Contribution } from "@/db/schema";
import { saveContribution } from "@/app/(app)/actions";
import { ActionForm, Submit } from "./forms";
import { Field } from "./field";

export function ContributionForm({ book, c, defaultAed }: { book: "paper" | "real"; c?: Contribution; defaultAed: number }) {
  return (
    <ActionForm action={saveContribution} className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Book">
        <select name="book" className="field" defaultValue={c ? (c.isPaper ? "paper" : "real") : book}>
          <option value="paper">Paper</option>
          <option value="real">Real</option>
        </select>
      </Field>
      <Field label="Date">
        <input type="date" name="date" className="field" required defaultValue={c?.date ?? new Date().toISOString().slice(0, 10)} />
      </Field>
      <Field label="Amount (AED)">
        <input name="amountAed" inputMode="decimal" className="field num" required defaultValue={c?.amountAed ?? defaultAed} />
      </Field>
      <Field label="Note">
        <input name="note" className="field" maxLength={500} defaultValue={c?.note ?? ""} />
      </Field>
      <div className="col-span-2 sm:col-span-4"><Submit>{c ? "Save contribution" : "Add contribution"}</Submit></div>
    </ActionForm>
  );
}
