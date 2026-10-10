"use client";

import { useTransition } from "react";
import { deleteInvoiceAction } from "./actions";

/** Deletes one invoice and its file after a confirmation (e.g. refunded or cancelled). */
export function DeleteInvoiceButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Delete ${label}`}
      onClick={() => {
        if (!window.confirm(`Delete ${label}? This removes the invoice and its file.`)) return;
        startTransition(async () => {
          const { ok } = await deleteInvoiceAction(id);
          if (!ok) window.alert("That invoice was already deleted.");
        });
      }}
      className="rounded-md px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
