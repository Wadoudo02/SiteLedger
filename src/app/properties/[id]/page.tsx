import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { cardClass, primaryButtonClass } from "@/components/styles";
import { formatPence } from "@/lib/money";
import { formatPostcode } from "@/lib/postcode";
import { getPropertyReport, monthLabel } from "@/lib/reports";

export default function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <Property params={params} />
    </Suspense>
  );
}

async function Property({ params }: { params: PageProps<"/properties/[id]">["params"] }) {
  const { id } = await params;
  const report = /^\d+$/.test(id) ? await getPropertyReport(Number(id)) : null;
  if (!report) notFound();
  const { property, totals, months, invoices } = report;
  const maxMonth = Math.max(1, ...months.map((m) => m.gross_pence));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <Link href="/" className="text-sm font-medium text-orange-700 hover:underline">
            ← All properties
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">{property.name}</h1>
          <p className="inline-block rounded-md bg-stone-100 px-2 py-0.5 font-mono text-sm text-stone-600">
            {formatPostcode(property.postcode)}
          </p>
        </div>
        <a href={`/api/properties/${property.id}/export`} className={primaryButtonClass}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
            <path d="M10 3a1 1 0 0 1 1 1v7.6l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L9 11.6V4a1 1 0 0 1 1-1ZM4 15a1 1 0 0 1 1 1h10a1 1 0 1 1 0 2H5a2 2 0 0 1-2-2 1 1 0 0 1 1-1Z" />
          </svg>
          Download Excel
        </a>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        {[
          ["Total spend", formatPence(totals.total_pence)],
          ["Materials spend", formatPence(totals.materials_pence)],
          ["VAT paid", formatPence(totals.vat_pence)],
          ["Invoices filed", String(totals.count)],
        ].map(([label, value]) => (
          <div key={label} className={`${cardClass} border-t-4 border-t-orange-500`}>
            <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-stone-900 tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      {months.length === 0 ? (
        <p className={`${cardClass} text-stone-600`}>No invoices filed for this property yet.</p>
      ) : (
        <>
          <section className={cardClass}>
            <h2 className="mb-4 text-lg font-semibold">Spend by month (inc. VAT)</h2>
            <ul className="space-y-3">
              {months.map((m) => (
                <li
                  key={m.month}
                  title={`${monthLabel(m.month)}: ${formatPence(m.gross_pence)} across ${m.count} invoice${m.count === 1 ? "" : "s"}`}
                  className="group grid grid-cols-[5.5rem_1fr_6.5rem] items-center gap-3 text-sm"
                >
                  <span className="text-stone-600">{monthLabel(m.month)}</span>
                  <span className="h-4 rounded-r bg-stone-100">
                    <span
                      className="block h-4 rounded-r bg-orange-600 transition group-hover:bg-orange-700"
                      style={{ width: `${Math.max(1, (m.gross_pence / maxMonth) * 100)}%` }}
                    />
                  </span>
                  <span className="text-right font-medium text-stone-900 tabular-nums">{formatPence(m.gross_pence)}</span>
                </li>
              ))}
            </ul>
          </section>

          {months.map((m) => (
            <section key={m.month} className={cardClass}>
              <h2 className="mb-3 text-lg font-semibold">{monthLabel(m.month)}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-stone-200 text-left text-xs tracking-wide text-stone-500 uppercase">
                    <tr>
                      <th className="py-1 pr-3 font-medium">Date</th>
                      <th className="py-1 pr-3 font-medium">Supplier</th>
                      <th className="py-1 pr-3 font-medium">Invoice no.</th>
                      <th className="py-1 pr-3 font-medium">Category</th>
                      <th className="py-1 pr-3 text-right font-medium">Net</th>
                      <th className="py-1 pr-3 text-right font-medium">VAT</th>
                      <th className="py-1 pr-3 text-right font-medium">Gross</th>
                      <th className="py-1 font-medium">File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {invoices
                      .filter((i) => i.month === m.month)
                      .map((i) => (
                        <tr key={i.id}>
                          <td className="py-1.5 pr-3 tabular-nums">{i.invoice_date}</td>
                          <td className="py-1.5 pr-3">{i.supplier}</td>
                          <td className="py-1.5 pr-3">{i.invoice_number}</td>
                          <td className="py-1.5 pr-3">{i.category}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{formatPence(i.net_pence)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{formatPence(i.vat_pence)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{formatPence(i.gross_pence)}</td>
                          <td className="py-1.5">
                            <a href={i.blob_url} target="_blank" rel="noreferrer" className="font-medium text-orange-700 hover:underline">
                              Open
                            </a>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot className="border-t border-stone-200 font-semibold">
                    <tr>
                      <td colSpan={4} className="pt-2">
                        Total ({m.count})
                      </td>
                      <td className="pt-2 pr-3 text-right tabular-nums">{formatPence(m.net_pence)}</td>
                      <td className="pt-2 pr-3 text-right tabular-nums">{formatPence(m.vat_pence)}</td>
                      <td className="pt-2 pr-3 text-right tabular-nums">{formatPence(m.gross_pence)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
