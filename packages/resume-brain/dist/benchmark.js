import { keywordHeuristic } from "./scoring.js";
function extractSkillsBlock(resumeText) {
    const lines = resumeText.split("\n");
    const out = [];
    let inSkills = false;
    for (const line of lines) {
        if (/^##\s+skills\b/i.test(line) || /^skills\s*$/i.test(line.trim())) {
            inSkills = true;
            continue;
        }
        if (inSkills && /^##\s+/.test(line))
            break;
        if (inSkills)
            out.push(line);
    }
    return out.join("\n").toLowerCase();
}
function sectionCompletenessScore(resumeText) {
    const lower = resumeText.toLowerCase();
    const checks = [
        /\b(summary|professional summary|profile)\b/,
        /\b(experience|employment|work history)\b/,
        /\b(education|degree|university)\b/,
        /\b(skills|technical skills|competencies)\b/,
    ];
    const hit = checks.filter((re) => re.test(lower)).length;
    return Math.round((hit / checks.length) * 100);
}
function skillsCoverageScore(resumeText, jdText) {
    if (!jdText.trim())
        return 70;
    const skills = extractSkillsBlock(resumeText);
    const corpus = skills || resumeText.toLowerCase();
    const jdTokens = [
        ...new Set((jdText.toLowerCase().match(/[a-z][a-z0-9+.#-]{2,}/g) || []).filter((t) => t.length > 2)),
    ].slice(0, 24);
    if (!jdTokens.length)
        return 70;
    const matched = jdTokens.filter((t) => corpus.includes(t));
    return Math.round((100 * matched.length) / jdTokens.length);
}
/**
 * Resume-Matcher-inspired ATS benchmark (no LLM, no Docker).
 * Weights mirror public breakdown: keyword 55%, skills 25%, sections 20%.
 */
export function resumeMatcherStyleScore(resumeText, jdText) {
    const kw = keywordHeuristic(resumeText, jdText);
    const keywordMatch = kw.pct;
    const skillsCoverage = skillsCoverageScore(resumeText, jdText);
    const sectionCompleteness = sectionCompletenessScore(resumeText);
    const score = Math.round(keywordMatch * 0.55 + skillsCoverage * 0.25 + sectionCompleteness * 0.2);
    return {
        tool: "resume-matcher-style",
        score,
        matched: kw.matched,
        missing: kw.missing,
        breakdown: { keywordMatch, skillsCoverage, sectionCompleteness },
    };
}
/** @deprecated use resumeMatcherStyleScore */
export function benchmarkScore(resumeText, jdText) {
    return resumeMatcherStyleScore(resumeText, jdText);
}
export async function fetchRemoteResumeMatcherScore(resumeText, jdText) {
    const base = (process.env.RESUME_MATCHER_BENCHMARK_URL || "").replace(/\/$/, "");
    if (!base)
        return null;
    try {
        const res = await fetch(`${base}/api/v1/scores`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                resume_text: resumeText.slice(0, 20_000),
                job_description: jdText.slice(0, 20_000),
            }),
            signal: AbortSignal.timeout(25_000),
        });
        if (!res.ok)
            return null;
        const data = (await res.json());
        const score = Number(data.score ?? data.overall_score);
        if (!Number.isFinite(score))
            return null;
        return {
            tool: "resume-matcher-api",
            score: Math.round(score),
            matched: data.matched_keywords || [],
            missing: data.missing_keywords || [],
        };
    }
    catch {
        return null;
    }
}
export async function benchmarkTriple(resumeText, jdText, internal) {
    const local = resumeMatcherStyleScore(resumeText, jdText);
    const remote = await fetchRemoteResumeMatcherScore(resumeText, jdText);
    return {
        internal,
        benchmark: remote ?? local,
        benchmarkLocal: local,
        benchmarkRemote: remote,
    };
}
//# sourceMappingURL=benchmark.js.map