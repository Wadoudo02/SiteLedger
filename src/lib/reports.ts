// Dashboard and export figures. Every number comes straight from SQL over filed invoices.
import { db } from "./db";

export type FiledInvoice = {
  id: string;
  month: string; // YYYY-MM
  invoice_date: string;
  supplier: string;
  invoice_number: string;
  category: "materials" | "labour" | "other";
  net_pence: number;
  vat_pence: number;
  gross_pence: number;
  blob_url: string;
};

export type MonthTotal = { month: string; count: number; net_pence: number; vat_pence: number; gross_pence: number };

export type PropertyReport = {
  property: { id: number; name: string; postcode: string };
  totals: { count: number; total_pence: number; materials_pence: number; vat_pence: number };
  months: MonthTotal[];
  invoices: FiledInvoice[];
};

export async function getPropertyReport(id: number): Promise<PropertyReport | null> {
  const sql = await db();
  const [property] = await sql`select id, name, postcode from properties where id = ${id}`;
  if (!property) return null;

  const [[totals], months, invoices] = await Promise.all([
    sql`
      select count(*)::int as count,
             coalesce(sum(gross_pence), 0)::int as total_pence,
             coalesce(sum(gross_pence) filter (where category = 'materials'), 0)::int as materials_pence,
             coalesce(sum(vat_pence), 0)::int as vat_pence
      from invoices where property_id = ${id} and status = 'filed'`,
    sql`
      select to_char(invoice_date, 'YYYY-MM') as month, count(*)::int as count,
             sum(net_pence)::int as net_pence, sum(vat_pence)::int as vat_pence, sum(gross_pence)::int as gross_pence
      from invoices where property_id = ${id} and status = 'filed'
      group by 1 order by 1`,
    sql`
      select id, to_char(invoice_date, 'YYYY-MM') as month, invoice_date::text as invoice_date, supplier,
             invoice_number, category, net_pence, vat_pence, gross_pence, blob_url
      from invoices where property_id = ${id} and status = 'filed'
      order by invoice_date, supplier`,
  ]);

  return {
    property: property as PropertyReport["property"],
    totals: totals as PropertyReport["totals"],
    months: months as MonthTotal[],
    invoices: invoices as FiledInvoice[],
  };
}

/** "2026-09" -> "Sep 2026" */
export function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}
