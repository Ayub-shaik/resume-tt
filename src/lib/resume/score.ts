import { runInterviewModel } from "@/lib/runtime";
import type { ResumeScore, RuntimePreference } from "@/lib/types";
import { neutralizeForPrompt } from "@/lib/security/validate";
import { keywordHeuristic } from "@/lib/ats/keywords";

export async function scoreResumeAgainstJd(input: {
  resumeText: string;
  jdText: string;
  /** @deprecated MPI no longer rewrites resumes in-studio */
  improve?: boolean;
  runtimePreference?: RuntimePreference;
  interviewId: string;
}): Promise<ResumeScore> {
  if (!input.resumeText.trim()) {
    throw new Error("Resume text is empty — save a resume first.");
  }
  if (!input.jdText.trim()) {
    throw new Error(
      "Paste a job description first — scoring needs a JD to compare against.",
    );
  }

  const heuristic = keywordHeuristic(input.resumeText, input.jdText);

  const result = await runInterviewModel({
    interviewId: input.interviewId,
    runtimePreference: input.runtimePreference || "openclaw",
    messages: [
      {
        role: "system",
        content: `You are a resume coach for interview prep. Return ONLY JSON:
{
  "action":"final",
  "finalScore": 0-10,
  "finalSummary": "short overall fit for this JD",
  "reviewStrengths": ["..."],
  "reviewGaps": ["concrete improvement bullets — no full resume rewrite"],
  "question": ""
}
Do NOT rewrite the full resume. Scoring + gaps only.
Soft match: "CI/CD" covers "CI/CD pipeline"; don't nag synonyms.`,
      },
      {
        role: "user",
        content: `JD:\n${neutralizeForPrompt(input.jdText)}
RESUME:\n${neutralizeForPrompt(input.resumeText)}
Soft keyword coverage ${heuristic.pct}% matched=[${heuristic.matched.slice(0, 10).join(", ")}] missing=[${heuristic.missing.slice(0, 10).join(", ")}]
Score fit for this JD. List gaps only — do not rewrite the resume body.`,
      },
    ],
  });

  if (!result.payload || result.payload.finalScore == null) {
    throw new Error(
      "OpenClaw returned no score. Check that OpenClaw is running, then try again.",
    );
  }

  return {
    overall: result.payload.finalScore,
    jdCoveragePct: heuristic.pct,
    matchedKeywords: heuristic.matched.slice(0, 16),
    missingKeywords: heuristic.missing.slice(0, 12),
    improvements: [
      ...(result.payload.reviewGaps || []),
      ...(result.payload.reviewStrengths || []).map((s) => `Keep: ${s}`),
    ].slice(0, 12),
    improvedResume: undefined,
    scoredAt: new Date().toISOString(),
  };
}
