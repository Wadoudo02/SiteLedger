import {
  extractInvoice,
  ExtractionUnavailableError,
  MalformedOutputError,
  usesRealModel,
} from "@/lib/extraction";
import { draftFromExtraction, type InvoiceDraft } from "@/lib/invoice";
import { createInvoice } from "@/lib/invoices";
import { consumeExtractionQuota, DAILY_EXTRACTION_LIMIT } from "@/lib/quota";
import { MAX_UPLOAD_BYTES, sniffMimeType } from "@/lib/upload";

export const maxDuration = 60;

const EMPTY_DRAFT: InvoiceDraft = {
  supplier: null,
  invoiceNumber: null,
  invoiceDate: null,
  netPence: null,
  vatPence: null,
  grossPence: null,
  category: null,
  deliveryPostcode: null,
  propertyHint: null,
};

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

/** Upload one invoice (singular invoice mode: one file = one invoice). */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "We couldn't read that upload. Please try again.");
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fail(400, "The file is empty. Choose a PDF or photo of an invoice.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail(413, "That file is over 4 MB. Try a smaller scan or a lower-resolution photo.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = sniffMimeType(bytes);
  if (!mimeType) {
    return fail(415, "Unsupported file type. Upload a PDF, JPEG, PNG or WebP. (iPhone HEIC photos: export as JPEG first.)");
  }

  const rawProperty = form.get("propertyId");
  const chosenPropertyId = typeof rawProperty === "string" && /^\d+$/.test(rawProperty) ? Number(rawProperty) : null;

  if (usesRealModel() && !(await consumeExtractionQuota())) {
    return fail(429, `The daily limit of ${DAILY_EXTRACTION_LIMIT} invoice reads has been reached. Please try again tomorrow.`);
  }

  let draft = EMPTY_DRAFT;
  let readFailed = false;
  try {
    draft = draftFromExtraction(await extractInvoice({ bytes, mimeType, filename: file.name }));
  } catch (err) {
    if (err instanceof ExtractionUnavailableError) return fail(503, err.userMessage);
    if (!(err instanceof MalformedOutputError)) {
      console.error("Extraction failed:", err instanceof Error ? err.message : err);
      return fail(500, "Something went wrong reading the invoice. Please try again.");
    }
    readFailed = true; // keep the file; the reviewer types the details in
  }

  try {
    const created = await createInvoice({ draft, readFailed, chosenPropertyId, bytes, mimeType, filename: file.name });
    return Response.json(created, { status: 201 });
  } catch (err) {
    console.error("Saving invoice failed:", err instanceof Error ? err.message : err);
    return fail(500, "Something went wrong saving the invoice. Please try again.");
  }
}
