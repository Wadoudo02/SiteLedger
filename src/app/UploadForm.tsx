"use client";

import { useState } from "react";
import { cardClass, inputClass, labelClass } from "@/components/styles";

const MAX_BYTES = 4 * 1024 * 1024;

type UploadResult =
  | { kind: "filed"; propertyName: string }
  | { kind: "review"; reasons: string[] }
  | { kind: "error"; message: string };

export function UploadForm({ properties }: { properties: { id: number; name: string }[] }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = (form.elements.namedItem("file") as HTMLInputElement).files?.[0];
    // Checked here too: Vercel rejects bodies over 4.5 MB before our route can reply nicely.
    if (!file || file.size === 0) return setResult({ kind: "error", message: "Choose a PDF or photo of an invoice." });
    if (file.size > MAX_BYTES) {
      return setResult({ kind: "error", message: "That file is over 4 MB. Try a smaller scan or a lower-resolution photo." });
    }

    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/invoices", { method: "POST", body: new FormData(form) });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body) {
        setResult({ kind: "error", message: body?.error ?? "Upload failed. Please try again." });
      } else if (body.status === "filed") {
        setResult({ kind: "filed", propertyName: body.propertyName });
        form.reset();
      } else {
        setResult({ kind: "review", reasons: body.reasons });
        form.reset();
      }
    } catch {
      setResult({ kind: "error", message: "Couldn't reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${cardClass} space-y-4`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          <span>Invoice (PDF or photo, max 4 MB, one invoice per file)</span>
          <input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required className={inputClass} />
        </label>
        <label className={labelClass}>
          <span>Property</span>
          <select name="propertyId" defaultValue="auto" className={inputClass}>
            <option value="auto">Detect from delivery address</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {busy ? "Reading invoice…" : "Upload invoice"}
      </button>

      {result?.kind === "filed" && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          All checks passed. Filed under <strong>{result.propertyName}</strong>.
        </p>
      )}
      {result?.kind === "review" && (
        <div role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-medium">Sent to Needs Review:</p>
          <ul className="list-disc pl-5">
            {result.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      {result?.kind === "error" && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {result.message}
        </p>
      )}
    </form>
  );
}
