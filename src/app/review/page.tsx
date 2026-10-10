import Link from "next/link";
import { Suspense } from "react";
import { cardClass } from "@/components/styles";
import { listNeedsReview } from "@/lib/invoices";
import { formatPence } from "@/lib/money";

export default function ReviewQueuePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Needs Review</h1>
        <p className="text-slate-600">Invoices that failed a check. Open one to correct it and file it, or reject it.</p>
      </div>
      <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
        <Queue />
      </Suspense>
    </div>
  );
}

async function Queue() {
  const invoices = await listNeedsReview();
  if (invoices.length === 0) return <p className={`${cardClass} text-slate-600`}>Nothing to review. All invoices are filed.</p>;
  return (
    <ul className="space-y-3">
      {invoices.map((inv) => (
        <li key={inv.id}>
          <Link href={`/review/${inv.id}`} className={`${cardClass} block hover:border-slate-400`}>
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-medium">
                {inv.supplier ?? "Unknown supplier"} · {inv.invoice_number ?? "no number"}
              </span>
              <span className="text-slate-600">
                {inv.gross_pence === null ? "" : formatPence(inv.gross_pence)} · {inv.original_filename}
              </span>
            </div>
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-800">
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
