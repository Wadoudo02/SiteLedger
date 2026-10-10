export const SUPPORTED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export type InvoiceFile = {
  bytes: Buffer;
  mimeType: SupportedMimeType;
  filename: string;
};

/** The model's reply didn't match the expected structure. The upload goes to Needs Review with empty fields. */
export class MalformedOutputError extends Error {}

/** The model couldn't be reached (API error, rate limit, timeout). `userMessage` is safe to show. */
export class ExtractionUnavailableError extends Error {
  constructor(public userMessage: string, options?: ErrorOptions) {
    super(userMessage, options);
  }
}
