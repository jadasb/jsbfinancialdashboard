// Deploy check: confirms the session and database connection. Requires login (middleware).
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, queryRows } from "@/db";
import { hasSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasSession())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const db = await getDb();
    const [r] = await queryRows<{ n: number }>(db, sql`select count(*)::int as n from schema_migrations`);
    return NextResponse.json({
      ok: true,
      database: process.env.DATABASE_URL ? "postgres" : "pglite (local)",
      migrations: r?.n,
      marketData: process.env.MARKET_DATA_API_KEY ? "configured" : "missing key",
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
