// All invoice checks. Pure functions: the caller supplies today's date, the saved
// properties, billing postcodes and the duplicate lookup, so everything here is testable.
import { isValidIsoDate } from "./dates";
import type { InvoiceDraft } from "./invoice";
import { formatPence } from "./money";
import { formatPostcode } from "./postcode";

export const VAT_RATES = [20, 5, 0] as const;
export const VAT_TOLERANCE_PENCE = 2;

export type CheckContext = {
  today: string; // YYYY-MM-DD, Europe/London
  properties: { id: number; postcode: string }[]; // normalised postcodes
  billingPostcodes: string[]; // the user's own "Invoice to" postcodes, normalised
  chosenPropertyId: number | null; // picked by the user; overrides postcode matching
  // Description of an existing non-rejected invoice with the same invoice number AND
  // (same gross OR same supplier), found by the caller via findDuplicate(); null if none.
  duplicateOf: string | null;
};

export type CheckResult = {
  reasons: string[]; // empty = clean, file automatically
  propertyId: number | null;
};

const REQUIRED: [keyof InvoiceDraft, string][] = [
  ["supplier", "Supplier"],
  ["invoiceNumber", "Invoice number"],
  ["invoiceDate", "Invoice date"],
  ["netPence", "Net amount"],
  ["vatPence", "VAT amount"],
  ["grossPence", "Gross amount"],
  ["category", "Category"],
];

export function checkRequired(d: InvoiceDraft): string[] {
  return REQUIRED.filter(([key]) => d[key] === null).map(([, label]) => `${label} is missing or unreadable.`);
}

export function checkAmounts(d: InvoiceDraft): string[] {
  const { netPence: net, vatPence: vat, grossPence: gross } = d;
  if (net === null || vat === null || gross === null) return []; // reported by checkRequired

  if (net < 0 || vat < 0 || gross < 0) {
    return ["Negative amounts are not supported (credit notes need manual handling)."];
  }

  const reasons: string[] = [];
  if (net + vat !== gross) {
    reasons.push(
      `Net ${formatPence(net)} + VAT ${formatPence(vat)} = ${formatPence(net + vat)}, but gross is ${formatPence(gross)}.`,
    );
  }
  const rateMatches = VAT_RATES.some(
    (rate) => Math.abs(vat - Math.round((net * rate) / 100)) <= VAT_TOLERANCE_PENCE,
  );
  if (!rateMatches) {
    const actual = net > 0 ? ` (it is ${((vat / net) * 100).toFixed(1)}%)` : "";
    reasons.push(`VAT ${formatPence(vat)} is not 20%, 5% or 0% of net ${formatPence(net)}${actual}.`);
  }
  return reasons;
}

export function checkDate(d: InvoiceDraft, today: string): string[] {
  if (d.invoiceDate === null) return []; // reported by checkRequired
  if (!isValidIsoDate(d.invoiceDate)) return [`Invoice date "${d.invoiceDate}" is not a valid date.`];
  // ISO dates compare correctly as strings.
  if (d.invoiceDate > today) return [`Invoice date ${d.invoiceDate} is in the future.`];
  return [];
}

export function resolveProperty(
  d: InvoiceDraft,
  ctx: Pick<CheckContext, "properties" | "billingPostcodes" | "chosenPropertyId">,
): { propertyId: number | null; reason: string | null } {
  if (ctx.chosenPropertyId !== null) {
    const exists = ctx.properties.some((p) => p.id === ctx.chosenPropertyId);
    return exists
      ? { propertyId: ctx.chosenPropertyId, reason: null }
      : { propertyId: null, reason: "The chosen property no longer exists. Choose the property." };
  }

  const postcode = d.deliveryPostcode;
  if (postcode === null) {
    return { propertyId: null, reason: "No delivery address found on the invoice. Choose the property." };
  }
  const shown = formatPostcode(postcode);
  if (ctx.billingPostcodes.includes(postcode)) {
    return {
      propertyId: null,
      reason: `Delivery postcode ${shown} is one of your own billing addresses. Choose the property.`,
    };
  }
  const matches = ctx.properties.filter((p) => p.postcode === postcode);
  if (matches.length === 0) {
    return { propertyId: null, reason: `Delivery postcode ${shown} doesn't match any saved property.` };
  }
  if (matches.length > 1) {
    return { propertyId: null, reason: `Delivery postcode ${shown} matches several properties. Choose one.` };
  }
  return { propertyId: matches[0].id, reason: null };
}

export function runChecks(d: InvoiceDraft, ctx: CheckContext): CheckResult {
  const reasons = [...checkRequired(d), ...checkAmounts(d), ...checkDate(d, ctx.today)];
  if (ctx.duplicateOf) reasons.push(`Possible duplicate of ${ctx.duplicateOf}.`);
  const { propertyId, reason } = resolveProperty(d, ctx);
  if (reason) reasons.push(reason);
  return { reasons, propertyId };
}

/**
 * Normalised supplier for duplicate matching: case, punctuation, "&"/"and" and company
 * suffixes are ignored, so "Orbital Roofing & Building Supplies Ltd" and
 * "ORBITAL ROOFING AND BUILDING SUPPLIES" match. Returns null if nothing is left.
 */
export function supplierKey(supplier: string | null): string | null {
  const key = (supplier ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(and|ltd|limited|plc|llp)\b/g, " ")
    .replace(/[^a-z0-9]/g, "");
  return key || null;
}

/** Normalised invoice number: "03S-01015" and "03s01015" match. */
export function invoiceNumberKey(invoiceNumber: string | null): string | null {
  const key = (invoiceNumber ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return key || null;
}
