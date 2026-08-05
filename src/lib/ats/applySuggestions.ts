import { isNovelSuggestion } from "@/lib/ats/dedupe";
import type { RewriteSuggestion } from "@/lib/ats/dualPage";
import { findLineIndex, splitResumeLines } from "@/lib/ats/dualPage";

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip markdown list/heading prefixes for line matching */
export function stripMarkdownLine(s: string): string {
  return s
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*•]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .trim();
}

function findFuzzyLineIndex(lines: string[], snippet: string): number {
  const direct = findLineIndex(lines, snippet);
  if (direct >= 0) return direct;
  const needle = norm(stripMarkdownLine(snippet));
  if (!needle || needle.length < 4) return -1;
  let best = -1;
  let bestScore = 0;
  for (let i = 0; i < lines.length; i++) {
    const hay = norm(stripMarkdownLine(lines[i] || ""));
    if (!hay) continue;
    if (hay === needle) return i;
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

/**
 * Apply all rewrite suggestions to working resume text.
 * Handles markdown resumes, partial line matches, and novel adds.
 */
export function applyAllSuggestions(
  resumeText: string,
  suggestions: RewriteSuggestion[],
): string {
  let text = resumeText;
  const lines = () => splitResumeLines(text);

  for (const s of suggestions) {
    const from = s.current.trim();
    const to = s.suggested.trim();
    if (!to) continue;

    const isReorder =
      /reorder/i.test(s.area) ||
      /reorder/i.test(s.why || "") ||
      (from && to && norm(from) !== norm(to) && to.length > from.length * 2);

    if (isReorder && to.includes("\n") && norm(to).length > norm(text).length * 0.5) {
      text = to;
      continue;
    }

    if (from && from !== to) {
      if (text.includes(from)) {
        text = text.replace(from, to);
        continue;
      }
      const strippedFrom = stripMarkdownLine(from);
      if (strippedFrom && text.includes(strippedFrom)) {
        text = text.replace(strippedFrom, stripMarkdownLine(to) || to);
        continue;
      }
      const idx = findFuzzyLineIndex(lines(), from);
      if (idx >= 0) {
        const next = [...lines()];
        const replacement = to.includes("\n") ? to.split("\n") : [to];
        next.splice(idx, 1, ...replacement);
        text = next.join("\n");
        continue;
      }
      const fromNorm = norm(from);
      if (fromNorm.length >= 12) {
        const next = [...lines()];
        const hit = next.findIndex((l) => norm(l).includes(fromNorm));
        if (hit >= 0) {
          next[hit] = stripMarkdownLine(to) || to;
          text = next.join("\n");
          continue;
        }
      }
    }

    if (isNovelSuggestion(to, text)) {
      text = `${text.trimEnd()}\n${to}\n`;
    }
  }

  return text;
}
