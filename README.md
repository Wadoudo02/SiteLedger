# SiteLedger

**Live:** https://site-ledger-lyart.vercel.app

Small landlords and builders upload building invoices (PDF or photo). SiteLedger reads each invoice with Claude, **checks it in code**, and files it under the right property and month. Clean invoices file automatically. Anything that fails a check goes to a **Needs Review** queue, where a person corrects it and confirms it, or rejects it. Each property has a dashboard and an **Excel download** that is always up to date.

## Try it

1. Open the live app. Three fictional properties and six sample invoices are already loaded.
2. **Upload** any PDF from [`samples/`](samples). Each one demonstrates a case:

   | File | What happens |
   |---|---|
   | `01`, `02`, `03` | Filed automatically (03 has 5% VAT) |
   | `04-…-wrong-vat-arithmetic` | Needs Review: net + VAT ≠ gross |
   | `05-…-DUPLICATE` | Needs Review: duplicate of 01 |
   | `06-…-no-delivery-address` | Needs Review: choose the property. The "Job ref" hint is shown. |

   Uploading an already-processed sample again is itself caught as a duplicate.
3. Open **Needs Review**, fix or reject an invoice, then open a property to see its dashboard and **Download Excel**.

Regenerate the samples with `npm run samples`.

## How it works

```
upload ─► validate file ─► daily cap ─► extractInvoice() ─► checks (code) ─► Blob + Postgres
                                         (Claude reads)        │
                                                               ├─ all pass ─► filed: properties/{property}/{YYYY-MM}/{supplier}-{no}.{ext}
                                                               └─ any fail ─► Needs Review: review/{id}.{ext} ─► edit ─► re-check ─► filed / rejected
```

- **The AI only reads.** `extractInvoice(file)` ([src/lib/extraction](src/lib/extraction)) is the single AI touchpoint: Claude Sonnet 5.5 with structured outputs, validated by zod, every field nullable. A mock implementation (`EXTRACTOR=mock`) returns fixed data.
- **All checks are pure functions in code** ([src/lib/checks.ts](src/lib/checks.ts)), with 57 vitest tests:
  - required fields present;
  - net + VAT = gross **to the penny**;
  - VAT is 20%, 5% or 0% of net (±2p for per-line rounding);
  - a valid date that isn't in the future (UK time);
  - a duplicate check;
  - the property is matched by delivery postcode.
- **Money is integer pence.** The model returns amounts as text, and code parses them without floating point. Dates are ISO.
- **Dashboard and Excel figures come from SQL** over filed invoices ([src/lib/reports.ts](src/lib/reports.ts)). The workbook is built on each download.

### Product decisions

- **Singular invoice mode:** one file = one invoice.
- **Property matching:** you can pick the property at upload, which overrides matching. Otherwise the **delivery/site** postcode is matched against saved properties. The "Invoice to" (billing) address is ignored, both in the prompt and in code. No delivery address, no match, or several matches sends the invoice to review.
- **Duplicates:** same invoice number **and** (same gross **or** same supplier), searched across all invoices. Partial unique indexes in Postgres back this up.
- **Review:** *Confirm* re-runs every check and files only if they all pass. *Reject* keeps the invoice out of totals and the export.
- **Errors get friendly messages:** empty file, over 4 MB, unsupported type (detected from the file bytes, not the extension), API errors and rate limits. Malformed model output is not an error: the file is kept and sent to review for manual entry.
- **The daily cap** is 30 extractions app-wide, counted per attempt with an atomic SQL upsert.

## Data model

See [db/schema.sql](db/schema.sql).

- `company`: your billing address.
- `properties`: name, plus a normalised unique postcode.
- `invoices`:
  - status `filed | needs_review | rejected`;
  - the extracted fields, in pence;
  - delivery postcode, property hint, duplicate keys, review reasons;
  - the Blob path.

  A `CHECK` constraint guarantees every filed invoice is complete.
- `extraction_usage`: the daily counter.

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind · Neon Postgres · Vercel Blob · Anthropic SDK (Claude Sonnet 5.5) · zod · exceljs · vitest · pdf-lib (samples).

## Run locally

```bash
npm install
cp .env.example .env   # fill in the values
npm run db:setup       # create tables and seed demo data (idempotent)
npm run check-env      # verify Postgres, Blob and Anthropic credentials
npm test               # unit tests
npm run dev
```

## Next steps

Out of scope for this 2-hour build:
- **Authentication and per-user data.** Today the app is a single shared workspace, and Blob files are public (unguessable only by path).
- **Google Drive sync, email ingestion** (forward invoices to an inbox address), **line items, payments.**

Improvements noted along the way:
- **Multi-invoice mode:** several invoices in one PDF or photo.
- **Several properties sharing a postcode** (flats in one block). The check already handles it; the schema keeps postcodes unique for now.
- Credit notes (negative amounts currently go to review).
- Server-side model fallback on refusals, and an accuracy and cost comparison against Claude Haiku 5.5.
- Undo for rejected invoices, and an audit log of reviewer edits.
