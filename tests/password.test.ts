import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isValidSession, signSession } from "@/lib/session-token";

describe("password + session", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const h = await hashPassword("correct horse battery staple");
    expect(h).not.toContain("$");
    expect(await verifyPassword("correct horse battery staple", h)).toBe(true);
    expect(await verifyPassword("correct horse battery stapl", h)).toBe(false);
  });
  it("accepts its own session token, rejects tampering and other secrets", async () => {
    process.env.SESSION_SECRET = "a".repeat(48);
    const t = await signSession();
    expect(await isValidSession(t)).toBe(true);
    expect(await isValidSession(t.slice(0, -2) + "xx")).toBe(false);
    expect(await isValidSession(undefined)).toBe(false);
    process.env.SESSION_SECRET = "b".repeat(48);
    expect(await isValidSession(t)).toBe(false);
  });
});
