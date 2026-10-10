import type { ExtractedInvoice } from "../invoice";
import { mockExtractInvoice } from "./mock";

export type InvoiceFile = {
  bytes: Buffer;
  mimeType: SupportedMimeType;
  filename: string;
};

export const SUPPORTED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

/** The model's reply didn't match the expected structure. The upload goes to Needs Review with empty fields. */
export class MalformedOutputError extends Error {}

/** The model couldn't be reached (API error, rate limit, timeout). `userMessage` is safe to show. */
export class ExtractionUnavailableError extends Error {
  constructor(public userMessage: string, options?: ErrorOptions) {
    super(userMessage, options);
  }
}

/** True when uploads cost API credit (so they count towards the daily cap). */
export function usesRealModel(): boolean {
  return process.env.EXTRACTOR !== "mock";
}

/**
 * Reads one invoice from a PDF or photo. The only place the AI is involved:
 * it reads the document; every check and calculation happens elsewhere, in code.
 */
export async function extractInvoice(file: InvoiceFile): Promise<ExtractedInvoice> {
  if (!usesRealModel()) return mockExtractInvoice();
  throw new ExtractionUnavailableError("Invoice reading is not configured yet.");
}
