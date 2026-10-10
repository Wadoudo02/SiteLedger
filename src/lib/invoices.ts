import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { invoiceNumberKey, runChecks, supplierKey, type CheckContext } from "./checks";
import { getCompany } from "./company";
import { isValidIsoDate, todayInLondon } from "./dates";
import { db } from "./db";
import type { SupportedMimeType } from "./extraction";
import type { InvoiceDraft } from "./invoice";
import { formatPence } from "./money";
import { EXTENSIONS, filedPath } from "./upload";

export const READ_FAILED_REASON = "We couldn't read this invoice automatically. Please enter the details from the document.";

/** Describes an existing invoice with the same number AND (same gross OR same supplier), or null. */
export async function findDuplicate(draft: InvoiceDraft, excludeId: string | null): Promise<string | null> {
  const numberKey = invoiceNumberKey(draft.invoiceNumber);
  if (!numberKey) return null;
  const sql = await db();
  const [row] = await sql`
    select i.invoice_number, i.gross_pence, i.status, to_char(i.invoice_date, 'Mon YYYY') as month, p.name as property
    from invoices i left join properties p on p.id = i.property_id
    where i.invoice_number_key = ${numberKey}
      and i.status <> 'rejected'
      and (${excludeId}::uuid is null or i.id <> ${excludeId}::uuid)
      and (i.gross_pence = ${draft.grossPence} or i.supplier_key = ${supplierKey(draft.supplier)})
    order by i.created_at
    limit 1`;
  if (!row) return null;
  const amount = row.gross_pence === null ? "" : ` (${formatPence(row.gross_pence)})`;
  const where = row.status === "filed" ? `filed under ${row.property}, ${row.month}` : "waiting in Needs Review";
  return `invoice ${row.invoice_number}${amount}, ${where}`;
}

/** Gathers everything the checks need from the database. */
export async function buildCheckContext(
  draft: InvoiceDraft,
  chosenPropertyId: number | null,
  excludeId: string | null,
): Promise<CheckContext & { propertyNames: Map<number, string> }> {
  const sql = await db();
  const [properties, company, duplicateOf] = await Promise.all([
    sql`select id, name, postcode from properties`,
    getCompany(),
    findDuplicate(draft, excludeId),
  ]);
  return {
    today: todayInLondon(),
    properties: properties.map((p) => ({ id: p.id, postcode: p.postcode })),
    billingPostcodes: company?.postcode ? [company.postcode] : [],
    chosenPropertyId,
    duplicateOf,
    propertyNames: new Map(properties.map((p) => [p.id, p.name])),
  };
}

/** Invalid dates (e.g. "29Sep26") can't go in a date column; the review reason quotes the raw value. */
function storableDate(value: string | null): string | null {
  return value && isValidIsoDate(value) ? value : null;
}

export type CreatedInvoice = {
  id: string;
  status: "filed" | "needs_review";
  reasons: string[];
  propertyName: string | null;
};

/** Runs the checks on a freshly extracted invoice, stores the file in Blob and saves the row. */
export async function createInvoice(input: {
  draft: InvoiceDraft;
  readFailed: boolean;
  chosenPropertyId: number | null;
  bytes: Buffer;
  mimeType: SupportedMimeType;
  filename: string;
}): Promise<CreatedInvoice> {
  const { draft } = input;
  const ctx = await buildCheckContext(draft, input.chosenPropertyId, null);
  const checked = runChecks(draft, ctx);
  const reasons = input.readFailed ? [READ_FAILED_REASON] : checked.reasons;
  const propertyId = checked.propertyId;
  const status = reasons.length === 0 ? "filed" : "needs_review";
  const propertyName = propertyId === null ? null : (ctx.propertyNames.get(propertyId) ?? null);

  const id = randomUUID();
  const ext = EXTENSIONS[input.mimeType];
  const pathname =
    status === "filed"
      ? filedPath(propertyName!, draft.invoiceDate!, draft.supplier!, draft.invoiceNumber!, ext)
      : `review/${id}.${ext}`;
  const blob = await put(pathname, input.bytes, { access: "public", contentType: input.mimeType, addRandomSuffix: false });

  try {
    const sql = await db();
    await sql`
      insert into invoices (
        id, status, property_id, supplier, invoice_number, invoice_date, net_pence, vat_pence, gross_pence,
        category, site_postcode, property_hint, supplier_key, invoice_number_key, review_reasons,
        blob_url, blob_pathname, original_filename, mime_type, filed_at
      ) values (
        ${id}, ${status}, ${propertyId}, ${draft.supplier}, ${draft.invoiceNumber}, ${storableDate(draft.invoiceDate)},
        ${draft.netPence}, ${draft.vatPence}, ${draft.grossPence}, ${draft.category}, ${draft.deliveryPostcode},
        ${draft.propertyHint}, ${supplierKey(draft.supplier)}, ${invoiceNumberKey(draft.invoiceNumber)},
        ${JSON.stringify(reasons)}, ${blob.url}, ${blob.pathname}, ${input.filename}, ${input.mimeType},
        ${status === "filed" ? new Date().toISOString() : null}
      )`;
  } catch (err) {
    await del(blob.url).catch(() => {}); // don't leave an orphaned file behind
    throw err;
  }

  return { id, status, reasons, propertyName };
}
