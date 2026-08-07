import type { TripleScores } from "./types.js";
export declare function keywordHeuristic(resumeText: string, jdOrRoleText: string): {
    matched: string[];
    missing: string[];
    pct: number;
};
/** ATS format score — resume structure only. Independent of JD. */
export declare function atsFormatHeuristic(resumeText: string): number;
/** Unified triple score used by resume-tt and job-search. */
export declare function scoreTriple(resumeText: string, jdText?: string, targetRole?: string): TripleScores;
export declare function scoreDelta(before: TripleScores, after: TripleScores): {
    ats: number;
    jd: number;
    overall: number;
};
export declare function isSaturated(before: TripleScores, after: TripleScores, minGain?: number): boolean;
export declare function selectModelTier(matchScore: number): "premium" | "standard";
export declare function deliverVersionForMatch(matchScore: number): 1 | 3;
//# sourceMappingURL=scoring.d.ts.map