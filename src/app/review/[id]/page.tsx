import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { cardClass, inputClass, labelClass } from "@/components/styles";
import { CATEGORIES } from "@/lib/invoice";
import { getReviewInvoice } from "@/lib/invoices";
import { formatPostcode } from "@/lib/postcode";
import { listProperties } from "@/lib/properties";
import { confirmInvoice, rejectReviewedInvoice } from "../actions";

const pounds = (pence: number | null) => (pence === null ? "" : (pence / 100).toFixed(2));

export default function ReviewInvoicePage({ params }: PageProps<"/review/[id]">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <ReviewInvoice params={params} />
    </Suspense>
  );
}

async function ReviewInvoice({ params }: { params: PageProps<"/review/[id]">["params"] }) {
  const { id } = await params;
  const [invoice, properties] = await Promise.all([getReviewInvoice(id), listProperties()]);
  if (!invoice) notFound();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={`${cardClass} p-2`}>
        {invoice.mime_type === "application/pdf" ? (
          <iframe src={invoice.blob_url} title={invoice.original_filename} className="h-[75vh] w-full rounded" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={invoice.blob_url} alt={invoice.original_filename} className="w-full rounded" />
        )}
      </section>

      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Review invoice</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-medium">⚠ Why it needs review:</p>
          <ul className="list-disc pl-5">
            {invoice.review_reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>

        {/* key forces fresh default values after a failed confirm saves the edits */}
        <ActionForm key={JSON.stringify(invoice)} action={confirmInvoice} className={`${cardClass} grid gap-3 sm:grid-cols-2`}>
          <input type="hidden" name="id" value={invoice.id} />
          <label className={labelClass}>
            <span>Supplier</span>
            <input name="supplier" defaultValue={invoice.supplier ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span>Invoice number</span>
            <input name="invoiceNumber" defaultValue={invoice.invoice_number ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span>Invoice date</span>
            <input name="invoiceDate" type="date" defaultValue={invoice.invoice_date ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span>Category</span>
            <select name="category" defaultValue={invoice.category ?? ""} className={inputClass}>
              <option value="">Choose…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            <span>Net (£)</span>
            <input name="net" inputMode="decimal" defaultValue={pounds(invoice.net_pence)} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span>VAT (£)</span>
            <input name="vat" inputMode="decimal" defaultValue={pounds(invoice.vat_pence)} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span>Gross (£)</span>
            <input name="gross" inputMode="decimal" defaultValue={pounds(invoice.gross_pence)} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span>Property</span>
            <select name="propertyId" defaultValue={invoice.property_id ?? "auto"} className={inputClass}>
              <option value="auto">
                Match delivery postcode{invoice.site_postcode ? ` (${formatPostcode(invoice.site_postcode)})` : ""}
              </option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {invoice.property_hint && (
            <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-stone-700 sm:col-span-2">
              Invoice mentions: <strong>&ldquo;{invoice.property_hint}&rdquo;</strong>
            </p>
          )}
          <div className="sm:col-span-2">
            <SubmitButton>Confirm and file</SubmitButton>
          </div>
        </ActionForm>

        <ActionForm action={rejectReviewedInvoice}>
          <input type="hidden" name="id" value={invoice.id} />
          <SubmitButton variant="subtle">Reject (duplicate or wrong invoice)</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
