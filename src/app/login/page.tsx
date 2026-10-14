import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };

const MESSAGES: Record<string, string> = {
  wrong: "That password is not correct.",
  locked: "Too many attempts. Try again in 15 minutes.",
  config: "The server is missing APP_PASSWORD_HASH or SESSION_SECRET.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const message = error ? (MESSAGES[error] ?? "Sign-in failed.") : null;
  return (
    <main className="min-h-dvh grid place-items-center px-4 py-16">
      <div className="w-full max-w-sm">
        <p className="eyebrow">Private</p>
        <h1 className="font-serif text-5xl leading-none mt-3 tracking-tight">Ledger</h1>
        <p className="text-muted mt-3 text-sm leading-relaxed">Portfolio tracking and research. Not a buy or sell instruction.</p>
        <form action="/api/auth/login" method="post" className="mt-10 space-y-4">
          <input type="hidden" name="next" value={next ?? "/"} />
          {/* Hidden username helps password managers associate the entry. */}
          <input type="text" name="username" autoComplete="username" value="owner" readOnly hidden />
          <label className="block">
            <span className="eyebrow">Password</span>
            <input className="field mt-2" type="password" name="password" autoComplete="current-password" required autoFocus maxLength={1024} />
          </label>
          {message && (
            <p role="alert" className="text-sm text-neg">
              {message}
            </p>
          )}
          <button className="btn w-full" type="submit">Sign in</button>
        </form>
      </div>
    </main>
  );
}
