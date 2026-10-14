import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createDb, queryRows } from "@/db";

describe("database migrations", () => {
  it("applies schema + seed once and is idempotent", async () => {
    const h = await createDb({ memory: true });
    expect(h.migrated).toEqual(["0001_init", "0002_seed"]);
    const sleeves = await queryRows<{ target_pct: string }>(h.db, sql`select id, target_pct from sleeves where counts_in_portfolio order by sort`);
    const total = sleeves.reduce((s, r) => s + Number(r.target_pct), 0);
    expect(total).toBeCloseTo(1, 10);
    const instruments = (await queryRows<{ ticker: string }>(h.db, sql`select ticker from instruments order by ticker`)).map((r) => r.ticker);
    expect(instruments).toEqual(["CCJ", "CEG", "ITA", "NLR", "SGOV", "VOO"]);
    await h.close();
  });
});
