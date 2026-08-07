import { keywordHeuristic } from "./scoring.js";
import type { TripleScores } from "./types.js";

/**
 * Lightweight OSS-style benchmark (token overlap — Resume-Matcher-like).
 * Reference line only; primary UX uses scoreTriple().
 */
export function benchmarkScore(
  resumeText: string,
  jdText: string,
): { tool: string; score: number; matched: string[]; missing: string[] } {
  const kw = keywordHeuristic(resumeText, jdText);
  // Slightly stricter weighting for benchmark display
  const score = Math.round(kw.pct * 0.9);
  return {
    tool: "keyword-overlap-benchmark",
    score,
    matched: kw.matched,
    missing: kw.missing,
  };
}

export function benchmarkTriple(
  resumeText: string,
  jdText: string,
  internal: TripleScores,
) {
  const bench = benchmarkScore(resumeText, jdText);
  return {
    internal,
    benchmark: bench,
  };
}
