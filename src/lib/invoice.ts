import { z } from "zod";
import { parsePence } from "./money";
import { normalisePostcode } from "./postcode";

export const CATEGORIES = ["materials", "labour", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * What the model returns. Every field is nullable: the model reports only what is
 * printed on the document. Amounts are decimal strings; all arithmetic happens in code.
 */
export const extractedInvoiceSchema = z.object({
  supplier: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  net: z.string().nullable(),
  vat: z.string().nullable(),
  gross: z.string().nullable(),
  category: z.enum(CATEGORIES).nullable(),
  deliveryPostcode: z.string().nullable(),
});
export type ExtractedInvoice = z.infer<typeof extractedInvoiceSchema>;

/** Invoice fields in app form: integer pence, normalised postcode. Also what the review form edits. */
export type InvoiceDraft = {
  supplier: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  netPence: number | null;
  vatPence: number | null;
  grossPence: number | null;
  category: Category | null;
  deliveryPostcode: string | null;
};

function clean(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function draftFromExtraction(e: ExtractedInvoice): InvoiceDraft {
  const postcode = clean(e.deliveryPostcode);
  return {
    supplier: clean(e.supplier),
    invoiceNumber: clean(e.invoiceNumber),
    invoiceDate: clean(e.invoiceDate),
    netPence: parsePence(e.net),
    vatPence: parsePence(e.vat),
    grossPence: parsePence(e.gross),
    category: e.category,
    deliveryPostcode: postcode ? normalisePostcode(postcode) : null,
  };
}
