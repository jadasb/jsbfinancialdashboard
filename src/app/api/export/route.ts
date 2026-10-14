// Backup download. ?format=json (everything) or ?format=csv (trades only, opens in Excel/Numbers).
import { NextResponse, type NextRequest } from "next/server";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { contributions, instruments, prices, settings, sleeves, trades } from "@/db/schema";
import { hasSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const csvCell = (v: unknown) => {
  if (v == null) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  // Quote when needed; neutralise spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(req: NextRequest) {
  if (!(await hasSession())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const db = await getDb();
  const stamp = new Date().toISOString().slice(0, 10);
  const tradeRows = await db.select().from(trades).orderBy(asc(trades.tradeDate), asc(trades.id));

  if (req.nextUrl.searchParams.get("format") === "csv") {
    const cols = ["id", "tradeDate", "fillDate", "ticker", "side", "units", "priceUsd", "grossUsd", "feeUsd", "fxRateAedUsd", "amountAed", "sleeveId", "isPaper", "note"] as const;
    const lines = [cols.join(","), ...tradeRows.map((t) => cols.map((c) => csvCell(t[c])).join(","))];
    return new NextResponse(lines.join("\n") + "\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ledger-trades-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const [s, sl, inst, c, p] = await Promise.all([
    db.select().from(settings), db.select().from(sleeves), db.select().from(instruments),
    db.select().from(contributions).orderBy(asc(contributions.date)), db.select().from(prices).orderBy(asc(prices.date)),
  ]);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, settings: s, sleeves: sl, instruments: inst, trades: tradeRows, contributions: c, prices: p }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledger-backup-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
