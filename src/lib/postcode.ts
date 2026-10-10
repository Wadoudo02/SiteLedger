/** "bs6 5qa" -> "BS65QA". Used for storage and matching. */
export function normalisePostcode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** "BS65QA" -> "BS6 5QA". The inward code is always the last three characters. */
export function formatPostcode(normalised: string): string {
  return normalised.length > 3 ? `${normalised.slice(0, -3)} ${normalised.slice(-3)}` : normalised;
}

/** Basic UK postcode shape check on a normalised postcode ("M219FT", "SW1A1AA"). */
export function isValidPostcode(normalised: string): boolean {
  return /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(normalised);
}
