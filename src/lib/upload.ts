import type { SupportedMimeType } from "./extraction";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Detects the file type from its first bytes rather than trusting the browser's label.
 * Returns null for anything we can't send to the model (e.g. HEIC, Word, ZIP).
 */
export function sniffMimeType(bytes: Buffer): SupportedMimeType | null {
  if (bytes.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") {
    return "image/webp";
  }
  return null;
}

export const EXTENSIONS: Record<SupportedMimeType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** "Orbital Roofing & Building Ltd" -> "orbital-roofing-building-ltd" (safe Blob path segment). */
export function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "unknown"
  );
}

/** properties/{property}/{YYYY-MM}/{supplier}-{invoice-no}.{ext}, using the invoice date. */
export function filedPath(property: string, invoiceDate: string, supplier: string, invoiceNumber: string, ext: string) {
  return `properties/${slug(property)}/${invoiceDate.slice(0, 7)}/${slug(supplier)}-${slug(invoiceNumber)}.${ext}`;
}
