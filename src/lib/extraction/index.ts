import type { ExtractedInvoice } from "../invoice";
import { claudeExtractInvoice } from "./claude";
import { mockExtractInvoice } from "./mock";
import type { InvoiceFile } from "./types";

export * from "./types";

/** True when uploads cost API credit (so they count towards the daily cap). Set EXTRACTOR=mock to use fixed data. */
export function usesRealModel(): boolean {
  return process.env.EXTRACTOR !== "mock";
}

/**
 * Reads one invoice from a PDF or photo. The only place the AI is involved:
 * it reads the document; every check and calculation happens elsewhere, in code.
 */
export async function extractInvoice(file: InvoiceFile): Promise<ExtractedInvoice> {
  return usesRealModel() ? claudeExtractInvoice(file) : mockExtractInvoice();
}
