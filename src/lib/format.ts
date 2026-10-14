const usdFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const aedFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const aedWhole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
// Sub-cent floating-point residue must not render as "-$0.00".
const clean = (n: number) => (Math.abs(n) < 0.005 ? 0 : n);

export const DASH = "—";
export const usd = (n: number | null | undefined) => (n == null ? DASH : usdFmt.format(clean(n)));
export const aed = (n: number | null | undefined, whole = false) => (n == null ? DASH : `AED ${(whole ? aedWhole : aedFmt).format(clean(n))}`);
export const signedUsd = (n: number | null | undefined) => (n == null ? DASH : `${n > 0.004 ? "+" : n < -0.004 ? "−" : ""}${usdFmt.format(Math.abs(n))}`);
export const signedAed = (n: number | null | undefined) => (n == null ? DASH : `${n > 0.004 ? "+" : n < -0.004 ? "−" : ""}AED ${aedFmt.format(Math.abs(n))}`);
export const pct = (n: number | null | undefined, digits = 2) => (n == null ? DASH : `${(n * 100).toFixed(digits)}%`);
export const signedPct = (n: number | null | undefined, digits = 2) =>
  n == null ? DASH : `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n * 100).toFixed(digits)}%`;
export const pp = (n: number | null | undefined) => (n == null ? DASH : `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}pp`);
export const units = (n: number | null | undefined) => (n == null ? DASH : n.toFixed(4));
export const price = (n: number | null | undefined) => (n == null ? DASH : `$${n.toFixed(2)}`);
export const tone = (n: number | null | undefined) => (n == null || Math.abs(n) < 0.005 ? "" : n > 0 ? "text-pos" : "text-neg");

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return DASH;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function ago(when: Date | string | null | undefined): string {
  if (!when) return DASH;
  const ms = Date.now() - new Date(when).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}
