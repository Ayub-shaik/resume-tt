/**
 * Soft JD↔resume keyword overlap.
 * "ci/cd" satisfies "ci/cd pipeline"; filler words and near-duplicates collapsed.
 */

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "your",
  "are",
  "this",
  "that",
  "from",
  "have",
  "will",
  "role",
  "team",
  "experience",
  "years",
  "work",
  "ability",
  "using",
  "including",
  "strong",
  "knowledge",
  "skills",
  "must",
  "should",
  "preferred",
  "required",
  "plus",
  "etc",
  "such",
  "able",
  "good",
  "deep",
  "solid",
]);

/** Phrases that count as covered if any member is present in the resume. */
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
  ["pipeline", "pipelines"], // alone is weak; paired with ci/cd via group above
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w#+./\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  const n = normalize(text);
  const multi = n.match(
    /\b(?:ci\/cd|ci-cd|cicd|infrastructure as code|amazon web services|google cloud|microsoft azure|continuous (?:integration|delivery|deployment))\b/g,
  ) || [];
  const singles = (n.match(/[a-z][a-z0-9+.#/-]{1,}/g) || []).filter(
    (t) => !STOP.has(t) && t.length > 1,
  );
  return [...multi, ...singles];
}

function coveredByResume(term: string, corpus: string): boolean {
  const t = normalize(term);
  if (!t) return true;
  if (corpus.includes(t)) return true;

  // Drop trailing generic nouns: "ci/cd pipeline" → "ci/cd"
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

  // Prefix: resume has "terraform" for JD "terraform cloud"
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
  const raw = tokenize(jdText);
  // Dedupe while preferring longer phrases
  const sorted = [...new Set(raw)].sort((a, b) => b.length - a.length);
  const uniq: string[] = [];
  for (const t of sorted) {
    if (uniq.some((u) => u.includes(t) || t.includes(u))) {
      // keep longer already in list
      continue;
    }
    uniq.push(t);
    if (uniq.length >= 36) break;
  }

  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of uniq) {
    if (coveredByResume(k, corpus)) matched.push(k);
    else missing.push(k);
  }
  const pct = uniq.length ? Math.round((100 * matched.length) / uniq.length) : 0;
  return { matched, missing, pct };
}

export function atsFormatHeuristic(resumeText: string): number {
  let score = 70;
  if (/\|.+\|/.test(resumeText)) score -= 15;
  if (/^---+$/m.test(resumeText)) score -= 10;
  if (/[✉✆🔗📍●]/.test(resumeText)) score -= 10;
  if (resumeText.split(/\n/).length < 20) score -= 10;
  if (/#{1,3}\s|^\s*[-*]\s/m.test(resumeText)) score += 10;
  if (/\b(experience|skills|education|summary)\b/i.test(resumeText)) score += 10;
  return Math.max(20, Math.min(100, score));
}

export type QuickScores = {
  overall: number;
  keywordMatchPct: number;
  atsReadability: number;
};

export function quickScores(resumeText: string, jdText: string): QuickScores {
  const kw = keywordHeuristic(resumeText, jdText);
  const ats = atsFormatHeuristic(resumeText);
  const overall = jdText.trim()
    ? Math.round(kw.pct * 0.65 + ats * 0.35)
    : Math.round(ats * 0.85);
  return {
    overall,
    keywordMatchPct: kw.pct,
    atsReadability: ats,
  };
}

export function scoreDeltas(before: QuickScores, after: QuickScores) {
  return {
    overall: after.overall - before.overall,
    keywordMatchPct: after.keywordMatchPct - before.keywordMatchPct,
    atsReadability: after.atsReadability - before.atsReadability,
  };
}
