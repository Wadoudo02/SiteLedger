"use server";

import { refresh } from "next/cache";
import { deleteInvoice } from "@/lib/invoices";

export async function deleteInvoiceAction(id: string): Promise<{ ok: boolean }> {
  const ok = await deleteInvoice(id);
  refresh();
  return { ok };
}
