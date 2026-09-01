import type { TripleScores } from "./types.js";

const STOP = new Set([
  "the", "and", "for", "with", "you", "your", "are", "this", "that", "from",
  "have", "will", "role", "team", "experience", "years", "work", "ability",
  "using", "including", "strong", "knowledge", "skills", "must", "should",
  "preferred", "required", "plus", "etc", "such", "able", "good", "deep", "solid",
  "engineer", "engineering",
  "business", "analyst", "analysis", "manager", "senior", "junior",
  "about", "job", "purpose", "join", "invite", "apply", "play", "crucial",
  "shaping", "future", "initiatives", "group", "world", "worlds", "largest",
  "international", "airline", "vital", "part", "cutting", "edge", "information",
  "technology", "lookout", "exceptional", "professionals", "fortify", "position",
  "leaders", "industry", "embark", "journey", "believe", "connecting", "through",
  "global", "hub", "dubai", "constantly", "innovating", "ensure", "customers",
  "fly", "better", "thrives", "dynamic", "nature", "being", "pioneers", "aviation",
  "innovation", "always", "forefront", "pushing", "boundaries", "were",
  "passionate", "leveraging", "latest", "drive", "excellence",
  "considered", "below", "requirements", "degree", "honours", "honors", "equivalent",
  "relevant", "field", "computer", "science", "mathematics", "software",
  "hands", "hands-on", "extensive", "expertise", "experienced",
  "implementation", "implementing", "methodologies", "methodology", "qualification",
  "qualifications", "computational", "technologist", "instrumental", "capabilities",
  "capability", "interrupting", "interrupt", "high-quality", "high", "quality",
  "preventative", "perfective", "corrective", "adaptive", "administration",
  "products", "services", "architectures", "architecture", "strategies", "strategy",
  "practices", "practice", "landscape", "enhance", "efficiency", "scalability",
  "reliability", "across", "streamline", "operations", "reduce", "time", "market",
  "continuously", "improve", "processes", "process", "pivotal", "levels", "level",
  "product", "program", "key", "primary", "lead", "bridge", "mind", "mind-set",
  "mindset", "system", "systems", "enablement", "agile", "release", "trains",
  "identifies", "improves", "lifecycle", "addressing", "flow", "value", "health",
  "responsible", "technical", "design", "coding", "built", "production", "ready",
  "embrace", "advise", "advisor", "architect", "ensuring", "projects", "robust",
  "adhere", "standards", "enable", "teams", "maintenance", "aspects",
  "attractive", "tax", "free", "salary", "benefits", "exclusive", "discounts",
  "flights", "hotels", "stays", "around", "find", "what", "like", "live",
  "fast", "paced", "cosmopolitan", "home", "city", "lifestyle", "section",
  "website", "leadership", "no", "yes", "meet",
  "development", "management", "troubleshooting",
  "configure", "configuration", "supporting", "best",
  "well", "defined", "partnering", "strategize", "set",
  "review", "execute", "initiatives", "expand", "manage", "collaborate",
  "develop", "e.g", "eg", "without", "demonstrating", "problems", "everything",
  "possible", "based", "application", "principles", "factor", "apps",
  "solutions", "solution", "planning", "deployment", "hyper", "care",
  "act", "applying", "entire", "stack", "multiple", "non", "both",
  "responsibilities", "audit-friendly", "post-incident", "improvements",
  "optimization", "willingness", "relocation", "financial", "individuals",
  "employment", "ecosystem", "prioritize", "performant", "inclusive", "therefore",
  "candidate", "description", "implementing", "streamlining", "fast-growing",
  "partnering", "understandings",
]);

const TECH_KEEP = new Set([
  "kubernetes", "k8s", "openshift", "helm", "docker", "terraform", "ansible",
  "puppet", "jenkins", "groovy", "maven", "gradle", "nexus", "artifactory",
  "selenium", "git", "ecr", "aws", "azure", "gcp", "prometheus", "grafana",
  "splunk", "appdynamics", "logstash", "dynatrace", "elk", "argocd", "gitops",
  "devops", "devsecops", "sre", "ci/cd", "cicd", "iac", "nginx", "linux",
  "bash", "python", "microservices", "canary", "vault", "finops",
  "containerisation", "containerization", "orchestration", "observability",
  "iam", "rbac", "mlops", "mlflow", "rasa",
]);

const EQUIV: string[][] = [
  ["ci/cd", "cicd", "ci-cd", "continuous integration", "continuous delivery", "continuous deployment"],
  ["kubernetes", "k8s"],
  ["infrastructure as code", "iac", "terraform", "pulumi"],
  ["monitoring", "observability", "prometheus", "grafana", "datadog", "logging"],
  ["aws", "amazon web services"],
  ["azure", "microsoft azure"],
  ["gcp", "google cloud"],
  ["devops", "dev ops", "sre", "platform engineering"],
  ["docker", "containers", "containerization", "containerisation"],
  ["openshift", "okd", "red hat openshift"],
  ["helm", "helm charts"],
  ["devsecops", "dev sec ops"],
  ["canary", "canary-style", "canary deployment"],
  ["angular", "angularjs"],
  ["react", "reactjs", "react.js"],
  ["pipeline", "pipelines"],
  ["finops", "cloud cost", "cost optimization", "cost management"],
  ["incident response", "incident", "rca", "root cause"],
  ["gitops", "argo cd", "argocd"],
  ["hashicorp vault", "vault"],
];

const ROLE_PACKS: Array<{ match: RegExp; terms: string[] }> = [
  {
    match: /\bfinops\b/i,
    terms: [
      "finops", "cloud cost optimization", "cost allocation", "rightsizing",
      "waste reduction", "spot", "autoscaling",
    ],
  },
  {
    match: /\bmlops\b|\bml platform\b/i,
    terms: [
      "mlops", "model deployment", "model monitoring", "experiment tracking",
      "ml pipeline", "training infrastructure", "inference", "mlflow",
    ],
  },
  {
    match: /\bdevops\b|\bsre\b|\bdevsecops\b|\bplatform engineer\b/i,
    terms: [
      "devops", "devsecops", "kubernetes", "openshift", "helm", "terraform",
      "ci/cd", "observability", "incident response", "aws", "ansible", "jenkins",
      "gitops", "argocd", "prometheus", "grafana",
    ],
  },
];

const EMPTY_JD_RE =
  /^(n\/?a|n\.?a\.?|nil+|null|none|nothing|nope|no|idk|tbd|todo|test+|asdf+|qwer+|xxx+|unknown|skip|blank|empty|gibberish|dadab\w*|i\s*don'?t\s*know|dont\s*know|do\s*not\s*know|no\s*idea|not\s*sure|whatever)$/i;

/** False for empty / placeholder / gibberish JD — hide JD scoring. */
export function isUsableJdText(raw: string): boolean {
  const t = raw.trim();
  if (!t || t.length < 3) return false;
  if (EMPTY_JD_RE.test(t)) return false;
  const letters = (t.match(/[a-zA-Z]/g) || []).length;
  if (letters < 3) return false;
  if (letters / t.length < 0.35 && t.length < 40) return false;
  if (/^(.)\1{4,}$/.test(t.replace(/\s/g, ""))) return false;
  return true;
}

function stripUrls(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\bwww\.[^\s]+/gi, " ")
    .replace(/\b[\w.-]+\.(com|org|net|io|dev|ae|in)(\/[^\s]*)?/gi, " ");
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w#+./\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeUrlToken(t: string): boolean {
  return (
    /^www\./i.test(t) ||
    /^https?:/i.test(t) ||
    /\.(com|org|net|io|dev|ae)(\b|\/)/i.test(t) ||
    /\/careers/i.test(t) ||
    /-[a-z0-9]{8,}/i.test(t)
  );
}

function hasTechShape(t: string): boolean {
  if (TECH_KEEP.has(t)) return true;
  if (EQUIV.some((g) => g.includes(t))) return true;
  if (/[0-9#+]/.test(t)) return true;
  if (/^(aws|azure|gcp|k8s|ci\/cd|cicd)/i.test(t)) return true;
  if (
    /(kube|terraform|ansible|jenkins|docker|openshift|helm|prometheus|grafana|splunk|argocd|gitops|devops|devsec|sre|maven|gradle|nexus|artifactory|selenium|puppet|groovy|appdynamics|logstash|dynatrace|microservice|canary|observab|orchestrat|container|mlops|mlflow|vault|finops)/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

/** Keep only skill-like tokens for missing/matched chips. */
export function isSkillSignalToken(raw: string): boolean {
  const t = normalize(raw).replace(/\.+$/, "");
  if (!t || t.length < 2) return false;
  if (looksLikeUrlToken(t)) return false;
  if (STOP.has(t)) return false;
  if (t.includes("/")) {
    const parts = t.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const techParts = parts.filter((p) => hasTechShape(p) && !STOP.has(p));
      return techParts.some((p) => p.length >= 3);
    }
  }
  if (hasTechShape(t)) return true;
  if (t.includes(" ") && t.length >= 8) {
    const words = t.split(" ");
    if (words.every((w) => STOP.has(w))) return false;
    return hasTechShape(t) || words.some((w) => hasTechShape(w));
  }
  return false;
}

function tokenize(text: string): string[] {
  const n = normalize(stripUrls(text));
  const multi =
    n.match(
      /\b(?:ci\/cd|ci-cd|cicd|infrastructure as code|amazon web services|google cloud|microsoft azure|continuous (?:integration|delivery|deployment)|cloud cost optimization|cost allocation|tagging strategy|unit cost|site reliability|container orchestration|canary-style|cloud-managed|micro services|microservices|incident response|root cause|hashicorp vault|red hat openshift)\b/g,
    ) || [];
  const singles = (n.match(/[a-z][a-z0-9+.#/-]{1,}/g) || []).map((t) =>
    t.replace(/\.+$/, ""),
  );
  const out: string[] = [];
  for (const t of [...multi, ...singles]) {
    if (!isSkillSignalToken(t)) continue;
    if (t.includes("/")) {
      const parts = t.split("/").filter((p) => isSkillSignalToken(p));
      if (parts.length) {
        out.push(...parts);
        continue;
      }
    }
    out.push(t);
  }
  return out;
}

function expandJdTerms(jdText: string): string[] {
  const base = tokenize(jdText);
  const extra: string[] = [];
  for (const pack of ROLE_PACKS) {
    if (pack.match.test(jdText)) extra.push(...pack.terms);
  }
  return [...base, ...extra].filter(isSkillSignalToken);
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

export function keywordHeuristic(resumeText: string, jdOrRoleText: string) {
  if (!jdOrRoleText.trim()) {
    return { matched: [] as string[], missing: [] as string[], pct: 0 };
  }
  const corpus = normalize(resumeText);
  const raw = expandJdTerms(jdOrRoleText);
  const sorted = [...new Set(raw.map(normalize).filter(Boolean))]
    .filter(isSkillSignalToken)
    .sort((a, b) => b.length - a.length);
  const uniq: string[] = [];
  for (const t of sorted) {
    if (uniq.some((u) => u.includes(t) || t.includes(u))) continue;
    uniq.push(t);
    if (uniq.length >= 28) break;
  }
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of uniq) {
    if (coveredByResume(k, corpus)) matched.push(k);
    else missing.push(k);
  }
  missing.sort((a, b) => {
    const sa = (hasTechShape(a) ? 10 : 0) + a.length;
    const sb = (hasTechShape(b) ? 10 : 0) + b.length;
    return sb - sa;
  });
  let pct = uniq.length ? Math.round((100 * matched.length) / uniq.length) : 0;
  if (uniq.length < 5) {
    pct = Math.min(pct, 55 + matched.length * 8);
  }
  return { matched, missing, pct: Math.max(0, Math.min(100, pct)) };
}

export function atsFormatHeuristic(resumeText: string): number {
  let score = 72;
  const pipeCount = (resumeText.match(/\|/g) || []).length;
  if (pipeCount >= 8 || (/^\s*\|.+\|.+\|/m.test(resumeText) && pipeCount >= 4)) {
    score -= 12;
  }
  if (/^---+$/m.test(resumeText)) score -= 10;
  if (/[✉✆🔗📍●]/.test(resumeText)) score -= 10;
  if (resumeText.split(/\n/).length < 20) score -= 10;
  if (/#{1,3}\s|^\s*[-*]\s/m.test(resumeText)) score += 12;
  if (/\b(experience|skills|education|summary|competencies)\b/i.test(resumeText)) score += 10;
  if (/\b(email|@|linkedin|phone|\+?\d{10,})\b/i.test(resumeText)) score += 4;
  return Math.max(20, Math.min(100, score));
}

/** Unified triple score used by resume-tt and job-search. */
export function scoreTriple(
  resumeText: string,
  jdText = "",
  targetRole = "",
): TripleScores {
  const hasJd = Boolean(jdText.trim() || targetRole.trim());
  const jdSource = jdText.trim() || targetRole.trim();
  const kw = keywordHeuristic(resumeText, jdSource);
  const ats = atsFormatHeuristic(resumeText);
  const jd = hasJd ? kw.pct : Math.round(ats * 0.75);
  const overall = hasJd
    ? Math.round(ats * 0.4 + jd * 0.6)
    : Math.round(ats * 0.85);
  return {
    ats,
    jd,
    overall,
    keywordMatchPct: hasJd ? kw.pct : 0,
    atsReadability: ats,
    matchedKeywords: kw.matched,
    missingKeywords: kw.missing,
    jdAvailable: hasJd,
  };
}

export function quickScores(resumeText: string, jdText: string) {
  const t = scoreTriple(resumeText, jdText);
  return {
    overall: t.overall,
    keywordMatchPct: t.keywordMatchPct,
    atsReadability: t.atsReadability,
  };
}

export function scoreDelta(before: TripleScores, after: TripleScores) {
  return {
    ats: after.ats - before.ats,
    jd: after.jd - before.jd,
    overall: after.overall - before.overall,
  };
}

/** Alias used by resume-tt UI */
export const scoreDeltas = scoreDelta;

export function isSaturated(
  before: TripleScores,
  after: TripleScores,
  minGain = 2,
): boolean {
  const d = scoreDelta(before, after);
  return d.ats < minGain && d.jd < minGain && d.overall < minGain;
}

export function selectModelTier(matchScore: number): "premium" | "standard" {
  return matchScore >= 65 ? "premium" : "standard";
}

export function deliverVersionForMatch(matchScore: number): 1 | 3 {
  return matchScore >= 75 ? 3 : 1;
}
