import Link from "next/link";
import { Suspense } from "react";
import { cardClass } from "@/components/styles";
import { listNeedsReview } from "@/lib/invoices";
import { formatPence } from "@/lib/money";

export default function ReviewQueuePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Needs Review</h1>
        <p className="text-stone-600">Invoices that failed a check. Open one to correct it and file it, or reject it.</p>
      </div>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <Queue />
      </Suspense>
    </div>
  );
}

async function Queue() {
  const invoices = await listNeedsReview();
  if (invoices.length === 0) {
    return <p className={`${cardClass} text-stone-600`}>✓ Nothing to review. All invoices are filed.</p>;
  }
  return (
    <ul className="space-y-3">
      {invoices.map((inv) => (
        <li key={inv.id}>
          <Link
            href={`/review/${inv.id}`}
            className={`${cardClass} block border-l-4 border-l-amber-500 transition hover:-translate-y-0.5 hover:shadow-md`}
          >
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-medium">
                {inv.supplier ?? "Unknown supplier"} · {inv.invoice_number ?? "no number"}
              </span>
              <span className="text-stone-600">
                {inv.gross_pence === null ? "" : formatPence(inv.gross_pence)} · {inv.original_filename}
              </span>
            </div>
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
              {inv.review_reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Link>
        </li>
      ))}
    </ul>
  );
}
