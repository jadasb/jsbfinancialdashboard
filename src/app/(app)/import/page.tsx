import { ImportFlow } from "./import-flow";

export const metadata = { title: "Import" };

export default function ImportPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Import the paper tracker</h1>
        <p className="text-sm text-muted mt-2 leading-relaxed max-w-2xl">
          Reads the Ledger, Contributions and Weekly Log sheets of <span className="font-medium text-ink">paper-trading-tracker.xlsx</span>.
          Setup is compared against the app settings but not copied. Everything lands in the paper book. Re-importing updates the same
          rows, so you can fill fill-prices in the sheet and import again without duplicates.
        </p>
      </div>
      <ImportFlow />
    </div>
  );
}
