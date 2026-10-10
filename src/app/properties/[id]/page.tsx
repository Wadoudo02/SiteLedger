import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cardClass } from "@/components/styles";
import { formatPence } from "@/lib/money";
import { formatPostcode } from "@/lib/postcode";
import { getPropertyReport, monthLabel } from "@/lib/reports";

export default function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
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
        <div>
          <h1 className="text-2xl font-semibold">{property.name}</h1>
          <p className="font-mono text-sm text-slate-500">{formatPostcode(property.postcode)}</p>
        </div>
        <a
          href={`/api/properties/${property.id}/export`}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
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
          <div key={label} className={cardClass}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      {months.length === 0 ? (
        <p className={`${cardClass} text-slate-600`}>No invoices filed for this property yet.</p>
      ) : (
        <>
          <section className={cardClass}>
            <h2 className="mb-3 text-lg font-semibold">Spend by month</h2>
            <ul className="space-y-2">
              {months.map((m) => (
                <li key={m.month} className="grid grid-cols-[6rem_1fr_7rem] items-center gap-3 text-sm">
                  <span>{monthLabel(m.month)}</span>
                  <span className="h-3 rounded bg-slate-100">
                    <span className="block h-3 rounded bg-slate-700" style={{ width: `${(m.gross_pence / maxMonth) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{formatPence(m.gross_pence)}</span>
                </li>
              ))}
            </ul>
          </section>

          {months.map((m) => (
            <section key={m.month} className={cardClass}>
              <h2 className="mb-3 text-lg font-semibold">{monthLabel(m.month)}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500">
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
                  <tbody className="divide-y divide-slate-100">
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
                            <a href={i.blob_url} target="_blank" rel="noreferrer" className="text-slate-700 underline">
                              Open
                            </a>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot className="font-medium">
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
