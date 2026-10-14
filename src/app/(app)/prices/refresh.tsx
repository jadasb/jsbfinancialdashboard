"use client";
import { refreshNow } from "../actions";
import { ActionForm, Submit } from "@/components/forms";

export function RefreshButton({ disabled }: { disabled: boolean }) {
  return (
    <ActionForm action={refreshNow}>
      <Submit className="btn btn-ghost" pending="Fetching…">{disabled ? "Refresh (no API key)" : "Refresh now"}</Submit>
    </ActionForm>
  );
}
