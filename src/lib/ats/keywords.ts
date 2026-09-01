/**
 * ATS keyword scoring — canonical implementation lives in @tomorrowtools/resume-brain.
 * This shim keeps Next.js imports stable and matches job-search-ayub scoring.
 */
export {
  scoreTriple,
  keywordHeuristic,
  atsFormatHeuristic,
  isSkillSignalToken,
  isUsableJdText,
  quickScores,
  scoreDeltas,
  scoreDelta,
} from "@tomorrowtools/resume-brain";

export type {
  ImproveFocus,
  ResumeVersion,
  TripleScores,
} from "@tomorrowtools/resume-brain";

export type QuickScores = {
  overall: number;
  keywordMatchPct: number;
  atsReadability: number;
};
