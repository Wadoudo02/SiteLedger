// Money is integer pence everywhere. Amounts arrive from the model as decimal strings
// (e.g. "734.40") and are parsed here without floating point.

const MONEY = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;
const MAX_PENCE = 2_147_483_647; // Postgres integer

/** "£1,234.5" -> 123450. Returns null if the value isn't a plain money amount. */
export function parsePence(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const match = MONEY.exec(String(input).replace(/[£,\s]/g, ""));
  if (!match) return null;
  const pence = Number(match[2]) * 100 + Number((match[3] ?? "").padEnd(2, "0"));
  if (pence > MAX_PENCE) return null;
  return match[1] ? -pence : pence;
}

/** 123450 -> "£1,234.50" */
export function formatPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}
