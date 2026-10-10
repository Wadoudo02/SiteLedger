"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/ActionForm";
import { CATEGORIES, type Category, type InvoiceDraft } from "@/lib/invoice";
import { confirmReviewedInvoice, getReviewInvoice, rejectInvoice } from "@/lib/invoices";
import { parsePence } from "@/lib/money";

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function confirmInvoice(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const invoice = await getReviewInvoice(String(formData.get("id")));
  if (!invoice) return { ok: false, message: "This invoice is no longer waiting for review." };

  const category = text(formData, "category");
  const draft: InvoiceDraft = {
    supplier: text(formData, "supplier"),
    invoiceNumber: text(formData, "invoiceNumber"),
    invoiceDate: text(formData, "invoiceDate"),
    netPence: parsePence(text(formData, "net")),
    vatPence: parsePence(text(formData, "vat")),
    grossPence: parsePence(text(formData, "gross")),
    category: CATEGORIES.includes(category as Category) ? (category as Category) : null,
    deliveryPostcode: invoice.site_postcode,
    propertyHint: invoice.property_hint,
  };
  const property = text(formData, "propertyId");
  const chosenPropertyId = property && /^\d+$/.test(property) ? Number(property) : null;

  let result;
  try {
    result = await confirmReviewedInvoice(invoice, draft, chosenPropertyId);
  } catch (err) {
    console.error("Confirming invoice failed:", err instanceof Error ? err.message : err);
    return { ok: false, message: "Something went wrong filing the invoice. Please try again." };
  }
  if (!result.filed) {
    refresh();
    return { ok: false, message: "Still failing checks. See the reasons above. Your edits have been saved." };
  }
  redirect("/review");
}

export async function rejectReviewedInvoice(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await rejectInvoice(String(formData.get("id")));
  redirect("/review");
}
