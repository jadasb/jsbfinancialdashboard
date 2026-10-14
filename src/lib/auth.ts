// Server-side guard. Middleware already blocks unauthenticated requests;
// this is defence in depth for every server action and route handler.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession } from "./session-token";

export async function hasSession(): Promise<boolean> {
  const jar = await cookies();
  return isValidSession(jar.get(SESSION_COOKIE)?.value);
}

/** For pages and server actions: redirects to /login when not signed in. */
export async function requireSession(): Promise<void> {
  if (!(await hasSession())) redirect("/login");
}
