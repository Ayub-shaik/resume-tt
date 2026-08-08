/** Career branding kit from resume (+ optional LinkedIn paste / target role). */

export type BrandChecklistItem = {
  id: string;
  label: string;
  ok: boolean;
  tip: string;
};

export type CareerBrandKit = {
  score: number;
  positioning: string;
  headlines: string[];
  about: string;
  experienceTips: string[];
  checklist: BrandChecklistItem[];
  keywords: { present: string[]; missing: string[] };
  niche: string;
};

const ROLE_PATTERNS: { re: RegExp; niche: string; title: string }[] = [
  {
    re: /\b(platform|sre|site reliability)\b/i,
    niche: "platform reliability",
    title: "Platform / SRE Engineer",
  },
  {
    re: /\b(devops|ci\/?cd|jenkins|github actions)\b/i,
    niche: "cloud DevOps & delivery",
    title: "DevOps / Platform Engineer",
  },
  {
    re: /\b(mlops|machine learning ops|llm|agentic)\b/i,
    niche: "ML / AI platform ops",
    title: "MLOps / AI Platform Engineer",
  },
  {
    re: /\b(data engineer|spark|databricks|etl)\b/i,
    niche: "data platforms",
    title: "Data / Platform Engineer",
  },
  {
    re: /\b(security|iam|zero.?trust|soc)\b/i,
    niche: "cloud security & identity",
    title: "Cloud Security / Platform Engineer",
  },
];

const STACK_TOKENS = [
  "AWS",
  "Azure",
  "GCP",
  "Terraform",
  "Kubernetes",
  "Docker",
  "Jenkins",
  "GitHub Actions",
  "ArgoCD",
  "Prometheus",
  "Grafana",
  "Python",
  "Bash",
  "Ansible",
  "Kafka",
  "OpenTelemetry",
];

function yearsHint(text: string): string {
  const m = text.match(/(\d+)\+?\s*years?/i);
  if (m) return `${m[1]}+ years`;
  return "hands-on";
}

function detectNiche(text: string, targetRole: string) {
  const corpus = `${targetRole}\n${text}`;
  for (const p of ROLE_PATTERNS) {
    if (p.re.test(corpus)) return p;
  }
  if (targetRole.trim()) {
    return {
      re: /.*/,
      niche: targetRole.trim().slice(0, 48),
      title: targetRole.trim().slice(0, 64),
    };
  }
  return {
    re: /.*/,
    niche: "cloud engineering",
    title: "Cloud / Platform Engineer",
  };
}

function pickStack(text: string, limit = 4): string[] {
  const found = STACK_TOKENS.filter((t) =>
    new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
      text,
    ),
  );
  return found.slice(0, limit);
}

function hasMetrics(text: string): boolean {
  return /\d+\s*%|\d+x|\b(reduced|cut|improved|increased|saved)\b.*\d+/i.test(
    text,
  );
}

function hasBanking(text: string): boolean {
  return /\b(bank|banking|regulated|audit|compliance|fintech|financial)\b/i.test(
    text,
  );
}

function keywordCoverage(text: string, targetRole: string) {
  const corpus = text.toLowerCase();
  const fromTarget = (targetRole.toLowerCase().match(/[a-z][a-z0-9+.#/-]{2,}/g) || [])
    .filter((w) => w.length > 2)
    .slice(0, 16);
  const defaults = [
    "platform",
    "terraform",
    "kubernetes",
    "aws",
    "azure",
    "ci/cd",
    "sre",
    "observability",
  ];
  const wanted = [...new Set([...fromTarget, ...defaults])].slice(0, 14);
  const present = wanted.filter((k) => corpus.includes(k.replace(/\//g, "/")));
  const missing = wanted.filter((k) => !corpus.includes(k));
  return { present, missing };
}

export function buildCareerBrandKit(opts: {
  resumeText: string;
  linkedinText?: string;
  targetRole?: string;
}): CareerBrandKit {
  const resume = opts.resumeText.trim();
  const linkedin = (opts.linkedinText || "").trim();
  const targetRole = (opts.targetRole || "").trim();
  const corpus = [resume, linkedin].filter(Boolean).join("\n\n");
  const nicheInfo = detectNiche(corpus, targetRole);
  const years = yearsHint(corpus);
  const stack = pickStack(corpus);
  const stackBit = stack.length ? stack.join(" · ") : "cloud · IaC · CI/CD";
  const banking = hasBanking(corpus);
  const metrics = hasMetrics(corpus);
  const kw = keywordCoverage(corpus, targetRole || nicheInfo.title);

  const positioning = banking
    ? `${nicheInfo.title} who keeps regulated cloud platforms reliable — ${stackBit}.`
    : `${nicheInfo.title} focused on ${nicheInfo.niche} — ${stackBit}.`;

  const headlines = [
    `${nicheInfo.title} | ${stackBit}${banking ? " | Banking / regulated ops" : ""}`.slice(
      0,
      220,
    ),
    `${years} ${nicheInfo.title} · ${stack.slice(0, 3).join(" · ") || "Cloud platforms"} · Open to Platform / SRE roles`.slice(
      0,
      220,
    ),
    targetRole
      ? `Targeting: ${targetRole} | ${stackBit} | Proof in production ownership`.slice(
          0,
          220,
        )
      : `Building reliable platforms · ${stackBit} · Ownership over ticket churn`.slice(
          0,
          220,
        ),
  ];

  const about = [
    positioning,
    "",
    `I focus on ${nicheInfo.niche}: infrastructure as code, delivery pipelines, and production judgment${
      banking ? " in regulated environments where auditability matters" : ""
    }.`,
    "",
    stack.length
      ? `Core stack: ${stack.join(", ")}.`
      : "Core stack: cloud, IaC, containers, and CI/CD.",
    "",
    metrics
      ? "I prefer proof over buzzwords — impact stated with numbers where it is real."
      : "Next polish: add 2–3 quantified outcomes (latency, lead time, cost, uptime) to Experience.",
    "",
    targetRole
      ? `Currently aiming at ${targetRole} roles where platform ownership and reliability are the job.`
      : "Open to Platform / SRE / DevOps roles with real production ownership.",
    "",
    "Happy to connect about platforms, reliability, and practical engineering.",
  ].join("\n");

  const experienceTips = [
    "Lead each role with ownership scope (platform / environment / consumers), not only tools used.",
    banking
      ? "Keep one bullet on change management / audit / regulated release process — it differentiates you."
      : "Add one bullet that shows end-to-end ownership of a platform used by other teams.",
    metrics
      ? "Promote your strongest metric bullets into the top 2 lines of recent roles."
      : "Convert vague verbs (supported, involved) into outcomes with a number or frequency.",
    "Align About + headline + top skills to the same niche — inconsistency kills discoverability.",
  ];

  const checklist: BrandChecklistItem[] = [
    {
      id: "niche",
      label: "Clear niche (not generic “DevOps”)",
      ok: nicheInfo.niche !== "cloud engineering" || Boolean(targetRole),
      tip: "Pick a lane: banking platform SRE, CI/CD reliability, MLOps, etc.",
    },
    {
      id: "stack",
      label: "3–4 concrete stack keywords in headline space",
      ok: stack.length >= 3,
      tip: "Surface AWS/Azure, Terraform, Kubernetes, observability tools you actually use.",
    },
    {
      id: "proof",
      label: "Quantified proof somewhere in the story",
      ok: metrics,
      tip: "Add % / time / cost / uptime where honest.",
    },
    {
      id: "consistency",
      label: "Resume and LinkedIn tell the same story",
      ok: !linkedin || linkedin.length > 80,
      tip: "Paste your LinkedIn About/Experience to check drift against the resume.",
    },
    {
      id: "target",
      label: "Target role named",
      ok: Boolean(targetRole),
      tip: "Optional but sharp: set the role you’re hunting so keywords align.",
    },
    {
      id: "keywords",
      label: "Target keyword coverage ≥ 50%",
      ok: kw.present.length >= Math.ceil(kw.present.length + kw.missing.length) / 2,
      tip: `Missing signals: ${kw.missing.slice(0, 6).join(", ") || "none critical"}.`,
    },
  ];

  const okCount = checklist.filter((c) => c.ok).length;
  let score = Math.round((okCount / checklist.length) * 70);
  score += Math.min(20, stack.length * 4);
  if (metrics) score += 8;
  if (banking) score += 4;
  if (resume.length > 800) score += 4;
  score = Math.max(28, Math.min(96, score));

  return {
    score,
    positioning,
    headlines,
    about,
    experienceTips,
    checklist,
    keywords: kw,
    niche: nicheInfo.niche,
  };
}
