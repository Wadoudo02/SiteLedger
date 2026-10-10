"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { primaryButtonClass, subtleButtonClass } from "./styles";

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
        <p role="status" className={`text-sm font-medium ${result.ok ? "text-emerald-700" : "text-red-700"}`}>
          {result.ok ? "✓ " : "⚠ "}
          {result.message}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "subtle" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={variant === "primary" ? primaryButtonClass : subtleButtonClass}>
      {pending ? "Saving…" : children}
    </button>
  );
}
