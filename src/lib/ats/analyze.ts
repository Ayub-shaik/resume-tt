import { runOpenClaw } from "@/lib/runtime/openclaw";
import { ephemeralOpenClawSession } from "@/lib/runtime/sessionKey";
import { neutralizeForPrompt } from "@/lib/security/validate";
import { extractJsonObject } from "@/lib/ats/json";
import {
  atsFormatHeuristic,
  keywordHeuristic,
  isSkillSignalToken,
} from "@/lib/ats/keywords";

export type AtsDimension = {
  id: string;
  label: string;
  score: number;
  rationale: string;
};

export type AtsAnalysis = {
  overallScore: number;
  atsReadability: number;
  keywordMatchPct: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  sections: Array<{ name: string; score: number; notes: string }>;
  dimensions: AtsDimension[];
  hiringSkim: string[];
  strengths: string[];
  gaps: string[];
  rewriteSuggestions: Array<{
    area: string;
    current: string;
    suggested: string;
    why: string;
  }>;
  summary: string;
  recommendation: "strong" | "moderate" | "weak" | "rewrite";
  heuristic: {
    keywordMatchPct: number;
    matchedKeywords: string[];
    missingKeywords: string[];
  };
};

const DIMENSION_META: Array<{ id: string; label: string }> = [
  { id: "atsParse", label: "Parser clarity" },
  { id: "jdCoverage", label: "Role coverage" },
  { id: "impact", label: "Evidence density" },
  { id: "seniorityFit", label: "Level fit" },
  { id: "recency", label: "Recency" },
  { id: "completeness", label: "Section health" },
  { id: "contactHygiene", label: "Contact hygiene" },
  { id: "signalNoise", label: "Signal vs fluff" },
  { id: "editability", label: "Edit readiness" },
];

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeDimensions(
  raw: unknown,
  fallbackOverall: number,
  keywordPct: number,
  formatScore: number,
): AtsDimension[] {
  const byId = new Map<string, AtsDimension>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const id = String(rec.id || "");
      const meta = DIMENSION_META.find((m) => m.id === id);
      if (!meta) continue;
      byId.set(id, {
        id,
        label: meta.label,
        score: clamp(Number(rec.score) || fallbackOverall),
        rationale: String(rec.rationale || "").slice(0, 220),
      });
    }
  }
  return DIMENSION_META.map((m) => {
    if (byId.has(m.id)) return byId.get(m.id)!;
    const seed =
      m.id === "jdCoverage"
        ? keywordPct
        : m.id === "atsParse"
          ? formatScore
          : fallbackOverall;
    return {
      id: m.id,
      label: m.label,
      score: clamp(seed),
      rationale: "Estimated from available signals.",
    };
  });
}

export async function analyzeResumeVsJd(input: {
  resumeText: string;
  jdText: string;
  sessionKey?: string;
  signal?: AbortSignal;
}): Promise<AtsAnalysis> {
  const heuristic = keywordHeuristic(input.resumeText, input.jdText || "");
  const formatScore = atsFormatHeuristic(input.resumeText);

  try {
    const hasJd = Boolean(input.jdText.trim());
    const result = await runOpenClaw(
      [
        {
          role: "system",
          content: `You are an ATS + hiring resume analyst for MPI.
Return ONLY JSON:
{
  "overallScore": 0-100,
  "atsReadability": 0-100,
  "keywordMatchPct": 0-100,
  "matchedKeywords": ["..."],
  "missingKeywords": ["important terms truly missing — not synonyms"],
  "sections": [{"name":"Summary|Skills|Experience|Education|Other","score":0-100,"notes":"short"}],
  "dimensions": [
    {"id":"atsParse","score":0-100,"rationale":"short"},
    {"id":"jdCoverage","score":0-100,"rationale":"short"},
    {"id":"impact","score":0-100,"rationale":"short"},
    {"id":"seniorityFit","score":0-100,"rationale":"short"},
    {"id":"recency","score":0-100,"rationale":"short"},
    {"id":"completeness","score":0-100,"rationale":"short"},
    {"id":"contactHygiene","score":0-100,"rationale":"short"},
    {"id":"signalNoise","score":0-100,"rationale":"short"},
    {"id":"editability","score":0-100,"rationale":"short"}
  ],
  "hiringSkim": ["4-6 bullets: what a hiring manager notices in 20 seconds"],
  "strengths": ["..."],
  "gaps": ["actionable gaps"],
  "rewriteSuggestions": [{"area":"...","current":"short quote or paraphrase","suggested":"better phrasing","why":"..."}],
  "summary": "3-5 sentences",
  "recommendation": "strong|moderate|weak|rewrite"
}
Rules:
- Never invent employers, dates, metrics, or tools not in the resume.
- Preserve the resume's section order in rewriteSuggestions — do not suggest moving Skills before Summary unless the user asked. Prefer rewrite-in-place over reorder.
- Do NOT suggest "add" text that already appears (even paraphrased lightly) in the resume.
- Always include 5-10 concrete rewriteSuggestions (before/after) even without a JD.
- Soft keyword matching: if resume has "CI/CD", do NOT list "CI/CD pipeline" as missing.
  Treat synonyms/abbreviations as matches (k8s≈kubernetes, IaC≈Terraform when used as IaC, etc.).
- Prefer fewer, high-signal missingKeywords (core skills/tools), not every JD noun phrase.
- Without a JD: score general ATS quality; keywordMatchPct may be 0.`,
        },
        {
          role: "user",
          content: hasJd
            ? `JD:\n${neutralizeForPrompt(input.jdText)}\n\nRESUME:\n${neutralizeForPrompt(input.resumeText)}\n\nSoft heuristic keyword match ${heuristic.pct}% matched=[${heuristic.matched.slice(0, 12).join(", ")}] missing=[${heuristic.missing.slice(0, 12).join(", ")}] formatScore=${formatScore}`
            : `No JD provided. Analyze this resume for ATS quality and concrete improvements.\n\nRESUME:\n${neutralizeForPrompt(input.resumeText)}\n\nformatScore=${formatScore}`,
        },
      ],
      {
        sessionKey: input.sessionKey || ephemeralOpenClawSession("ats-analyze"),
        signal: input.signal,
      },
    );

    const parsed = extractJsonObject(result.text) as Partial<AtsAnalysis> & {
      dimensions?: unknown;
      hiringSkim?: unknown;
    };
    const overall =
      typeof parsed.overallScore === "number"
        ? parsed.overallScore
        : Math.round(heuristic.pct * 0.7 + formatScore * 0.3);

    const softMissing = (parsed.missingKeywords?.length
      ? parsed.missingKeywords
      : heuristic.missing
    )
      .map(String)
      .filter(isSkillSignalToken)
      .filter((k) => keywordHeuristic(input.resumeText, String(k)).pct < 100);

    const keywordMatchPct = clamp(
      Number(parsed.keywordMatchPct) || heuristic.pct,
    );
    const atsReadability = clamp(Number(parsed.atsReadability) || formatScore);

    return {
      overallScore: clamp(overall),
      atsReadability,
      keywordMatchPct,
      matchedKeywords: (parsed.matchedKeywords?.length
        ? parsed.matchedKeywords
        : heuristic.matched
      ).slice(0, 24),
      missingKeywords: softMissing.slice(0, 16),
      sections: Array.isArray(parsed.sections) ? parsed.sections.slice(0, 8) : [],
      dimensions: normalizeDimensions(
        parsed.dimensions,
        overall,
        keywordMatchPct,
        atsReadability,
      ),
      hiringSkim: Array.isArray(parsed.hiringSkim)
        ? parsed.hiringSkim.map(String).slice(0, 8)
        : [],
      strengths: (parsed.strengths || []).slice(0, 10),
      gaps: (parsed.gaps || []).slice(0, 12),
      rewriteSuggestions: (parsed.rewriteSuggestions || []).slice(0, 10),
      summary: String(parsed.summary || "Analysis complete."),
      recommendation:
        parsed.recommendation === "strong" ||
        parsed.recommendation === "moderate" ||
        parsed.recommendation === "weak" ||
        parsed.recommendation === "rewrite"
          ? parsed.recommendation
          : overall >= 75
            ? "strong"
            : overall >= 55
              ? "moderate"
              : "weak",
      heuristic: {
        keywordMatchPct: heuristic.pct,
        matchedKeywords: heuristic.matched.slice(0, 16),
        missingKeywords: heuristic.missing.slice(0, 16),
      },
    };
  } catch {
    const overall = Math.round(heuristic.pct * 0.65 + formatScore * 0.35);
    return {
      overallScore: overall,
      atsReadability: formatScore,
      keywordMatchPct: heuristic.pct,
      matchedKeywords: heuristic.matched.slice(0, 24),
      missingKeywords: heuristic.missing.slice(0, 24),
      sections: [],
      dimensions: normalizeDimensions(null, overall, heuristic.pct, formatScore),
      hiringSkim: [
        `Keyword coverage ~${heuristic.pct}% on a 20-second skim.`,
        heuristic.matched.length
          ? `Clear hits: ${heuristic.matched.slice(0, 5).join(", ")}.`
          : "Few obvious keyword hits — lead with role-relevant skills.",
        heuristic.missing.length
          ? `Likely gaps: ${heuristic.missing.slice(0, 5).join(", ")}.`
          : "No major keyword gaps detected by heuristic.",
        formatScore >= 70
          ? "Format looks ATS-readable (headings/bullets)."
          : "Tighten headings and bullets for faster parser clarity.",
      ],
      strengths: heuristic.matched.length
        ? [`Keyword hits include: ${heuristic.matched.slice(0, 6).join(", ")}`]
        : [],
      gaps: heuristic.missing.length
        ? [`Add evidence for: ${heuristic.missing.slice(0, 8).join(", ")}`]
        : ["Could not reach OpenClaw — showing keyword heuristic only."],
      rewriteSuggestions: [],
      summary:
        "Heuristic analysis (OpenClaw unavailable). Connect OpenClaw for section scores and rewrite suggestions.",
      recommendation:
        heuristic.pct >= 70 ? "moderate" : heuristic.pct >= 40 ? "weak" : "rewrite",
      heuristic: {
        keywordMatchPct: heuristic.pct,
        matchedKeywords: heuristic.matched.slice(0, 16),
        missingKeywords: heuristic.missing.slice(0, 16),
      },
    };
  }
}
