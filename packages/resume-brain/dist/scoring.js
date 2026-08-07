const STOP = new Set([
    "the", "and", "for", "with", "you", "your", "are", "this", "that", "from",
    "have", "will", "role", "team", "experience", "years", "work", "ability",
    "using", "including", "strong", "knowledge", "skills", "must", "should",
    "preferred", "required", "plus", "etc", "such", "able", "good", "deep", "solid",
]);
const EQUIV = [
    ["ci/cd", "cicd", "ci-cd", "continuous integration", "continuous delivery", "continuous deployment"],
    ["kubernetes", "k8s"],
    ["infrastructure as code", "iac", "terraform", "pulumi"],
    ["monitoring", "observability", "prometheus", "grafana", "datadog"],
    ["aws", "amazon web services"],
    ["azure", "microsoft azure"],
    ["gcp", "google cloud"],
    ["devops", "dev ops", "sre", "platform engineering"],
    ["docker", "containers", "containerization"],
    ["angular", "angularjs"],
    ["react", "reactjs", "react.js"],
    ["pipeline", "pipelines"],
];
function normalize(s) {
    return s
        .toLowerCase()
        .replace(/[^\w#+./\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function tokenize(text) {
    const n = normalize(text);
    const multi = n.match(/\b(?:ci\/cd|ci-cd|cicd|infrastructure as code|amazon web services|google cloud|microsoft azure|continuous (?:integration|delivery|deployment))\b/g) || [];
    const singles = (n.match(/[a-z][a-z0-9+.#/-]{1,}/g) || []).filter((t) => !STOP.has(t) && t.length > 1);
    return [...multi, ...singles];
}
function coveredByResume(term, corpus) {
    const t = normalize(term);
    if (!t)
        return true;
    if (corpus.includes(t))
        return true;
    const stripped = t
        .replace(/\b(pipelines?|systems?|tools?|platforms?|solutions?|services?|environments?)\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (stripped && stripped !== t && corpus.includes(stripped))
        return true;
    for (const group of EQUIV) {
        if (group.some((g) => t.includes(g) || g.includes(t))) {
            if (group.some((g) => corpus.includes(g)))
                return true;
        }
    }
    const parts = t.split(" ").filter(Boolean);
    if (parts.length >= 2) {
        const head = parts.slice(0, -1).join(" ");
        if (head.length >= 3 && corpus.includes(head))
            return true;
    }
    return false;
}
export function keywordHeuristic(resumeText, jdOrRoleText) {
    if (!jdOrRoleText.trim()) {
        return { matched: [], missing: [], pct: 0 };
    }
    const corpus = normalize(resumeText);
    const raw = tokenize(jdOrRoleText);
    const sorted = [...new Set(raw)].sort((a, b) => b.length - a.length);
    const uniq = [];
    for (const t of sorted) {
        if (uniq.some((u) => u.includes(t) || t.includes(u)))
            continue;
        uniq.push(t);
        if (uniq.length >= 36)
            break;
    }
    const matched = [];
    const missing = [];
    for (const k of uniq) {
        if (coveredByResume(k, corpus))
            matched.push(k);
        else
            missing.push(k);
    }
    const pct = uniq.length ? Math.round((100 * matched.length) / uniq.length) : 0;
    return { matched, missing, pct };
}
export function atsFormatHeuristic(resumeText) {
    let score = 70;
    if (/\|.+\|/.test(resumeText))
        score -= 15;
    if (/^---+$/m.test(resumeText))
        score -= 10;
    if (/[✉✆🔗📍●]/.test(resumeText))
        score -= 10;
    if (resumeText.split(/\n/).length < 20)
        score -= 10;
    if (/#{1,3}\s|^\s*[-*]\s/m.test(resumeText))
        score += 10;
    if (/\b(experience|skills|education|summary)\b/i.test(resumeText))
        score += 10;
    return Math.max(20, Math.min(100, score));
}
/** Unified triple score used by resume-tt and job-search. */
export function scoreTriple(resumeText, jdText = "", targetRole = "") {
    const jdSource = jdText.trim() || targetRole.trim();
    const kw = keywordHeuristic(resumeText, jdSource);
    const ats = atsFormatHeuristic(resumeText);
    const jd = jdSource ? kw.pct : Math.round(ats * 0.75);
    const overall = jdSource
        ? Math.round(ats * 0.4 + jd * 0.6)
        : Math.round(ats * 0.85);
    return {
        ats,
        jd,
        overall,
        keywordMatchPct: kw.pct,
        atsReadability: ats,
        matchedKeywords: kw.matched,
        missingKeywords: kw.missing,
    };
}
export function scoreDelta(before, after) {
    return {
        ats: after.ats - before.ats,
        jd: after.jd - before.jd,
        overall: after.overall - before.overall,
    };
}
export function isSaturated(before, after, minGain = 2) {
    const d = scoreDelta(before, after);
    return d.ats < minGain && d.jd < minGain && d.overall < minGain;
}
export function selectModelTier(matchScore) {
    return matchScore >= 65 ? "premium" : "standard";
}
export function deliverVersionForMatch(matchScore) {
    return matchScore >= 75 ? 3 : 1;
}
//# sourceMappingURL=scoring.js.map