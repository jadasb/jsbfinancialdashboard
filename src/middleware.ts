import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/session-token";

// Reachable without a session: the login screen, the login endpoint, and the
// assets iOS needs to add the app to the home screen before signing in.
const PUBLIC_EXACT = new Set([
  "/login",
  "/api/auth/login",
  "/robots.txt",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon",
  "/apple-icon",
]);
const PUBLIC_PREFIX = ["/pwa-icon/"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isPublic = PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIX.some((p) => pathname.startsWith(p));
  const authed = await isValidSession(req.cookies.get(SESSION_COOKIE)?.value);

  if (isPublic) {
    if (authed && pathname === "/login") return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }
  if (authed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const login = new URL("/login", req.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Run on everything except Next's static build output.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
