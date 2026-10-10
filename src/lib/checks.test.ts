import { describe, expect, it } from "vitest";
import { checkAmounts, checkDate, checkRequired, invoiceNumberKey, resolveProperty, runChecks, supplierKey, type CheckContext } from "./checks";
import type { InvoiceDraft } from "./invoice";

const clean: InvoiceDraft = {
  supplier: "Orbital Roofing & Building Supplies Ltd",
  invoiceNumber: "03S01015",
  invoiceDate: "2026-09-29",
  netPence: 61200,
  vatPence: 12240,
  grossPence: 73440,
  category: "materials",
  deliveryPostcode: "MR14RS",
  propertyHint: null,
};

const ctx: CheckContext = {
  today: "2026-10-10",
  properties: [
    { id: 1, postcode: "MR14RS" },
    { id: 2, postcode: "JP42GS" },
  ],
  billingPostcodes: ["YD34TE", "SP90LE"],
  chosenPropertyId: null,
  duplicateOf: null,
};

const amounts = (netPence: number, vatPence: number, grossPence: number) => ({ ...clean, netPence, vatPence, grossPence });

describe("runChecks", () => {
  it("passes a clean invoice and matches the property by delivery postcode", () => {
    expect(runChecks(clean, ctx)).toEqual({ reasons: [], propertyId: 1 });
  });

  it("collects every failure, not just the first", () => {
    const bad = { ...clean, supplier: null, grossPence: 99999, invoiceDate: "2027-01-01", deliveryPostcode: null };
    const { reasons, propertyId } = runChecks(bad, { ...ctx, duplicateOf: "invoice 03S01015 (£734.40), filed under 1 Martian Street, Sep 2026" });
    expect(propertyId).toBeNull();
    expect(reasons).toHaveLength(5); // missing supplier, arithmetic, future date, duplicate, no property
    expect(reasons).toContain("Possible duplicate of invoice 03S01015 (£734.40), filed under 1 Martian Street, Sep 2026.");
  });
});

describe("checkRequired", () => {
  it("passes when all fields are present", () => {
    expect(checkRequired(clean)).toEqual([]);
  });

  it("lists each missing field", () => {
    const reasons = checkRequired({ ...clean, invoiceNumber: null, vatPence: null, category: null });
    expect(reasons).toEqual([
      "Invoice number is missing or unreadable.",
      "VAT amount is missing or unreadable.",
      "Category is missing or unreadable.",
    ]);
  });

  it("does not require a delivery postcode (property can be chosen instead)", () => {
    expect(checkRequired({ ...clean, deliveryPostcode: null })).toEqual([]);
  });
});

describe("checkAmounts", () => {
  it.each([
    ["Orbital PDF", 61200, 12240, 73440],
    ["Orbital photo (21.708 rounds to 21.71)", 10854, 2171, 13025],
    ["Orbital PDF 2 (18.416 rounds to 18.42)", 9208, 1842, 11050],
    ["PipeDream (2.998 rounds to 3.00)", 1499, 300, 1799],
    ["5% VAT", 10000, 500, 10500],
    ["0% VAT", 10000, 0, 10000],
  ])("passes real/valid figures: %s", (_, net, vat, gross) => {
    expect(checkAmounts(amounts(net, vat, gross))).toEqual([]);
  });

  it("requires net + VAT = gross to the penny", () => {
    const reasons = checkAmounts(amounts(61200, 12240, 73441));
    expect(reasons).toEqual(["Net £612.00 + VAT £122.40 = £734.40, but gross is £734.41."]);
  });

  it("allows VAT within ±2p of a valid rate (per-line rounding)", () => {
    expect(checkAmounts(amounts(10000, 2002, 12002))).toEqual([]);
    expect(checkAmounts(amounts(10000, 1998, 11998))).toEqual([]);
  });

  it("rejects VAT 3p away from a valid rate", () => {
    const reasons = checkAmounts(amounts(10000, 2003, 12003));
    expect(reasons).toEqual(["VAT £20.03 is not 20%, 5% or 0% of net £100.00 (it is 20.0%)."]);
  });

  it("rejects a VAT rate that is not 20%, 5% or 0%", () => {
    const reasons = checkAmounts(amounts(10000, 1750, 11750));
    expect(reasons).toEqual(["VAT £17.50 is not 20%, 5% or 0% of net £100.00 (it is 17.5%)."]);
  });

  it("reports both arithmetic and rate failures together", () => {
    expect(checkAmounts(amounts(10000, 1750, 12000))).toHaveLength(2);
  });

  it("rejects negative amounts (credit notes)", () => {
    expect(checkAmounts(amounts(-1000, -200, -1200))).toEqual([
      "Negative amounts are not supported (credit notes need manual handling).",
    ]);
  });

  it("skips when an amount is missing (reported by checkRequired instead)", () => {
    expect(checkAmounts({ ...clean, vatPence: null })).toEqual([]);
  });
});

describe("checkDate", () => {
  it("accepts today and past dates", () => {
    expect(checkDate({ ...clean, invoiceDate: "2026-10-10" }, "2026-10-10")).toEqual([]);
    expect(checkDate({ ...clean, invoiceDate: "2025-01-31" }, "2026-10-10")).toEqual([]);
  });

  it("rejects future dates", () => {
    expect(checkDate({ ...clean, invoiceDate: "2026-10-11" }, "2026-10-10")).toEqual([
      "Invoice date 2026-10-11 is in the future.",
    ]);
  });

  it.each(["2026-02-30", "29Sep26", "2026-9-29", "not a date"])("rejects invalid date %s", (value) => {
    expect(checkDate({ ...clean, invoiceDate: value }, "2026-10-10")).toEqual([
      `Invoice date "${value}" is not a valid date.`,
    ]);
  });
});

describe("resolveProperty", () => {
  it("matches a single property by delivery postcode", () => {
    expect(resolveProperty(clean, ctx)).toEqual({ propertyId: 1, reason: null });
  });

  it("uses the property chosen by the user, even with no delivery postcode", () => {
    expect(resolveProperty({ ...clean, deliveryPostcode: null }, { ...ctx, chosenPropertyId: 2 })).toEqual({
      propertyId: 2,
      reason: null,
    });
  });

  it("a chosen property overrides a different delivery postcode", () => {
    expect(resolveProperty(clean, { ...ctx, chosenPropertyId: 2 }).propertyId).toBe(2);
  });

  it("flags a chosen property that does not exist", () => {
    expect(resolveProperty(clean, { ...ctx, chosenPropertyId: 99 }).propertyId).toBeNull();
  });

  it("flags a missing delivery address", () => {
    expect(resolveProperty({ ...clean, deliveryPostcode: null }, ctx)).toEqual({
      propertyId: null,
      reason: "No delivery address found on the invoice. Choose the property.",
    });
  });

  it("never matches one of the user's billing addresses", () => {
    const sameAsBilling = { ...ctx, properties: [...ctx.properties, { id: 3, postcode: "SP90LE" }] };
    expect(resolveProperty({ ...clean, deliveryPostcode: "SP90LE" }, sameAsBilling)).toEqual({
      propertyId: null,
      reason: "Delivery postcode SP9 0LE is one of your own billing addresses. Choose the property.",
    });
  });

  it("flags a postcode that matches no property", () => {
    expect(resolveProperty({ ...clean, deliveryPostcode: "LS62EX" }, ctx).reason).toBe(
      "Delivery postcode LS6 2EX doesn't match any saved property.",
    );
  });

  it("flags a postcode shared by several properties (e.g. flats)", () => {
    const flats = { ...ctx, properties: [{ id: 1, postcode: "MR14RS" }, { id: 5, postcode: "MR14RS" }] };
    expect(resolveProperty(clean, flats)).toEqual({
      propertyId: null,
      reason: "Delivery postcode MR1 4RS matches several properties. Choose one.",
    });
  });
});

describe("duplicate keys", () => {
  it("supplier key ignores case, punctuation, '&' vs 'and' and company suffixes", () => {
    expect(supplierKey("Orbital Roofing & Building Supplies Ltd")).toBe(
      supplierKey("ORBITAL ROOFING AND BUILDING SUPPLIES LIMITED"),
    );
    expect(supplierKey("Orbital")).not.toBe(supplierKey("PipeDream"));
  });

  it("invoice number key ignores case and punctuation", () => {
    expect(invoiceNumberKey("03S-01015")).toBe(invoiceNumberKey("03s01015"));
    expect(invoiceNumberKey("03S01015")).not.toBe(invoiceNumberKey("03S01117"));
  });

  it("returns null when nothing usable is left", () => {
    expect(supplierKey(null)).toBeNull();
    expect(supplierKey("Ltd")).toBeNull();
    expect(invoiceNumberKey(" - ")).toBeNull();
  });
});
