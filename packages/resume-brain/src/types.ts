export type ImproveFocus = "ats" | "jd" | "balanced";

export type ModelTier = "premium" | "standard";

export type TripleScores = {
  ats: number;
  jd: number;
  overall: number;
  keywordMatchPct: number;
  atsReadability: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  /** Present when JD text was supplied (resume-tt compat) */
  jdAvailable?: boolean;
};

export type FactLedger = {
  years: string[];
  metrics: string[];
  employers: string[];
};

export type ResumeVersion = 1 | 2 | 3 | 4;

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMComplete = (
  messages: LLMMessage[],
  opts?: { tier?: ModelTier; sessionId?: string },
) => Promise<string>;

export type ImprovePassResult = {
  version: ResumeVersion;
  resumeMd: string;
  coverMd?: string;
  filenameStub: string;
  notes: string[];
  scores: TripleScores;
  saturated: boolean;
  modelTier: ModelTier;
};

export type ImproveChainResult = {
  masterResume: string;
  jdText: string;
  targetRole: string;
  versions: ImprovePassResult[];
  preScores: TripleScores;
  postScores: TripleScores;
  deliveredVersion: ResumeVersion;
  modelTier: ModelTier;
};

export type ImprovePassInput = {
  /** Natural-language focus from chat, e.g. "make it Azure DevOps heavy". */
  extraInstruction?: string;
  masterResume: string;
  currentResume: string;
  jdText?: string;
  targetRole?: string;
  version: ResumeVersion;
  focus?: ImproveFocus;
  matchScore: number;
  factLedger: FactLedger;
  complete: LLMComplete;
  includeCover?: boolean;
  profileJson?: unknown;
  fitScoreJson?: unknown;
};
