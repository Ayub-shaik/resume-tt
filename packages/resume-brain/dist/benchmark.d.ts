import type { TripleScores } from "./types.js";
/**
 * Lightweight OSS-style benchmark (token overlap — Resume-Matcher-like).
 * Reference line only; primary UX uses scoreTriple().
 */
export declare function benchmarkScore(resumeText: string, jdText: string): {
    tool: string;
    score: number;
    matched: string[];
    missing: string[];
};
export declare function benchmarkTriple(resumeText: string, jdText: string, internal: TripleScores): {
    internal: TripleScores;
    benchmark: {
        tool: string;
        score: number;
        matched: string[];
        missing: string[];
    };
};
//# sourceMappingURL=benchmark.d.ts.map