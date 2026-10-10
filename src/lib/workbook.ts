import ExcelJS from "exceljs";
import { formatPostcode } from "./postcode";
import { monthLabel, type PropertyReport } from "./reports";

const MONEY = '"£"#,##0.00';
const pounds = (pence: number) => pence / 100;

/** Summary sheet plus one sheet per month, built fresh from the database on every download. */
export async function buildWorkbook(report: PropertyReport, generatedOn: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SiteLedger";

  const summary = wb.addWorksheet("Summary");
  summary.columns = [{ width: 22 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 14 }];
  summary.addRow([`${report.property.name} (${formatPostcode(report.property.postcode)})`]).font = { bold: true, size: 14 };
  summary.addRow([`Generated ${generatedOn} from filed invoices`]);
  summary.addRow([]);
  summary.addRow(["Total spend", null, pounds(report.totals.total_pence)]);
  summary.addRow(["Materials spend", null, pounds(report.totals.materials_pence)]);
  summary.addRow(["VAT paid", null, pounds(report.totals.vat_pence)]);
  summary.addRow([]);
  summary.addRow(["Month", "Invoices", "Net", "VAT", "Gross"]).font = { bold: true };
  for (const m of report.months) {
    summary.addRow([monthLabel(m.month), m.count, pounds(m.net_pence), pounds(m.vat_pence), pounds(m.gross_pence)]);
  }
  for (const col of [3, 4, 5]) summary.getColumn(col).numFmt = MONEY;

  for (const m of report.months) {
    const sheet = wb.addWorksheet(monthLabel(m.month));
    sheet.columns = [
      { header: "Date", key: "date", width: 12 },
      { header: "Supplier", key: "supplier", width: 36 },
      { header: "Invoice no.", key: "number", width: 16 },
      { header: "Category", key: "category", width: 12 },
      { header: "Net", key: "net", width: 12, style: { numFmt: MONEY } },
      { header: "VAT", key: "vat", width: 12, style: { numFmt: MONEY } },
      { header: "Gross", key: "gross", width: 12, style: { numFmt: MONEY } },
      { header: "File", key: "file", width: 10 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const inv of report.invoices.filter((i) => i.month === m.month)) {
      sheet.addRow({
        date: inv.invoice_date,
        supplier: inv.supplier,
        number: inv.invoice_number,
        category: inv.category,
        net: pounds(inv.net_pence),
        vat: pounds(inv.vat_pence),
        gross: pounds(inv.gross_pence),
        file: { text: "Open", hyperlink: inv.blob_url },
      });
    }
    const total = sheet.addRow({ supplier: "Total", net: pounds(m.net_pence), vat: pounds(m.vat_pence), gross: pounds(m.gross_pence) });
    total.font = { bold: true };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
