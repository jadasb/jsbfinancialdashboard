import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { trades } from "@/db/schema";
import { deleteTrade } from "@/app/(app)/actions";
import { ConfirmSubmit } from "@/components/forms";
import { TradeForm } from "@/components/trade-form";
import { listInstruments } from "@/lib/data";

export const metadata = { title: "Edit trade" };

export default async function EditTrade({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const db = await getDb();
  const [t] = await db.select().from(trades).where(eq(trades.id, id));
  if (!t) notFound();
  return (
    <div className="space-y-8">
      <Link href="/ledger" className="inline-block text-sm text-muted">← Ledger</Link>
      <h1 className="font-serif text-3xl tracking-tight">Edit {t.side} · {t.ticker}</h1>
      {t.importRef && <p className="text-sm text-warn">Imported from the tracker. Re-importing the spreadsheet will overwrite edits to this row.</p>}
      <TradeForm instruments={await listInstruments(db)} book={t.isPaper ? "paper" : "real"} trade={t} />
      <form action={deleteTrade} className="pt-6 border-t border-line">
        <input type="hidden" name="id" value={t.id} />
        <ConfirmSubmit message={`Delete this ${t.ticker} trade? This cannot be undone.`}>Delete trade</ConfirmSubmit>
      </form>
    </div>
  );
}
