export type ResumeChangeLine = {
  kind: "add" | "remove" | "modify" | "info";
  text: string;
};

function normLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Compact tailor feed: prefer model notes, then a short summary of real edits.
 * Avoid noisy false “Removing” lines from blank/reflow diffs.
 */
export function diffResumeLines(
  before: string,
  after: string,
  notes: string[] = [],
): ResumeChangeLine[] {
  const out: ResumeChangeLine[] = [];
  for (const n of notes.slice(0, 10)) {
    const t = n.trim();
    if (t) out.push({ kind: "info", text: t });
  }

  const a = before
    .split("\n")
    .map(normLine)
    .filter((l) => l.length > 8);
  const b = after
    .split("\n")
    .map(normLine)
    .filter((l) => l.length > 8);

  const setA = new Set(a);
  const setB = new Set(b);
  const removed = a.filter((l) => !setB.has(l));
  const added = b.filter((l) => !setA.has(l));

  // Pair near-matches as modifications
  const usedAdd = new Set<number>();
  let modCount = 0;
  for (const r of removed) {
    const idx = added.findIndex(
      (x, i) =>
        !usedAdd.has(i) &&
        (x.includes(r.slice(0, 28)) || r.includes(x.slice(0, 28))),
    );
    if (idx >= 0) {
      usedAdd.add(idx);
      modCount += 1;
      if (out.length < 28) {
        out.push({ kind: "modify", text: `↻ ${r.slice(0, 110)}` });
        out.push({ kind: "modify", text: `→ ${added[idx].slice(0, 110)}` });
      }
    }
  }

  const trueRemoved = removed.filter((r) => {
    return !added.some(
      (x) => x.includes(r.slice(0, 28)) || r.includes(x.slice(0, 28)),
    );
  });
  const trueAdded = added.filter((_, i) => !usedAdd.has(i));

  for (const r of trueRemoved.slice(0, 4)) {
    out.push({ kind: "remove", text: `− ${r.slice(0, 120)}` });
  }
  for (const ad of trueAdded.slice(0, 6)) {
    out.push({ kind: "add", text: `+ ${ad.slice(0, 120)}` });
  }

  if (modCount || trueRemoved.length || trueAdded.length) {
    out.unshift({
      kind: "info",
      text: `Edits: ${modCount} refined, ${trueAdded.length} added, ${trueRemoved.length} removed (line-level).`,
    });
  }

  if (!out.length) {
    out.push({ kind: "info", text: "Tailor pass complete — wording refined." });
  }
  return out.slice(0, 32);
}
