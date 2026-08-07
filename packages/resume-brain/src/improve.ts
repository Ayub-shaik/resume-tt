import { buildFactLedger, validateFacts } from "./facts.js";
import { extractJsonObject } from "./json.js";
import { neutralizeForPrompt, tailorSystemPrompt } from "./prompts.js";
import { sanitizeAtsMarkdown } from "./sanitize.js";
import {
  isSaturated,
  scoreTriple,
  selectModelTier,
} from "./scoring.js";
import type {
  ImproveChainResult,
  ImprovePassInput,
  ImprovePassResult,
  LLMComplete,
  ResumeVersion,
} from "./types.js";

function parseTailorResponse(raw: Record<string, unknown>) {
  const resumeMd = sanitizeAtsMarkdown(String(raw.resume_md || ""));
  if (!resumeMd.trim()) throw new Error("Tailor returned empty resume");
  return {
    resumeMd,
    coverMd: sanitizeAtsMarkdown(String(raw.cover_md || "")),
    filenameStub: String(raw.filename_stub || "ATS_Resume").replace(/[^\w.-]+/g, "_"),
    notes: Array.isArray(raw.notes) ? raw.notes.slice(0, 12).map(String) : [],
  };
}

export async function runImprovePass(input: ImprovePassInput): Promise<ImprovePassResult> {
  const {
    masterResume,
    currentResume,
    jdText = "",
    targetRole = "",
    version,
    focus = "balanced",
    matchScore,
    factLedger,
    complete,
    includeCover = false,
    profileJson,
    fitScoreJson,
  } = input;

  const tier = selectModelTier(matchScore);
  const jdBlock = jdText.trim()
    ? `JD:\n${neutralizeForPrompt(jdText)}`
    : targetRole.trim()
      ? `TARGET ROLE (no JD): ${neutralizeForPrompt(targetRole, 500)}`
      : "No JD — make ATS-general improvements only.";

  const userParts = [
    jdBlock,
    "",
    "FACT LEDGER (do not contradict):",
    JSON.stringify(factLedger),
    "",
    "MASTER RESUME:",
    neutralizeForPrompt(masterResume),
    "",
    "CURRENT DRAFT TO IMPROVE:",
    neutralizeForPrompt(currentResume),
  ];

  if (profileJson) {
    userParts.push("", "PROFILE JSON:", JSON.stringify(profileJson));
  }
  if (fitScoreJson) {
    userParts.push("", "FIT SCORE JSON:", JSON.stringify(fitScoreJson));
  }
  if (includeCover) {
    userParts.push("", "Include a one-page cover_md in the JSON response.");
  }

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system" as const, content: tailorSystemPrompt(version, focus) },
    { role: "user" as const, content: userParts.join("\n") },
  ];

  let lastErr: unknown;
  let parsed: ReturnType<typeof parseTailorResponse> | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await complete(messages, {
        tier,
        sessionId: `resume-brain-v${version}-${focus}`,
      });
      const raw = extractJsonObject(text);
      const candidate = parseTailorResponse(raw);
      const validation = validateFacts(masterResume, candidate.resumeMd, factLedger);
      if (!validation.ok && attempt === 0) {
        messages.push({
          role: "user",
          content: `REJECTED — fix violations without inventing facts:\n${validation.violations.join("\n")}\n\nReturn corrected JSON only.`,
        });
        continue;
      }
      parsed = candidate;
      break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (!parsed) {
    throw lastErr instanceof Error ? lastErr : new Error("Improve pass failed");
  }

  const before = scoreTriple(currentResume, jdText, targetRole);
  const scores = scoreTriple(parsed.resumeMd, jdText, targetRole);

  return {
    version,
    resumeMd: parsed.resumeMd,
    coverMd: includeCover ? parsed.coverMd : undefined,
    filenameStub: parsed.filenameStub,
    notes: parsed.notes,
    scores,
    saturated: isSaturated(before, scores),
    modelTier: tier,
  };
}

export async function runImproveChain(input: {
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
}): Promise<ImproveChainResult> {
  const jdText = input.jdText || "";
  const targetRole = input.targetRole || "";
  const factLedger = buildFactLedger(input.masterResume);
  const preScores = scoreTriple(input.masterResume, jdText, targetRole);
  const versions: ImprovePassResult[] = [];
  let current = input.masterResume;

  for (let v = 1 as ResumeVersion; v <= input.targetVersion; v = (v + 1) as ResumeVersion) {
    const pass = await runImprovePass({
      masterResume: input.masterResume,
      currentResume: current,
      jdText,
      targetRole,
      version: v,
      focus: input.focus ?? "balanced",
      matchScore: input.matchScore,
      factLedger,
      complete: input.complete,
      includeCover: Boolean(input.includeCoverOnFinal && v === input.targetVersion),
      profileJson: input.profileJson,
      fitScoreJson: input.fitScoreJson,
    });
    versions.push(pass);
    current = pass.resumeMd;
    if (pass.saturated && v < input.targetVersion) {
      // Still continue to requested version but mark saturation on last
    }
  }

  const last = versions[versions.length - 1];
  return {
    masterResume: input.masterResume,
    jdText,
    targetRole,
    versions,
    preScores,
    postScores: last?.scores ?? preScores,
    deliveredVersion: input.targetVersion,
    modelTier: selectModelTier(input.matchScore),
  };
}

export async function runImproveMore(input: {
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
}): Promise<ImprovePassResult> {
  const next = Math.min(4, input.currentVersion + 1) as ResumeVersion;
  if (next === input.currentVersion) {
    throw new Error("Already at max version (v4)");
  }
  const factLedger = buildFactLedger(input.masterResume);
  return runImprovePass({
    masterResume: input.masterResume,
    currentResume: input.currentResume,
    jdText: input.jdText,
    targetRole: input.targetRole,
    version: next,
    focus: input.focus ?? "balanced",
    matchScore: input.matchScore,
    factLedger,
    complete: input.complete,
    includeCover: false,
    profileJson: input.profileJson,
    fitScoreJson: input.fitScoreJson,
  });
}
