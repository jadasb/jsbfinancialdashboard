import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { contributions } from "@/db/schema";
import { deleteContribution } from "@/app/(app)/actions";
import { ContributionForm } from "@/components/contribution-form";
import { ConfirmSubmit } from "@/components/forms";

export const metadata = { title: "Edit contribution" };

export default async function EditContribution({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [c] = await (await getDb()).select().from(contributions).where(eq(contributions.id, id));
  if (!c) notFound();
  return (
    <div className="space-y-8">
      <Link href="/ledger" className="inline-block text-sm text-muted">← Ledger</Link>
      <h1 className="font-serif text-3xl tracking-tight">Edit contribution</h1>
      <ContributionForm book={c.isPaper ? "paper" : "real"} c={c} defaultAed={c.amountAed} />
      <form action={deleteContribution} className="pt-6 border-t border-line">
        <input type="hidden" name="id" value={c.id} />
        <ConfirmSubmit message="Delete this contribution? This cannot be undone.">Delete contribution</ConfirmSubmit>
      </form>
    </div>
  );
}
