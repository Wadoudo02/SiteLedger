/** "bs6 5qa" -> "BS65QA". Used for storage and matching. */
export function normalisePostcode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** "BS65QA" -> "BS6 5QA". The inward code is always the last three characters. */
export function formatPostcode(normalised: string): string {
  return normalised.length > 3 ? `${normalised.slice(0, -3)} ${normalised.slice(-3)}` : normalised;
}
