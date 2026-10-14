import { describe, expect, it } from "vitest";
import { expectedFill, nextPayday } from "@/lib/calendar";

describe("payday fill dates (brief section 4)", () => {
  it("matches the dates in the brief", () => {
    expect(expectedFill("2026-11-01")).toBe("2026-11-02"); // Sunday → Monday
    expect(expectedFill("2026-12-01")).toBe("2026-12-01"); // Tuesday
    expect(expectedFill("2027-01-01")).toBe("2027-01-04"); // holiday Friday → Monday
  });
  it("handles New Year's Day on a Sunday (observed Monday)", () => {
    expect(expectedFill("2023-01-01")).toBe("2023-01-03");
  });
  it("finds the next 1st in UAE time", () => {
    expect(nextPayday(new Date("2026-10-14T12:00:00Z"))).toBe("2026-11-01");
    expect(nextPayday(new Date("2026-12-31T21:00:00Z"))).toBe("2027-01-01"); // already Jan 1 in Dubai
    expect(nextPayday(new Date("2026-12-15T00:00:00Z"))).toBe("2027-01-01");
  });
});
