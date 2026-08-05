export type LineTag =
  | "weak"
  | "remove"
  | "improve"
  | "vague"
  | "keyword"
  | "ats"
  | "outdated"
  | "inflate"
  | "missing"
  | "strong"
  | "ok";

export type RewriteSuggestion = {
  area: string;
  current: string;
  suggested: string;
  why: string;
};

export type AnnotatedLine = {
  text: string;
  tag: LineTag;
  note: string;
  suggestionIndex: number | null;
};

export type ImprovedLine = {
  text: string;
  modified: boolean;
  suggestionIndex: number | null;
  why: string;
};

export function guessTag(area: string, why: string): LineTag {
  const t = `${area} ${why}`.toLowerCase();
  if (/\bremove\b|delete|cut|redundant/.test(t)) return "remove";
  if (/\bkeyword|ats\b/.test(t)) return /ats/.test(t) ? "ats" : "keyword";
  if (/\bvague|generic|buzzword/.test(t)) return "vague";
  if (/\boutdated|old|legacy/.test(t)) return "outdated";
  if (/\binflat|exaggerat|overclaim/.test(t)) return "inflate";
  if (/\bmissing|add|gap/.test(t)) return "missing";
  if (/\bstrong|keep|good/.test(t)) return "strong";
  if (/\bweak|poor|thin/.test(t)) return "weak";
  return "improve";
}

/** Split resume into display lines (preserve blanks as empty strings). */
export function splitResumeLines(text: string): string[] {
  if (!text) return [];
  return text.replace(/\r\n/g, "\n").split("\n");
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Strip markdown list/heading prefixes for line matching */
export function stripMarkdownLine(s: string): string {
  return s
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*•]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .trim();
}

/** Find best line index for a suggestion's "current" snippet. */
export function findLineIndex(lines: string[], snippet: string): number {
  const needle = normalize(snippet);
  if (!needle) return -1;
  let best = -1;
  let bestScore = 0;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] || "";
    const hay = normalize(stripMarkdownLine(raw) || raw);
    if (!hay) continue;
    const needleStripped = normalize(stripMarkdownLine(snippet) || snippet);
    if (hay === needleStripped || hay === needle) return i;
    if (hay.includes(needle) || needle.includes(hay)) {
      const score = Math.min(hay.length, needle.length);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
  }
  return best;
}

export function annotateResumeLines(
  resumeText: string,
  suggestions: RewriteSuggestion[],
  gaps: string[] = [],
): AnnotatedLine[] {
  const lines = splitResumeLines(resumeText);
  const tags = new Map<number, { tag: LineTag; note: string; suggestionIndex: number | null }>();

  suggestions.forEach((s, suggestionIndex) => {
    const idx = findLineIndex(lines, s.current);
    if (idx < 0) return;
    const prev = tags.get(idx);
    const tag = guessTag(s.area, s.why || "");
    // Prefer more severe tags over "improve"
    if (!prev || prev.tag === "ok" || prev.tag === "improve") {
      tags.set(idx, { tag, note: s.why || s.area, suggestionIndex });
    }
  });

  // Gaps that don't map to a line stay out of the left pane (shown elsewhere)
  void gaps;

  return lines.map((text, i) => {
    const hit = tags.get(i);
    if (hit) {
      return {
        text,
        tag: hit.tag,
        note: hit.note,
        suggestionIndex: hit.suggestionIndex,
      };
    }
    return { text, tag: "ok" as const, note: "", suggestionIndex: null };
  });
}

/**
 * Build improved resume text by applying suggested replacements in order.
 * Unmatched suggestions are appended under an "Improvements" section.
 */
export function buildImprovedText(
  resumeText: string,
  suggestions: RewriteSuggestion[],
): { text: string; lines: ImprovedLine[] } {
  const lines = splitResumeLines(resumeText);
  const used = new Set<number>();
  const modified = new Map<number, { text: string; suggestionIndex: number; why: string }>();
  const orphans: RewriteSuggestion[] = [];

  suggestions.forEach((s, suggestionIndex) => {
    const idx = findLineIndex(lines, s.current);
    if (idx < 0 || used.has(idx) || !s.suggested?.trim()) {
      if (s.suggested?.trim()) orphans.push(s);
      return;
    }
    used.add(idx);
    modified.set(idx, {
      text: s.suggested.trim(),
      suggestionIndex,
      why: s.why || s.area,
    });
  });

  const outLines: ImprovedLine[] = lines.map((text, i) => {
    const m = modified.get(i);
    if (m) {
      return {
        text: m.text,
        modified: true,
        suggestionIndex: m.suggestionIndex,
        why: m.why,
      };
    }
    return { text, modified: false, suggestionIndex: null, why: "" };
  });

  if (orphans.length) {
    outLines.push({
      text: "",
      modified: false,
      suggestionIndex: null,
      why: "",
    });
    outLines.push({
      text: "— Suggested additions —",
      modified: false,
      suggestionIndex: null,
      why: "",
    });
    orphans.forEach((s, i) => {
      outLines.push({
        text: s.suggested.trim(),
        modified: true,
        suggestionIndex: suggestions.indexOf(s),
        why: s.why || s.area,
      });
      void i;
    });
  }

  const text = outLines.map((l) => l.text).join("\n");
  return { text, lines: outLines };
}
