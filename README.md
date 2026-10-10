# SiteLedger

**Live:** https://site-ledger-lyart.vercel.app

Small landlords and builders upload building invoices (PDF or photo). SiteLedger reads each invoice with Claude, **checks it in code**, and files it under the right property and month. Clean invoices file automatically. Anything that fails a check goes to a **Needs Review** queue, where a person corrects it and confirms it, or rejects it. Each property has a dashboard and an **Excel download** that is always up to date.

## Try it

The live app is loaded with a fictional company (Charbak Contracting) and three fictional properties: **Mars** (MR1 4RS), **Jupiter** (JP4 2GS) and **Saturn** (ST6 9RR). The receipts in [`examples/`](examples) are fictional PDFs and phone photos from five suppliers ([contact sheet](examples/contact_sheet.jpg), [ground truth](examples/ground_truth.csv)). They are split by whether they are already in the app.

**[`examples/not-on-the-system/`](examples/not-on-the-system): upload these to see them processed fresh.**

| File | What happens |
|---|---|
| `05_mars_knotty.pdf` | Files automatically under Mars |
| `10_jupiter_knotty.jpg` | Photo; files automatically under Jupiter |
| `15_saturn_orbital.jpg` | Photo; files automatically under Saturn (October) |
| `07_jupiter_hammer.jpg` | Till receipt with only a total, so it goes to Needs Review. The "JOB REF" hint names the property. |
| `09_jupiter_pipedream.pdf` | No delivery address, so it goes to Needs Review. The "Your Reference" hint names the property. |

**[`examples/on-the-system/`](examples/on-the-system): already filed (or waiting in Needs Review).** Upload any of these to see the **duplicate check** catch it.

**Delete anything you like.** On a property's page, each invoice row has a **Delete** button, which removes the invoice and its stored file. A deleted receipt can then be uploaded again from `examples/` and is treated as new. In Needs Review, **Reject** removes an invoice from totals.

Then open **Needs Review** to correct and file an invoice, and open a property for its dashboard and **Download Excel**.

[`samples/`](samples) has 6 more generated PDFs covering the failure cases: wrong arithmetic, a duplicate of sample 01, and no delivery address. None are on the system. Regenerate them with `npm run samples`.

### Accuracy on the examples

`node --env-file=.env scripts/eval-examples.mjs` uploads all 15 receipts (both folders) and scores the result against [`examples/ground_truth.csv`](examples/ground_truth.csv). The live run scored **65/75 fields correct**: 10 filed automatically and 5 went to review.

- Every date, and every amount that is printed on the receipt, was read exactly.
- Every delivery postcode matched the right property. This includes photos, two billing addresses, and a VAT figure 1p off due to rounding.
- **The 10 misses are not misreads:**
  - **6 are on the Hammer Time till receipts**, which print no net or VAT. The ground truth derives them; the app deliberately never calculates what isn't printed.
  - **4 are naming conventions:** the model used the trading name ("PipeDream", "Knotty Pine") where the CSV has the registered name ("PipeDream Direct", "Knotty Pine Timber").

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
- **Delete:** a filed invoice can be deleted from its property page (e.g. refunded or cancelled). Deleting removes the row and the stored file, so the same invoice can be uploaded again.
- **Errors get friendly messages:** empty file, over 4 MB, unsupported type (detected from the file bytes, not the extension), API errors and rate limits. Malformed model output is not an error: the file is kept and sent to review for manual entry.
- **The daily cap** is 100 extractions app-wide, counted per attempt with an atomic SQL upsert.

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
- Prompt: on till receipts with no invoice number, use the receipt or transaction number, so duplicate detection also covers receipts. Prefer the registered supplier name.
- Settings: the "Property removed" confirmation disappears along with the removed row.
