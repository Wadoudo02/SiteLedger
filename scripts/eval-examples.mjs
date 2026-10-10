// Uploads every receipt in examples/ to a running SiteLedger and compares what was
// extracted with examples/ground_truth.csv.
// Usage: node --env-file=.env scripts/eval-examples.mjs [baseUrl]   (default: the live site)
// Each upload uses one of the app's daily extractions. Receipts already on the system come back as duplicates
// (still scored: the fields are read before the duplicate check).
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const BASE = process.argv[2] ?? "https://site-ledger-lyart.vercel.app";
const POSTCODES = { Mars: "MR14RS", Jupiter: "JP42GS", Saturn: "ST69RR" };
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const sql = neon(process.env.DATABASE_URL);
const dir = new URL("../examples/", import.meta.url);

function parseCsv(text) {
  const [header, ...lines] = text.trim().split("\n");
  const keys = header.split(",");
  return lines.map((line) => {
    const cells = line.match(/("([^"]*)"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, "").replace(/^"|"$/g, ""));
    return Object.fromEntries(keys.map((k, i) => [k, cells[i]]));
  });
}

/** "18Sep26" | "19/09/2026" | "26 Sep 2026" -> "2026-09-18" */
function isoDate(value) {
  let m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = value.match(/^(\d{1,2})\s*([A-Za-z]{3})\s*(\d{2}|\d{4})$/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${String(MONTHS[m[2].toLowerCase()]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return value;
}

const pence = (pounds) => Math.round(Number(pounds) * 100);
const supplierKey = (s) =>
  (s ?? "").toLowerCase().replace(/&/g, " and ").replace(/\b(and|ltd|limited|plc|llp)\b/g, " ").replace(/[^a-z0-9]/g, "");

const rows = parseCsv(await readFile(new URL("ground_truth.csv", dir), "utf8"));
let fieldsRight = 0;
let fieldsTotal = 0;
const outcomes = { filed: 0, needs_review: 0, error: 0 };

for (const truth of rows) {
  const form = new FormData();
  const bytes = await readFile(new URL(truth.file, dir)).catch(() =>
    readFile(new URL(`on-the-system/${truth.file}`, dir)).catch(() => readFile(new URL(`not-on-the-system/${truth.file}`, dir))),
  );
  form.append("file", new Blob([bytes]), truth.file);
  const res = await fetch(`${BASE}/api/invoices`, { method: "POST", body: form });
  const body = await res.json();
  if (!res.ok) {
    outcomes.error++;
    console.log(`✗ ${truth.file}: upload failed (${res.status}) ${body.error}`);
    continue;
  }
  outcomes[body.status]++;
  const [got] = await sql`
    select supplier, invoice_date::text as date, net_pence, vat_pence, gross_pence, site_postcode, property_hint
    from invoices where id = ${body.id}`;

  const checks = {
    supplier: supplierKey(got.supplier).includes(supplierKey(truth.supplier)),
    date: got.date === isoDate(truth.date),
    net: got.net_pence === pence(truth.net),
    vat: got.vat_pence === pence(truth.vat),
    gross: got.gross_pence === pence(truth.total),
  };
  const wrong = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  fieldsRight += Object.values(checks).filter(Boolean).length;
  fieldsTotal += Object.keys(checks).length;

  const postcodeNote =
    got.site_postcode === POSTCODES[truth.property]
      ? "postcode ✓"
      : got.site_postcode
        ? `postcode ✗ (${got.site_postcode})`
        : `no postcode${got.property_hint ? `, hint "${got.property_hint}"` : ""}`;
  console.log(
    `${wrong.length ? "✗" : "✓"} ${truth.file.padEnd(24)} ${body.status.padEnd(12)} ${postcodeNote}` +
      (wrong.length ? `  WRONG: ${wrong.map((k) => `${k}=${k === "supplier" ? got.supplier : k === "date" ? got.date : got[`${k === "gross" ? "gross" : k}_pence`]}`).join(", ")}` : "") +
      (body.reasons.length ? `\n    reasons: ${body.reasons.join(" | ")}` : ""),
  );
}

console.log(`\nFields correct: ${fieldsRight}/${fieldsTotal}. Filed: ${outcomes.filed}, Needs Review: ${outcomes.needs_review}, errors: ${outcomes.error}.`);
