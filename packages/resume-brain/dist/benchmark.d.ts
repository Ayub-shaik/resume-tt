import type { TripleScores } from "./types.js";
export type BenchmarkResult = {
    tool: string;
    score: number;
    matched: string[];
    missing: string[];
    breakdown?: {
        keywordMatch: number;
        skillsCoverage: number;
        sectionCompleteness: number;
    };
};
/**
 * Resume-Matcher-inspired ATS benchmark (no LLM, no Docker).
 * Weights mirror public breakdown: keyword 55%, skills 25%, sections 20%.
 */
export declare function resumeMatcherStyleScore(resumeText: string, jdText: string): BenchmarkResult;
/** @deprecated use resumeMatcherStyleScore */
export declare function benchmarkScore(resumeText: string, jdText: string): BenchmarkResult;
export declare function fetchRemoteResumeMatcherScore(resumeText: string, jdText: string): Promise<BenchmarkResult | null>;
export declare function benchmarkTriple(resumeText: string, jdText: string, internal: TripleScores): Promise<{
    internal: TripleScores;
    benchmark: BenchmarkResult;
    benchmarkLocal: BenchmarkResult;
    benchmarkRemote: BenchmarkResult | null;
}>;
//# sourceMappingURL=benchmark.d.ts.map