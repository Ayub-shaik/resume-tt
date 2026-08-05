export type InterviewStatus = "setup" | "ready" | "active" | "completed";
export type QuestionType = "chat" | "code";
export type AnswerMode = "voice" | "text" | "mixed";
export type AiRuntimeUsed = "cursor" | "openclaw";
export type RuntimePreference = "auto" | "cursor" | "openclaw";

export type RatingLabel =
  | "Excellent"
  | "Strong"
  | "Good"
  | "Average"
  | "Weak"
  | "Poor";

export type FollowUp = {
  question: string;
  modelAnswer: string;
};

export type EvalDimensionScore = {
  name: string;
  score: number;
  note?: string;
};

/** Persisted on evaluation / review for Phase 1+ dashboards */
export type EvalV1 = {
  version: "v1";
  dimensions: EvalDimensionScore[];
  evidence?: string[];
  nextPracticeTarget?: string;
};

export type Evaluation = {
  score: number;
  rating: RatingLabel;
  strengths: string[];
  weaknesses: string[];
  whatWentWrong: string;
  howToImprove: string;
  enterpriseImprovements: string[];
  seniorAnswer: string;
  resumeJdAlignment: string;
  traps: string[];
  evalV1?: EvalV1;
};

export type Resume = {
  id: string;
  name: string;
  content: string;
  userId: string | null;
  createdAt: string;
  scoreJson?: ResumeScore | null;
};

export type ResumeScore = {
  overall: number;
  jdCoveragePct: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  improvements: string[];
  improvedResume?: string;
  scoredAt: string;
};

export type Interview = {
  id: string;
  name: string;
  resumeId: string | null;
  resumeText: string;
  jdText: string;
  jdUrl: string;
  experienceNotes: string;
  contextFingerprint: string | null;
  parentInterviewId: string | null;
  runtimePreference: RuntimePreference;
  status: InterviewStatus;
  interviewerRole: string | null;
  finalScore: number | null;
  finalSummary: string | null;
  runtimeUsed: AiRuntimeUsed | null;
  cursorAgentId: string | null;
  userId: string | null;
  interviewerPersona?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CoachAskMessage = {
  role: "user" | "assistant";
  content: string;
};

export type CoachAsk = {
  id: string;
  turnId: string;
  interviewId: string;
  field: "howToImprove" | "enterpriseImprovements";
  itemIndex: number | null;
  messages: CoachAskMessage[];
  createdAt: string;
};

export type Turn = {
  id: string;
  interviewId: string;
  sequence: number;
  question: string;
  questionType: QuestionType;
  codePrompt: string | null;
  answer: string | null;
  answerMode: AnswerMode | null;
  codeAnswer: string | null;
  evaluation: Evaluation | null;
  recommendedNext: string | null;
  followUps: FollowUp[];
  createdAt: string;
};

export type ReviewPack = {
  id: string;
  interviewId: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  followUpBank: FollowUp[];
  dimensionScores?: EvalDimensionScore[];
  nextPracticeTarget?: string | null;
  createdAt: string;
};

export type InterviewerPayload = {
  action: "ask" | "evaluate" | "final" | "role";
  interviewerRole?: string;
  speak?: string;
  question?: string;
  questionType?: QuestionType;
  codePrompt?: string | null;
  evaluation?: Evaluation;
  /** Other follow-ups (not the one being asked next) */
  followUps?: FollowUp[];
  /** Best next question to ask in the live interview */
  recommendedNext?: string;
  nextQuestion?: string;
  nextQuestionType?: QuestionType;
  nextCodePrompt?: string | null;
  finalScore?: number;
  finalSummary?: string;
  reviewStrengths?: string[];
  reviewGaps?: string[];
  dimensionScores?: EvalDimensionScore[];
  nextPracticeTarget?: string;
  interviewComplete?: boolean;
};
