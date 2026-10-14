import { getDb } from "@/db";
import { addInstrument, savePlanSettings, saveTargets } from "../actions";
import { ActionForm, Submit } from "@/components/forms";
import { Field } from "@/components/field";
import { getSettings, listInstruments, listSleeves } from "@/lib/data";
import { pct } from "@/lib/format";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const db = await getDb();
  const [s, sleeves, insts] = await Promise.all([getSettings(db), listSleeves(db), listInstruments(db)]);
  const portfolioSleeves = sleeves.filter((x) => x.countsInPortfolio);
  return (
    <div className="space-y-14 max-w-4xl">
      <section>
        <h1 className="font-serif text-3xl tracking-tight">Plan settings</h1>
        <p className="text-sm text-muted mt-1">Changes apply to new trades and the planner. Recorded trades keep their own fee and FX.</p>
        <ActionForm action={savePlanSettings} className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
          <Field label="AED per USD"><input name="pegAedPerUsd" inputMode="decimal" className="field num" defaultValue={s.pegAedPerUsd} /></Field>
          <Field label="Monthly contribution (AED)"><input name="monthlyContributionAed" inputMode="decimal" className="field num" defaultValue={s.monthlyContributionAed} /></Field>
          <Field label="Drift band (pp)"><input name="driftThresholdPp" inputMode="decimal" className="field num" defaultValue={s.driftThresholdPp} /></Field>
          <Field label="Fee minimum (USD)"><input name="feeMinUsd" inputMode="decimal" className="field num" defaultValue={s.feeMinUsd} /></Field>
          <Field label="Fee rate (%)"><input name="feeRatePct" inputMode="decimal" className="field num" defaultValue={+(s.feeRate * 100).toFixed(4)} /></Field>
          <Field label="Price cache (minutes)" hint="Free tier: keep ≥ 15"><input name="priceTtlMinutes" inputMode="numeric" className="field num" defaultValue={s.priceTtlMinutes} /></Field>
          <div className="col-span-2 sm:col-span-3"><Submit>Save settings</Submit></div>
        </ActionForm>
      </section>

      <section>
        <h2 className="font-serif text-2xl tracking-tight">Target weights</h2>
        <p className="text-sm text-muted mt-1">Must add up to 100%. Wildcard stays at 0% until you name a pick.</p>
        <ActionForm action={saveTargets} className="mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {portfolioSleeves.map((x) => (
              <Field key={x.id} label={x.name} hint={x.purpose ?? undefined}>
                <div className="flex items-center gap-2">
                  <input name={`target_${x.id}`} inputMode="decimal" className="field num" defaultValue={+(x.targetPct * 100).toFixed(3)} />
                  <span className="text-muted">%</span>
                </div>
              </Field>
            ))}
          </div>
          <div className="mt-4"><Submit>Save targets</Submit></div>
        </ActionForm>
      </section>

      <section>
        <h2 className="font-serif text-2xl tracking-tight">Backup</h2>
        <p className="text-sm text-muted mt-1 max-w-2xl leading-relaxed">
          Your data already lives in the cloud database, so phone and laptop always see the same thing. These downloads are
          an extra copy you control. Worth doing once a month.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <a className="btn btn-ghost" href="/api/export?format=json" download>Download full backup (JSON)</a>
          <a className="btn btn-ghost" href="/api/export?format=csv" download>Download trades (CSV)</a>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl tracking-tight">Instruments</h2>
        <div className="overflow-x-auto mt-4">
          <table className="data">
            <thead><tr><th>Ticker</th><th className="l">Name</th><th className="l">Sleeve</th><th>Expense ratio</th><th className="l">Notes</th></tr></thead>
            <tbody>
              {insts.map((i) => (
                <tr key={i.ticker}>
                  <td className="font-medium">{i.ticker}</td>
                  <td className="l">{i.name}</td>
                  <td className="l text-muted">{sleeves.find((x) => x.id === i.sleeveId)?.name}</td>
                  <td>{i.expenseRatio == null ? <span className="text-faint">verify</span> : pct(i.expenseRatio)}</td>
                  <td className="l text-muted whitespace-normal min-w-48">{i.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ActionForm action={addInstrument} className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end mt-6">
          <Field label="Ticker"><input name="ticker" className="field uppercase" required maxLength={10} /></Field>
          <Field label="Name"><input name="name" className="field" required maxLength={120} /></Field>
          <Field label="Sleeve">
            <select name="sleeveId" className="field">{sleeves.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          </Field>
          <div><Submit>Add instrument</Submit></div>
        </ActionForm>
      </section>
    </div>
  );
}
