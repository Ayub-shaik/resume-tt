/**
 * Compatibility shim — mirrors @tomorrowtools/resume-brain scoring (kept local for client bundle).
 */

const STOP = new Set([
  "the", "and", "for", "with", "you", "your", "are", "this", "that", "from",
  "have", "will", "role", "team", "experience", "years", "work", "ability",
  "using", "including", "strong", "knowledge", "skills", "must", "should",
  "preferred", "required", "plus", "etc", "such", "able", "good", "deep", "solid",
  "engineer", "engineering", // too generic alone for JD match
  "business", "analyst", "analysis", "manager", "senior", "junior",
]);

const EQUIV: string[][] = [
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
  ["finops", "cloud cost", "cost optimization", "cost management"],
];

/** When JD/role text is short, expand domain tokens so scores are not 100% on 2 words. */
const ROLE_PACKS: Array<{ match: RegExp; terms: string[] }> = [
  {
    match: /\bfinops\b/i,
    terms: [
      "finops",
      "cloud cost optimization",
      "cost allocation",
      "showback",
      "chargeback",
      "tagging strategy",
      "cost explorer",
      "CUR",
      "budgeting",
      "forecasting",
      "unit cost",
      "waste reduction",
      "rightsizing",
    ],
  },
  {
    match: /\bmlops\b/i,
    terms: [
      "mlops",
      "model deployment",
      "feature store",
      "model monitoring",
      "experiment tracking",
      "ML pipeline",
      "training infrastructure",
      "inference",
    ],
  },
  {
    match: /\bdevops\b|\bsre\b/i,
    terms: [
      "devops",
      "kubernetes",
      "terraform",
      "ci/cd",
      "observability",
      "incident response",
      "aws",
    ],
  },
  {
    match: /\bbusiness\s*analyst\b|\bba\b|\banalyst\b/i,
    terms: [
      "business analysis",
      "requirements gathering",
      "stakeholder management",
      "user stories",
      "process mapping",
      "gap analysis",
      "BRD",
      "FRD",
      "use cases",
      "UAT",
      "acceptance criteria",
      "Jira",
      "Confluence",
      "data analysis",
      "SQL",
      "dashboards",
      "KPIs",
      "workshop facilitation",
      "as-is to-be",
      "functional specifications",
    ],
  },
  {
    match: /\bproduct\s*manager\b|\bpm\b/i,
    terms: [
      "product roadmap",
      "backlog prioritization",
      "user research",
      "OKRs",
      "stakeholder alignment",
      "go-to-market",
      "A/B testing",
      "metrics",
    ],
  },
  {
    match: /\bdata\s*analyst\b|\bdata\s*scientist\b/i,
    terms: [
      "SQL",
      "Python",
      "dashboards",
      "ETL",
      "statistics",
      "visualization",
      "A/B testing",
      "data quality",
      "Power BI",
      "Tableau",
    ],
  },
];

const EMPTY_JD_RE =
  /^(n\/?a|n\.?a\.?|nil+|null|none|nothing|nope|no|idk|tbd|todo|test+|asdf+|qwer+|xxx+|unknown|skip|blank|empty|gibberish|dadab\w*|i\s*don'?t\s*know|dont\s*know|do\s*not\s*know|no\s*idea|not\s*sure|whatever)$/i;

/** False for empty / placeholder / gibberish JD — hide JD & Overall scoring. */
export function isUsableJdText(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (t.length < 3) return false;
  if (EMPTY_JD_RE.test(t)) return false;
  const letters = (t.match(/[a-zA-Z]/g) || []).length;
  if (letters < 3) return false;
  if (letters / t.length < 0.35 && t.length < 40) return false;
  // Mostly repeated characters
  if (/^(.)\1{4,}$/.test(t.replace(/\s/g, ""))) return false;
  return true;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w#+./\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  const n = normalize(text);
  const multi =
    n.match(
      /\b(?:ci\/cd|ci-cd|cicd|infrastructure as code|amazon web services|google cloud|microsoft azure|continuous (?:integration|delivery|deployment)|cloud cost optimization|cost allocation|tagging strategy|unit cost)\b/g,
    ) || [];
  const singles = (n.match(/[a-z][a-z0-9+.#/-]{1,}/g) || []).filter(
    (t) => !STOP.has(t) && t.length > 1,
  );
  return [...multi, ...singles];
}

function expandJdTerms(jdText: string): string[] {
  const base = tokenize(jdText);
  const extra: string[] = [];
  for (const pack of ROLE_PACKS) {
    if (pack.match.test(jdText)) {
      extra.push(...pack.terms);
    }
  }
  // Short JD / role-only → always try packs; if still thin, keep tokens as-is
  if (jdText.trim().length < 220) {
    for (const pack of ROLE_PACKS) {
      if (pack.match.test(jdText)) extra.push(...pack.terms);
    }
  }
  return [...base, ...extra];
}

function coveredByResume(term: string, corpus: string): boolean {
  const t = normalize(term);
  if (!t) return true;
  if (corpus.includes(t)) return true;
  const stripped = t
    .replace(/\b(pipelines?|systems?|tools?|platforms?|solutions?|services?|environments?)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped && stripped !== t && corpus.includes(stripped)) return true;
  for (const group of EQUIV) {
    if (group.some((g) => t.includes(g) || g.includes(t))) {
      if (group.some((g) => corpus.includes(g))) return true;
    }
  }
  const parts = t.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    const head = parts.slice(0, -1).join(" ");
    if (head.length >= 3 && corpus.includes(head)) return true;
  }
  return false;
}

export function keywordHeuristic(resumeText: string, jdText: string) {
  if (!jdText.trim()) {
    return { matched: [] as string[], missing: [] as string[], pct: 0 };
  }
  const corpus = normalize(resumeText);
  const raw = expandJdTerms(jdText);
  const sorted = [...new Set(raw.map(normalize).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  const uniq: string[] = [];
  for (const t of sorted) {
    if (uniq.some((u) => u.includes(t) || t.includes(u))) continue;
    uniq.push(t);
    if (uniq.length >= 36) break;
  }
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of uniq) {
    if (coveredByResume(k, corpus)) matched.push(k);
    else missing.push(k);
  }
  let pct = uniq.length ? Math.round((100 * matched.length) / uniq.length) : 0;
  // Never treat a 1–2 token role phrase as perfect coverage
  if (uniq.length < 5) {
    pct = Math.min(pct, 55 + matched.length * 8);
  }
  return { matched, missing, pct: Math.max(0, Math.min(100, pct)) };
}

/**
 * ATS format score — resume structure only. Must NOT depend on JD/role.
 * Pipe characters in a title line are common and should not tank the score.
 */
export function atsFormatHeuristic(resumeText: string): number {
  let score = 72;
  const pipeCount = (resumeText.match(/\|/g) || []).length;
  // Only penalize table-like multi-column rows, not "Role | Skills" titles
  if (pipeCount >= 8 || (/^\s*\|.+\|.+\|/m.test(resumeText) && pipeCount >= 4)) {
    score -= 12;
  }
  if (/^---+$/m.test(resumeText)) score -= 10;
  if (/[✉✆🔗📍●]/.test(resumeText)) score -= 10;
  if (resumeText.split(/\n/).length < 20) score -= 10;
  if (/#{1,3}\s|^\s*[-*]\s/m.test(resumeText)) score += 12;
  if (/\b(experience|skills|education|summary)\b/i.test(resumeText)) score += 10;
  if (/\b(email|@|linkedin|phone|\+?\d{10,})\b/i.test(resumeText)) score += 4;
  return Math.max(20, Math.min(100, score));
}

export type QuickScores = {
  overall: number;
  keywordMatchPct: number;
  atsReadability: number;
};

export type ImproveFocus = "ats" | "jd" | "balanced";
export type ResumeVersion = 1 | 2 | 3 | 4;

export type TripleScores = QuickScores & {
  ats: number;
  /** 0 when no JD/role — use jdAvailable before displaying */
  jd: number;
  jdAvailable: boolean;
  matchedKeywords: string[];
  missingKeywords: string[];
};

export function scoreTriple(
  resumeText: string,
  jdText = "",
  targetRole = "",
): TripleScores {
  const hasJd = Boolean(jdText.trim() || targetRole.trim());
  const jdSource = jdText.trim() || targetRole.trim();
  const kw = keywordHeuristic(resumeText, jdSource);
  const ats = atsFormatHeuristic(resumeText);
  const jd = hasJd ? kw.pct : 0;
  const overall = hasJd
    ? Math.round(ats * 0.4 + jd * 0.6)
    : ats;
  return {
    ats,
    jd,
    jdAvailable: hasJd,
    overall,
    keywordMatchPct: hasJd ? kw.pct : 0,
    atsReadability: ats,
    matchedKeywords: kw.matched,
    missingKeywords: kw.missing,
  };
}

export function quickScores(resumeText: string, jdText: string): QuickScores {
  const t = scoreTriple(resumeText, jdText);
  return {
    overall: t.overall,
    keywordMatchPct: t.keywordMatchPct,
    atsReadability: t.atsReadability,
  };
}

export function scoreDeltas(before: QuickScores, after: QuickScores) {
  return {
    overall: after.overall - before.overall,
    keywordMatchPct: after.keywordMatchPct - before.keywordMatchPct,
    atsReadability: after.atsReadability - before.atsReadability,
  };
}
