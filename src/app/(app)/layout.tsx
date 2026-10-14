import { requireSession } from "@/lib/auth";
import { currentBook } from "@/lib/book";
import { setBook } from "./actions";
import { Nav } from "./nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  const book = await currentBook();
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-16">
      <header className="flex items-center justify-between gap-4 pt-2">
        <span className="font-serif text-2xl tracking-tight">Ledger</span>
        <div className="flex items-center gap-2">
          <form action={setBook} className="flex rounded-md border border-line p-0.5 text-xs" aria-label="Book">
            {(["paper", "real"] as const).map((b) => (
              <button
                key={b}
                name="book"
                value={b}
                aria-pressed={book === b}
                className={`px-3 py-1.5 rounded capitalize ${book === b ? "bg-ink text-bg" : "text-muted"}`}
              >
                {b}
              </button>
            ))}
          </form>
          <form action="/api/auth/logout" method="post">
            <button className="text-xs text-muted px-2 py-1.5 hover:text-ink">Sign out</button>
          </form>
        </div>
      </header>
      <div className="border-b border-line mt-3">
        <Nav />
      </div>
      {book === "paper" && (
        <p className="mt-4 text-xs text-warn">Paper book: hypothetical trades only. Real money starts January 2027.</p>
      )}
      <main className="mt-6">{children}</main>
      <footer className="mt-16 pt-6 border-t border-line text-xs text-faint leading-relaxed">
        Tracking and research only. Nothing here is a buy or sell instruction or licensed financial advice.
      </footer>
    </div>
  );
}
