import type { ImproveChainResult, ImprovePassInput, ImprovePassResult, LLMComplete, ResumeVersion } from "./types.js";
export declare function runImprovePass(input: ImprovePassInput): Promise<ImprovePassResult>;
export declare function runImproveChain(input: {
    masterResume: string;
    jdText?: string;
    targetRole?: string;
    targetVersion: ResumeVersion;
    focus?: ImprovePassInput["focus"];
    matchScore: number;
    complete: LLMComplete;
    includeCoverOnFinal?: boolean;
    profileJson?: unknown;
    fitScoreJson?: unknown;
}): Promise<ImproveChainResult>;
export declare function runImproveMore(input: {
    masterResume: string;
    currentResume: string;
    currentVersion: ResumeVersion;
    jdText?: string;
    targetRole?: string;
    matchScore: number;
    complete: LLMComplete;
    focus?: ImprovePassInput["focus"];
    profileJson?: unknown;
    fitScoreJson?: unknown;
}): Promise<ImprovePassResult>;
//# sourceMappingURL=improve.d.ts.map