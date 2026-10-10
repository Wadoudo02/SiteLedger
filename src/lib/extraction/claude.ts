import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getCompany } from "../company";
import { extractedInvoiceSchema, type ExtractedInvoice } from "../invoice";
import { formatPostcode } from "../postcode";
import { ExtractionUnavailableError, MalformedOutputError, type InvoiceFile } from "./types";

const MODEL = process.env.EXTRACTION_MODEL || "claude-sonnet-5-5";

// timeout x (retries + 1) stays inside the upload route's 60s maxDuration.
const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });

const SYSTEM =
  "You read UK building and construction invoices and receipts for a bookkeeping app. " +
  "Report only what is printed on the document. Never calculate, estimate or invent values.";

function instructions(buyer: string): string {
  return `Extract these fields from the invoice. The file contains exactly one invoice.

- supplier: the business that issued the invoice, as named in its letterhead (trading name).
- invoiceNumber: the invoice / document number. Not an account number, customer number, order number or reference.
- invoiceDate: the invoice date (or tax point date) as YYYY-MM-DD. UK dates are day-first (03/04/2026 is 3 April 2026). Two-digit years are 20xx ("6Oct26" is 2026-10-06).
- net, vat, gross: the invoice TOTALS exactly as printed (net / sub-total excluding VAT, total VAT, total including VAT) as plain decimal strings such as "734.40", without currency symbols or commas. If a total is not printed, return null. Do not work it out.
- category: "materials" for goods, building supplies and tools; "labour" for work or services carried out by people; "other" for anything else (hire, delivery charges, fees).
- deliveryPostcode: the postcode of the DELIVERY or SITE address only ("Deliver to", "Delivery address", "Site address"). ${buyer} Any "Invoice to", "Bill to", "Customer", "Sold to" or registered-office address is never the site: never return its postcode. If there is no delivery or site address, return null.
- propertyHint: copy word for word any text that names the job or site, such as "Your Reference: 13 Halstead" or a job name. Null if there is none.

Use null for anything that is not printed or that you cannot read with confidence.`;
}

async function buyerDescription(): Promise<string> {
  const company = await getCompany();
  if (!company) return "The buyer is the customer named on the invoice.";
  const address = [company.address, company.postcode && formatPostcode(company.postcode)].filter(Boolean).join(", ");
  return `The buyer is ${company.name}${address ? ` (billing address: ${address})` : ""}, possibly billed at other addresses too.`;
}

function documentBlock(file: InvoiceFile): Anthropic.ContentBlockParam {
  const data = file.bytes.toString("base64");
  if (file.mimeType === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  }
  return { type: "image", source: { type: "base64", media_type: file.mimeType, data } };
}

/** Real extraction: Claude reads the PDF or photo and returns schema-checked fields. */
export async function claudeExtractInvoice(file: InvoiceFile): Promise<ExtractedInvoice> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set in this environment");
    throw new ExtractionUnavailableError("Invoice reading isn't configured on this server yet.");
  }
  let response;
  try {
    response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(extractedInvoiceSchema) },
      messages: [
        {
          role: "user",
          content: [documentBlock(file), { type: "text", text: instructions(await buyerDescription()) }],
        },
      ],
    });
  } catch (err) {
    // Most specific first. APIConnectionError (incl. timeouts) extends APIError in the TS SDK.
    if (err instanceof Anthropic.RateLimitError) {
      throw new ExtractionUnavailableError("The invoice reader is busy right now. Please try again in a minute.", { cause: err });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new ExtractionUnavailableError("We couldn't reach the invoice reader. Please try again.", { cause: err });
    }
    if (err instanceof Anthropic.BadRequestError) {
      throw new ExtractionUnavailableError(
        "This file couldn't be read. Check it opens normally and isn't password-protected.",
        { cause: err },
      );
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${err.status}: ${err.type ?? ""}`);
      throw new ExtractionUnavailableError("The invoice reader is unavailable right now. Please try again shortly.", {
        cause: err,
      });
    }
    // Anything else (e.g. the reply failing schema validation) counts as malformed output.
    console.error("Unreadable model output:", err instanceof Error ? `${err.name}: ${err.message}` : err);
    throw new MalformedOutputError("Model output did not match the schema", { cause: err });
  }

  if (response.stop_reason !== "end_turn" || !response.parsed_output) {
    console.error(`Extraction stopped early: ${response.stop_reason}`);
    throw new MalformedOutputError(`No usable output (stop_reason: ${response.stop_reason})`);
  }
  return response.parsed_output;
}
