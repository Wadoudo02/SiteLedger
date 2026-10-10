import { describe, expect, it } from "vitest";
import { isValidIsoDate, todayInLondon } from "./dates";
import { draftFromExtraction } from "./invoice";
import { formatPence, parsePence } from "./money";
import { formatPostcode, isValidPostcode, normalisePostcode } from "./postcode";

describe("parsePence", () => {
  it.each([
    ["734.40", 73440],
    ["734.4", 73440],
    ["17.99", 1799],
    ["£1,234.50", 123450],
    ["100", 10000],
    ["0.07", 7],
    ["-5.00", -500],
    [21.71, 2171],
  ])("parses %s", (input, expected) => {
    expect(parsePence(input)).toBe(expected);
  });

  it.each(["", "abc", "12.345", "1.2.3", "£", "99999999999"])("rejects %s", (input) => {
    expect(parsePence(input)).toBeNull();
  });

  it("returns null for null", () => {
    expect(parsePence(null)).toBeNull();
  });
});

describe("formatPence", () => {
  it("formats as pounds", () => {
    expect(formatPence(123450)).toBe("£1,234.50");
    expect(formatPence(7)).toBe("£0.07");
  });
});

describe("postcodes", () => {
  it("normalises and formats", () => {
    expect(normalisePostcode(" jp4 2gs ")).toBe("JP42GS");
    expect(formatPostcode("JP42GS")).toBe("JP4 2GS");
    expect(formatPostcode("SW1A1AA")).toBe("SW1A 1AA");
  });

  it("validates UK postcode shape", () => {
    for (const ok of ["JP42GS", "SW1A1AA", "S101TJ", "BS65QA"]) expect(isValidPostcode(ok)).toBe(true);
    for (const bad of ["", "12345", "M21", "OLYMPUS"]) expect(isValidPostcode(bad)).toBe(false);
  });
});

describe("dates", () => {
  it("uses the UK date, not UTC (23:30 UTC in BST is already tomorrow)", () => {
    expect(todayInLondon(new Date("2026-10-10T23:30:00Z"))).toBe("2026-10-11");
    expect(todayInLondon(new Date("2026-12-10T23:30:00Z"))).toBe("2026-12-10"); // GMT
  });

  it("validates ISO dates", () => {
    expect(isValidIsoDate("2026-09-29")).toBe(true);
    expect(isValidIsoDate("2028-02-29")).toBe(true); // leap year
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(isValidIsoDate("21/09/2026")).toBe(false);
  });
});

describe("draftFromExtraction", () => {
  it("converts model output to pence, trims and normalises", () => {
    expect(
      draftFromExtraction({
        supplier: "  PipeDream ",
        invoiceNumber: "P31940227615",
        invoiceDate: "2026-09-21",
        net: "14.99",
        vat: "3.00",
        gross: "£17.99",
        category: "materials",
        deliveryPostcode: null,
        propertyHint: " Your Reference: 1 Martian ",
      }),
    ).toEqual({
      supplier: "PipeDream",
      invoiceNumber: "P31940227615",
      invoiceDate: "2026-09-21",
      netPence: 1499,
      vatPence: 300,
      grossPence: 1799,
      category: "materials",
      deliveryPostcode: null,
      propertyHint: "Your Reference: 1 Martian",
    });
  });

  it("turns blank and unreadable values into null", () => {
    const draft = draftFromExtraction({
      supplier: "   ",
      invoiceNumber: null,
      invoiceDate: null,
      net: "twelve",
      vat: null,
      gross: null,
      category: null,
      deliveryPostcode: " mr1 4rs",
      propertyHint: null,
    });
    expect(draft.supplier).toBeNull();
    expect(draft.netPence).toBeNull();
    expect(draft.deliveryPostcode).toBe("MR14RS");
  });
});
