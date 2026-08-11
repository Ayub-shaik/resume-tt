import type { AtsAnalysis, AtsDimension } from "@/lib/ats/analyze";
import type { TripleScores } from "@/lib/ats/keywords";

export type ScoreExplainTopic =
  | { type: "readiness" }
  | { type: "dimension"; id: string }
  | { type: "tailor"; metric: "ats" | "jd" | "overall" };

export function buildScoreExplanation(
  topic: ScoreExplainTopic,
  analysis: AtsAnalysis | null,
  tailor: TripleScores | null,
  jdPresent: boolean,
): { title: string; body: string } {
  if (topic.type === "readiness" && analysis) {
    return {
      title: `Readiness ${analysis.overallScore}/100`,
      body: [
        "Readiness is a coaching heuristic from your analyse pass (LLM + local rules) — not a validated prediction that an ATS will pass or reject you.",
        "It weighs parser clarity, role coverage, evidence, seniority fit, and section health for relative revision guidance.",
        tailor
          ? `Tailor meters use a faster local scorer: ATS ${tailor.ats}, ${
              jdPresent ? `JD ${tailor.jd}, ` : ""
            }overall ${tailor.overall}. They update live as you tailor — expect small gaps vs readiness.`
          : "Run analyse first; tailor meters appear after.",
        analysis.summary,
      ].join("\n\n"),
    };
  }

  if (topic.type === "dimension" && analysis) {
    const d = analysis.dimensions.find((x) => x.id === topic.id);
    if (!d) return { title: "Dimension", body: "No detail available." };
    const map = dimensionToTailorHint(d, analysis, tailor, jdPresent);
    return {
      title: `${d.label} · ${d.score}/100`,
      body: [d.rationale, map].filter(Boolean).join("\n\n"),
    };
  }

  if (topic.type === "tailor" && tailor) {
    if (topic.metric === "ats") {
      return {
        title: `ATS score ${tailor.ats}/100`,
        body: [
          "Local ATS format check: headings, bullets, no tables/icons, section labels.",
          `Readiness parser clarity: ${
            analysis?.dimensions.find((x) => x.id === "atsParse")?.score ?? "—"
          }/100.`,
          "Tailor ATS row optimises formatting and keyword placement without inventing facts.",
        ].join("\n"),
      };
    }
    if (topic.metric === "jd" && jdPresent) {
      return {
        title: `JD match ${tailor.jd}/100`,
        body: [
          `Keyword overlap vs job description: ${tailor.matchedKeywords.length} matched, ${tailor.missingKeywords.length} missing.`,
          `Readiness role coverage: ${
            analysis?.dimensions.find((x) => x.id === "jdCoverage")?.score ?? "—"
          }/100.`,
          analysis?.missingKeywords?.length
            ? `Gaps from analyse: ${analysis.missingKeywords.slice(0, 6).join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }
    return {
      title: `Overall ${tailor.overall}/100`,
      body: jdPresent
        ? `Blend: 40% ATS (${tailor.ats}) + 60% JD (${tailor.jd}). Readiness ${analysis?.overallScore ?? "—"} uses a deeper multi-dimension model.`
        : `No JD pasted — overall equals ATS (${tailor.ats}). Add a job description to unlock JD match.`,
    };
  }

  return { title: "Score", body: "Run analyse to see score breakdowns." };
}

function dimensionToTailorHint(
  d: AtsDimension,
  analysis: AtsAnalysis,
  tailor: TripleScores | null,
  jdPresent: boolean,
): string {
  const links: Record<string, string> = {
    atsParse: tailor ? `Feeds tailor ATS meter (${tailor.ats}).` : "",
    jdCoverage: jdPresent && tailor ? `Related to tailor JD match (${tailor.jd}).` : "",
    impact: "Evidence density — tailor rewrites bullets, not metrics.",
    seniorityFit: "Level fit from analyse; tailor stays truthful to your dates/titles.",
    completeness: "Section health — tailor keeps master section order.",
  };
  const extra = links[d.id] || "";
  const kw =
    d.id === "jdCoverage" && analysis.missingKeywords.length
      ? `Missing keywords: ${analysis.missingKeywords.slice(0, 5).join(", ")}`
      : "";
  return [extra, kw].filter(Boolean).join(" ");
}
