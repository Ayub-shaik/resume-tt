import { buildFactLedger, validateFacts } from "./facts.js";
import { extractJsonObject } from "./json.js";
import { neutralizeForPrompt, tailorSystemPrompt } from "./prompts.js";
import { sanitizeAtsMarkdown, normalizeCoverLetterMarkdown } from "./sanitize.js";
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
  const coverRaw = String(raw.cover_md || "");
  return {
    resumeMd,
    coverMd: coverRaw.trim() ? normalizeCoverLetterMarkdown(coverRaw) : "",
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
    extraInstruction = "",
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

  if (extraInstruction.trim()) {
    userParts.push(
      "",
      "USER FOCUS (mandatory — stay within FACT LEDGER / master facts):",
      neutralizeForPrompt(extraInstruction, 2000),
      "",
      "SECTION CHECKLIST for this focus (all required when a stack is emphasized):",
      "- Headline/title line: emphasized stack first if present in facts; not the competing stack.",
      "- Professional summary: open with emphasized stack; competing stack secondary.",
      "- Skills: emphasized stack before competing clouds/tools.",
      "- Experience: reorder bullets so emphasized-stack work appears earlier in each relevant role; do not leave it as a trailing 'also supports X' bullet while AWS/other leads.",
      "- notes[] must list which sections you reweighted (headline, summary, skills, experience).",
    );
  }

  if (profileJson) {
    userParts.push("", "PROFILE JSON:", JSON.stringify(profileJson));
  }
  if (fitScoreJson) {
    userParts.push("", "FIT SCORE JSON:", JSON.stringify(fitScoreJson));
  }
  if (includeCover) {
    userParts.push(
      "",
      "Include a one-page cover_md in the JSON response.",
      "COVER LETTER RULES:",
      "- Use real paragraph breaks (blank lines). Do NOT emit literal \\\\n or \\\\n\\\\n text — only actual newlines in cover_md.",
      "- Professional grammar and spacing; never glue words together.",
      "- Never duplicate acronym fragments (write AWS, not AWAWS) or name fragments (Ayub Shaik, not AyAyub).",
      "- Structure: salutation, 3–4 body paragraphs, closing, signature (name + email + phone).",
    );
  }

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system" as const, content: tailorSystemPrompt(version, focus) },
    { role: "user" as const, content: userParts.join("\n") },
  ];

  let lastErr: unknown;
  let parsed: ReturnType<typeof parseTailorResponse> | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const text = await complete(messages, {
        tier,
        sessionId: `resume-brain-v${version}-${focus}`,
      });
      if (!String(text || "").trim()) {
        throw new Error("Empty model response");
      }
      const raw = extractJsonObject(text);
      const candidate = parseTailorResponse(raw);
      const validation = validateFacts(masterResume, candidate.resumeMd, factLedger);
      if (!validation.ok && attempt < 2) {
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
      const msg = err instanceof Error ? err.message : String(err);
      if (
        attempt < 2 &&
        /No JSON object|Empty model|JSON|Unexpected token/i.test(msg)
      ) {
        messages.push({
          role: "user",
          content:
            "Your last reply was not valid JSON. Reply with ONLY one JSON object (no markdown fences, no commentary) with keys resume_md, cover_md, filename_stub, notes. resume_md must be the full CV.",
        });
        continue;
      }
    }
  }

  if (!parsed) {
    throw lastErr instanceof Error ? lastErr : new Error("Improve failed");
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
  extraInstruction?: string;
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
    extraInstruction: input.extraInstruction,
  });
}
