import { and, eq, gte, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { loginAttempts } from "@/db/schema";

// Stored in Postgres, not memory: serverless instances do not share memory.
export const WINDOW_MIN = 15;
export const MAX_FAILS_PER_IP = 5;
export const MAX_FAILS_GLOBAL = 30;

export async function loginBlocked(db: DB, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MIN * 60_000);
  const [perIp] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.ip, ip), eq(loginAttempts.success, false), gte(loginAttempts.attemptedAt, since)));
  const [global] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.success, false), gte(loginAttempts.attemptedAt, since)));
  return (perIp?.n ?? 0) >= MAX_FAILS_PER_IP || (global?.n ?? 0) >= MAX_FAILS_GLOBAL;
}

export async function recordLogin(db: DB, ip: string, success: boolean): Promise<void> {
  await db.insert(loginAttempts).values({ ip, success });
  // Housekeeping: keep the table small.
  await db.delete(loginAttempts).where(sql`${loginAttempts.attemptedAt} < now() - interval '7 days'`);
}
