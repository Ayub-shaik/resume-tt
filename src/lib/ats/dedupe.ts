/** Normalize resume lines for duplicate detection. */
export function normalizeResumeLine(s: string): string {
  return s
    .toLowerCase()
    .replace(/[•●◦▪▸►]\s*/g, "")
    .replace(/^[-*]\s+/, "")
    .replace(/[^\p{L}\p{N}\s.+/#]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function lineExistsIn(haystack: string, needle: string): boolean {
  const n = normalizeResumeLine(needle);
  if (!n || n.length < 8) return false;
  const lines = haystack.split(/\r?\n/).map(normalizeResumeLine).filter(Boolean);
  if (lines.some((l) => l === n || l.includes(n) || n.includes(l))) return true;
  const blob = normalizeResumeLine(haystack);
  return blob.includes(n);
}

/** True when suggested text is novel vs original and improved bodies. */
export function isNovelSuggestion(
  suggested: string,
  ...bodies: string[]
): boolean {
  return !bodies.some((b) => lineExistsIn(b, suggested));
}
