// Payday is the 1st. If the 1st is a weekend or a US market holiday the order
// fills at the next US open. The only NYSE holiday that can affect the 1st is
// New Year's Day: closed on Jan 1 when it is a weekday, on Monday Jan 2 when
// Jan 1 is a Sunday, and not observed on Friday Dec 31 when it is a Saturday.
const iso = (d: Date) => d.toISOString().slice(0, 10);

function isNyseOpen(d: Date): boolean {
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  const m = d.getUTCMonth(), day = d.getUTCDate();
  if (m === 0 && day === 1) return false;
  if (m === 0 && day === 2 && dow === 1) return false; // Jan 1 was a Sunday
  return true;
}

/** Expected fill day for a payday (YYYY-MM-DD). */
export function expectedFill(payday: string): string {
  const d = new Date(`${payday}T00:00:00Z`);
  while (!isNyseOpen(d)) d.setUTCDate(d.getUTCDate() + 1);
  return iso(d);
}

/** Next payday on or after today, using the UAE date (UTC+4, no DST). */
export function nextPayday(now = new Date()): string {
  const uae = new Date(now.getTime() + 4 * 3_600_000);
  const y = uae.getUTCFullYear(), m = uae.getUTCMonth();
  return iso(new Date(Date.UTC(y, uae.getUTCDate() === 1 ? m : m + 1, 1)));
}
