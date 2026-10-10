import type { ExtractedInvoice } from "../invoice";

/** Fixed data for development and tests without the API. Matches seeded property 12 Larch Avenue (BS6 5QA). */
export async function mockExtractInvoice(): Promise<ExtractedInvoice> {
  return {
    supplier: "Brunel Timber Merchants Ltd",
    invoiceNumber: "BTM-1042",
    invoiceDate: "2026-09-15",
    net: "450.00",
    vat: "90.00",
    gross: "540.00",
    category: "materials",
    deliveryPostcode: "BS6 5QA",
    propertyHint: null,
  };
}
