"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export type ActionResult = { ok: boolean; message: string } | null;

/** A form bound to a server action that shows the action's success or error message. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
}) {
  const [result, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {result && (
        <p role="status" className={`text-sm ${result.ok ? "text-emerald-700" : "text-red-700"}`}>
          {result.message}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "subtle" }) {
  const { pending } = useFormStatus();
  const style =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-700"
      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100";
  return (
    <button type="submit" disabled={pending} className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${style}`}>
      {pending ? "Saving…" : children}
    </button>
  );
}
