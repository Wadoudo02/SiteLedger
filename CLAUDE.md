# SiteLedger

2-hour timed take-home (Algosoup). Everything is logged and reviewed. Work carefully, keep scope tight, verify everything.

## Links

- Live: https://site-ledger-lyart.vercel.app (auto-deploys from `main`). Note: `site-ledger.vercel.app` is someone else's app.
- Repo: https://github.com/Wadoudo02/SiteLedger

## Product

Small landlords and builders upload building invoices (PDF or photo). The app extracts supplier, invoice number, date, net, VAT, gross and category (`materials` | `labour` | `other`), runs checks **in code**, and files the invoice under property and month.

- Clean invoices file automatically.
- Any failed check sends the invoice to a **Needs Review** queue, with the reasons listed. A human edits and confirms it there.
- Each property has: a table of invoices by month, a small dashboard (total spend, materials spend, VAT paid, spend by month), and an **Excel download** generated on demand from the database (one sheet per month and a summary sheet), so it is always up to date.

## Stack

- Next.js App Router, TypeScript, Tailwind, deployed on Vercel (free Hobby plan)
- Neon Postgres
- Vercel Blob for files, stored at `properties/{property}/{YYYY-MM}/{supplier}-{invoice-no}.{ext}` using the **invoice date**, not the upload date
- Claude (Haiku or Sonnet, decided at the time) via the Anthropic SDK, reading the PDF/image directly
- zod to validate model output, exceljs for the workbook, vitest for tests

## Architecture

- Extraction sits behind one interface: `extractInvoice(file) => Promise<ExtractedInvoice>`.
- A **mock** implementation returns fixed data, so the app and tests work without the API. The real Claude implementation is wired in once the core flow works.

## Rules (non-negotiable)

- **The AI only reads documents.** All checks and all arithmetic happen in code. Dashboard figures come from database queries.
- **Money is integer pence. Dates are ISO** (`YYYY-MM-DD`).
- **Checks** (any failure → Needs Review, with every reason listed):
  1. Required fields present
  2. `net + VAT = gross` to the penny
  3. VAT is 20%, 5% or 0% of net
  4. No duplicate supplier + invoice number
  5. Property matched by postcode, **in code**, against the saved property list
  6. Valid date, not in the future
- **Friendly error messages** for: empty uploads, oversized uploads (limit **4 MB**), unsupported file types, malformed model output, API errors and rate limits.
- **Cap extractions at 30 per day app-wide**, so a public URL cannot drain API credit.
- **Secrets come from environment variables only.** Never print, log, echo or commit them. Never `cat .env`.
- **Never claim something works until it has been run.** Report test and command output honestly.
- Unit tests for the checks module, and run them.
- Deploy a minimal skeleton early. Make small commits with clear messages.

## Agreed decisions

- **Singular invoice mode**: one uploaded file (PDF or photo) = exactly one invoice. Multi-invoice mode is a possible later extension.
- **Property resolution**: the user can pick the property at upload (this overrides postcode matching). Otherwise it's matched by the delivery postcode. No postcode, a billing-address postcode, no match, or several matches → Needs Review, where the human picks from the saved property list.
- **The company can have several billing ("Invoice to") addresses.** All of them are ignored for matching. Real invoices show the same company billed at different addresses.

- **VAT check tolerance ±2p**: `|vat − round(net × rate)| ≤ 2` for some rate in {20%, 5%, 0%}. `net + VAT = gross` stays **exact**.
- **Blob paths**: clean invoices go straight to `properties/{property}/{YYYY-MM}/{supplier}-{invoice-no}.{ext}`. Needs Review invoices go to `review/{id}.{ext}` and are copied to the final path when confirmed (path segments slugified).
- **Review queue**: *Confirm* re-runs all checks and files only if they pass. *Reject* sets status `rejected`, which is excluded from totals and the export.
- **Malformed model output** → saved as Needs Review with empty fields, so the human types them in. **API errors / rate limits** → friendly "try again" message, nothing saved.
- **Company profile**: the user saves their own company name and address. The prompt tells Claude to ignore that address (the invoice/billing address) and extract the **delivery/site** postcode. In code, an extracted postcode equal to the company postcode is treated as unmatched.
- **Upload** goes through a route handler (`POST /api/invoices`), with a server action as fallback. Server actions default to a 1 MB body limit; Vercel's request limit is 4.5 MB.
- **Extraction** uses structured output (a forced JSON schema) with every field nullable, so Claude returns `null` for anything not on the document. zod still validates.
- **The daily cap counts attempts**, not successes. It's an atomic increment on `extraction_usage`.
- **"Not in the future"** is judged against today in `Europe/London`.
- **DB access**: raw SQL via `@neondatabase/serverless`, schema in `db/schema.sql`. No ORM.

## Data model

```
company           id (always 1), name, address, postcode (normalised)
properties        id serial, name, postcode unique (normalised: uppercase, no spaces), created_at
invoices          id uuid, status ('filed'|'needs_review'|'rejected'), property_id → properties (nullable),
                  supplier, invoice_number, invoice_date date, net_pence int, vat_pence int, gross_pence int,
                  category ('materials'|'labour'|'other'), site_postcode, review_reasons jsonb,
                  blob_url, blob_pathname, original_filename, mime_type, created_at, filed_at
                  unique (lower(supplier), lower(invoice_number)) where status = 'filed'
extraction_usage  day date pk, count int
```

Month is derived from `invoice_date`, never stored separately.

## Real invoice examples

`real_invoice_examples/` (git-ignored; we have permission to use them, not to publish them) holds real UK builders' merchant invoices. Lessons learned:
- Dates are printed in formats like `29Sep26` and `21/09/2026`. The model returns ISO; code validates.
- Some invoices have **no delivery address** at all. Only a reference such as "Your Reference: 13 Halstead" hints at the site.
- Street names can be misspelled. Postcodes are the reliable key.
- VAT is consistent with `round(net × 20%)`.

## Demo data

Write a script that generates 5–6 fake invoice PDFs from fictional suppliers for fictional properties. Include one with wrong VAT arithmetic and one duplicate.

## Out of scope (list as next steps in the README)

Authentication, Google Drive sync, email ingestion, line items, payments.

## Next.js 16 notes

- Next.js **16.4** with `cacheComponents: true` (see AGENTS.md). Read `node_modules/next/dist/docs/` before using an unfamiliar API.
- DB-backed UI must **not** use `"use cache"`. Put async data components inside `<Suspense>` so they render at request time, which keeps figures always fresh. GET route handlers that query the DB run at request time.
- **Read dates as text** (`invoice_date::text`). The Neon driver otherwise converts `date` into a JS Date in local time, which shifts it by a day in BST.
- npm's global cache on this machine has permission issues. Use `npm install --cache <scratchpad>/npm-cache`.

## Working style

- One step at a time. Explain each step briefly, then do it.
- Keep code simple and readable. No speculative abstractions.
- Prefer small, focused commits (`feat: …`, `fix: …`, `test: …`, `chore: …`, `docs: …`).
