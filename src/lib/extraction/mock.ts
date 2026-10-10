import type { ExtractedInvoice } from "../invoice";

/** Fixed data for development and tests without the API. Matches seeded property 1 Martian Street (MR1 4RS). */
export async function mockExtractInvoice(): Promise<ExtractedInvoice> {
  return {
    supplier: "Brunel Timber Merchants Ltd",
    invoiceNumber: "BTM-1042",
    invoiceDate: "2026-09-15",
    net: "450.00",
    vat: "90.00",
    gross: "540.00",
    category: "materials",
    deliveryPostcode: "MR1 4RS",
    propertyHint: null,
  };
}
