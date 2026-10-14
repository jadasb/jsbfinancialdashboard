"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/(app)/actions";

export function Submit({ children, className = "btn", pending = "Saving…" }: { children: React.ReactNode; className?: string; pending?: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={busy} aria-busy={busy}>
      {busy ? pending : children}
    </button>
  );
}

/** A form bound to a server action that returns { error | ok }. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && <p role="alert" className="text-sm text-neg mt-3">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-pos mt-3">{state.ok}</p>}
    </form>
  );
}

/** Destructive button: asks before submitting. */
export function ConfirmSubmit({ message, children = "Delete" }: { message: string; children?: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="btn btn-danger"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
