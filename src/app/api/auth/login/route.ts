import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { verifyPassword } from "@/lib/password";
import { loginBlocked, recordLogin } from "@/lib/rate-limit";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function back(req: NextRequest, error: string, next?: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", error);
  if (next) url.searchParams.set("next", next);
  return NextResponse.redirect(url, 303);
}

// Only same-site relative paths are allowed as a post-login destination.
function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/";
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const password = form?.get("password");
  const next = safeNext(form?.get("next") ?? null);

  const hash = process.env.APP_PASSWORD_HASH;
  if (!hash || !process.env.SESSION_SECRET) return back(req, "config");

  const db = await getDb();
  const ip = clientIp(req);
  if (await loginBlocked(db, ip)) return back(req, "locked");

  const ok = typeof password === "string" && password.length > 0 && password.length <= 1024 && (await verifyPassword(password, hash));
  await recordLogin(db, ip, ok);
  if (!ok) return back(req, "wrong", next !== "/" ? next : undefined);

  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(SESSION_COOKIE, await signSession(), sessionCookieOptions);
  return res;
}
