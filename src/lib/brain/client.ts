import { runOpenClaw } from "@/lib/runtime/openclaw";
import { ephemeralOpenClawSession } from "@/lib/runtime/sessionKey";
import {
  buildFactLedger,
  runImproveChain,
  runImproveMore,
  runImprovePass,
  selectModelTier,
  type ImproveFocus,
  type LLMComplete,
  type ResumeVersion,
} from "@tomorrowtools/resume-brain";

export function createResumeBrainComplete(
  matchScore: number,
  signal?: AbortSignal,
): LLMComplete {
  const tier = selectModelTier(matchScore);
  const premium =
    process.env.RESUME_BRAIN_PREMIUM_MODEL ||
    process.env.OPENCLAW_MODEL ||
    "openclaw/default";
  const standard =
    process.env.RESUME_BRAIN_STANDARD_MODEL ||
    process.env.OPENCLAW_FALLBACK_MODEL ||
    premium;

  return async (messages, opts) => {
    const useTier = opts?.tier || tier;
    const model = useTier === "premium" ? premium : standard;
    const result = await runOpenClaw(messages, {
      sessionKey:
        opts?.sessionId || ephemeralOpenClawSession(`resume-brain-${model}`),
      signal,
    });
    return result.text;
  };
}

export async function brainImproveChain(input: {
  masterResume: string;
  jdText?: string;
  targetRole?: string;
  targetVersion: ResumeVersion;
  focus?: ImproveFocus;
  matchScore: number;
  signal?: AbortSignal;
}) {
  const complete = createResumeBrainComplete(input.matchScore, input.signal);
  return runImproveChain({
    masterResume: input.masterResume,
    jdText: input.jdText || "",
    targetRole: input.targetRole || "",
    targetVersion: input.targetVersion,
    focus: input.focus || "balanced",
    matchScore: input.matchScore,
    complete,
    includeCoverOnFinal: false,
  });
}

export async function brainImprovePass(input: {
  masterResume: string;
  currentResume: string;
  jdText?: string;
  targetRole?: string;
  version: ResumeVersion;
  focus?: ImproveFocus;
  matchScore: number;
  signal?: AbortSignal;
}) {
  const complete = createResumeBrainComplete(input.matchScore, input.signal);
  return runImprovePass({
    ...input,
    factLedger: buildFactLedger(input.masterResume),
    complete,
  });
}

export async function brainImproveMore(input: {
  masterResume: string;
  currentResume: string;
  currentVersion: ResumeVersion;
  jdText?: string;
  targetRole?: string;
  matchScore: number;
  focus?: ImproveFocus;
  signal?: AbortSignal;
}) {
  const complete = createResumeBrainComplete(input.matchScore, input.signal);
  return runImproveMore({
    ...input,
    complete,
  });
}

export { selectModelTier };
export type { ImproveFocus, ResumeVersion };
