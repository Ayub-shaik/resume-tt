/** True when the field contains a single http(s) URL and no other text. */
export function isStandaloneJobUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("\n")) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
