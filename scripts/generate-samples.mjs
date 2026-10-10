// Generates fictional invoice PDFs for testing and demos into samples/.
// Usage: npm run samples
// Includes a clean invoice per property, one with wrong arithmetic, one duplicate,
// and one with no delivery address (goes to Needs Review to pick the property).
import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const BUYER = ["Charbak Contracting", "12 Crumpet Close", "Much Dunking, Yorkshire", "YD3 4TE"];

const invoices = [
  {
    file: "01-brunel-timber-clean.pdf",
    supplier: ["Brunel Timber Merchants Ltd", "Cattle Market Road", "Bristol", "BS1 6QS"],
    number: "BTM-20417", date: "14/08/2026",
    deliverTo: ["1 Martian Street", "Olympus Mons, Mars", "MR1 4RS"],
    lines: [["40", "C24 Treated Timber 47x100mm 4.8m", "11.25"], ["6", "OSB3 Board 18mm 2440x1220", "22.50"]],
    net: "585.00", vat: "117.00", gross: "702.00",
  },
  {
    file: "02-pennine-plumbing-clean.pdf",
    supplier: ["Pennine Plumbing Services", "18 Viaduct Street", "Leeds", "LS4 2BT"],
    number: "PPS-0932", date: "02/09/2026",
    deliverTo: ["42 Great Red Spot Lane", "Io Heights, Jupiter", "JP4 2GS"],
    lines: [["1", "Labour: replace bathroom waste and supply pipework", "320.00"]],
    net: "320.00", vat: "64.00", gross: "384.00",
  },
  {
    file: "03-steel-city-electrical-5pc-vat.pdf",
    supplier: ["Steel City Electrical Ltd", "Unit 9, Don Valley Works", "Sheffield", "S9 3HU"],
    number: "SCE/26/1188", date: "19/09/2026",
    deliverTo: ["7 Ring Road", "Titan Vale, Saturn", "ST6 9RR"],
    lines: [["1", "Labour: install loft insulation (energy-saving, reduced rate)", "860.00"]],
    net: "860.00", vat: "43.00", gross: "903.00", vatLabel: "VAT 5%",
  },
  {
    file: "04-avon-roofing-wrong-vat-arithmetic.pdf",
    supplier: ["Avon Roofing Supplies", "Feeder Road Trade Park", "Bristol", "BS2 0TQ"],
    number: "ARS-5521", date: "24/09/2026",
    deliverTo: ["1 Martian Street", "Olympus Mons, Mars", "MR1 4RS"],
    lines: [["20", "Natural Slate 500x250mm (pack of 20)", "25.00"]],
    // Deliberate error: 500.00 + 100.00 = 600.00, but the total says 610.00.
    net: "500.00", vat: "100.00", gross: "610.00",
  },
  {
    file: "05-brunel-timber-DUPLICATE.pdf",
    supplier: ["Brunel Timber Merchants Ltd", "Cattle Market Road", "Bristol", "BS1 6QS"],
    number: "BTM-20417", date: "14/08/2026", copy: true,
    deliverTo: ["1 Martian Street", "Olympus Mons, Mars", "MR1 4RS"],
    lines: [["40", "C24 Treated Timber 47x100mm 4.8m", "11.25"], ["6", "OSB3 Board 18mm 2440x1220", "22.50"]],
    net: "585.00", vat: "117.00", gross: "702.00",
  },
  {
    file: "06-yorkshire-tool-hire-no-delivery-address.pdf",
    supplier: ["Yorkshire Tool Hire", "Kirkstall Road", "Leeds", "LS3 1JF"],
    number: "YTH-77310", date: "03/10/2026",
    deliverTo: null, reference: "Job ref: Great Red Spot Lane",
    lines: [["1", "Tile cutter hire, 1 week (collected from branch)", "45.00"]],
    net: "45.00", vat: "9.00", gross: "54.00",
  },
];

async function render(inv) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const text = (s, x, y, size = 10, f = font) => page.drawText(s, { x, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
  const block = (lines, x, y, title) => {
    if (title) text(title, x, y + 14, 8, bold);
    lines.forEach((l, i) => text(l, x, y - i * 13, 10, i === 0 ? bold : font));
  };

  text(inv.supplier[0], 40, 790, 18, bold);
  inv.supplier.slice(1).forEach((l, i) => text(l, 40, 770 - i * 12, 9));
  text(inv.copy ? "INVOICE (COPY)" : "INVOICE", 420, 790, 18, bold);
  text(`Invoice No: ${inv.number}`, 420, 768);
  text(`Invoice Date: ${inv.date}`, 420, 754);
  if (inv.reference) text(inv.reference, 420, 740);

  block(BUYER, 40, 680, "INVOICE TO");
  if (inv.deliverTo) block(inv.deliverTo, 320, 680, "DELIVER TO");
  else text("Collected from branch", 320, 680, 10, bold);

  let y = 580;
  text("Qty", 40, y, 9, bold); text("Description", 80, y, 9, bold); text("Unit price", 400, y, 9, bold); text("Value ex VAT", 480, y, 9, bold);
  for (const [qty, desc, unit] of inv.lines) {
    y -= 18;
    text(qty, 40, y); text(desc, 80, y); text(unit, 400, y);
    text((Number(qty) * Number(unit)).toFixed(2), 480, y);
  }
  text("Sub total (net)", 380, 200); text(inv.net, 500, 200);
  text(inv.vatLabel ?? "VAT 20%", 380, 184); text(inv.vat, 500, 184);
  text("TOTAL", 380, 164, 12, bold); text(`GBP ${inv.gross}`, 480, 164, 12, bold);
  text(`${inv.supplier[0]}  VAT Reg. GB 000 0000 00 (fictional, for testing)`, 40, 60, 8);
  return pdf.save();
}

await mkdir(new URL("../samples/", import.meta.url), { recursive: true });
for (const inv of invoices) {
  await writeFile(new URL(`../samples/${inv.file}`, import.meta.url), await render(inv));
  console.log(`samples/${inv.file}`);
}
