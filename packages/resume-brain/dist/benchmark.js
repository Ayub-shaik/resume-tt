import { keywordHeuristic } from "./scoring.js";
/**
 * Lightweight OSS-style benchmark (token overlap — Resume-Matcher-like).
 * Reference line only; primary UX uses scoreTriple().
 */
export function benchmarkScore(resumeText, jdText) {
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
export function benchmarkTriple(resumeText, jdText, internal) {
    const bench = benchmarkScore(resumeText, jdText);
    return {
        internal,
        benchmark: bench,
    };
}
//# sourceMappingURL=benchmark.js.map