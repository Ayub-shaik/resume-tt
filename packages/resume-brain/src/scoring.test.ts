import test from "node:test";
import assert from "node:assert/strict";
import {
  scoreTriple,
  deliverVersionForMatch,
  selectModelTier,
  buildFactLedger,
  validateFacts,
  sanitizeAtsMarkdown,
  normalizeCoverLetterMarkdown,
} from "./index.js";

test("scoreTriple ignores URL junk in JD", () => {
  const resume = `
PROFESSIONAL SUMMARY
Senior DevOps with OpenShift, Terraform, Kubernetes, AWS, GitOps, Helm, Argo CD.
SKILLS
- OpenShift, Kubernetes, Terraform, Jenkins, Prometheus, Grafana
`;
  const jd = `
Senior DevOps Engineer
https://www.founditgulf.com/job/devops-engineer-123
Must have: OpenShift Kubernetes Terraform CI/CD GitOps
responsibilities audit-friendly financial services relocation willingness
`;
  const s = scoreTriple(resume, jd);
  assert.ok(s.jd >= 70, `expected high JD match, got ${s.jd}`);
  assert.ok(
    !s.missingKeywords.some((k) => k.includes("founditgulf")),
    "URL tokens should not appear as missing keywords",
  );
});

test("scoreTriple splits ATS and JD", () => {
  const resume = `
# Jane Doe
## SKILLS
- Cloud: AWS, Terraform, Kubernetes
## EXPERIENCE
### DevOps Engineer
Built CI/CD pipelines with Jenkins and Docker.
`;
  const jd = "Senior DevOps Engineer AWS Terraform Kubernetes CI/CD Docker required";
  const s = scoreTriple(resume, jd);
  assert.ok(s.ats >= 50);
  assert.ok(s.jd > 0);
  assert.ok(s.overall > 0);
});

test("deliverVersionForMatch thresholds", () => {
  assert.equal(deliverVersionForMatch(80), 3);
  assert.equal(deliverVersionForMatch(74), 1);
});

test("selectModelTier", () => {
  assert.equal(selectModelTier(70), "premium");
  assert.equal(selectModelTier(50), "standard");
});

test("fact validator blocks new metrics", () => {
  const master = "Improved uptime. Worked 2020-2023 at Acme.";
  const ledger = buildFactLedger(master);
  const bad = "Improved uptime by 99%. Worked 2020-2023 at Acme.";
  const v = validateFacts(master, bad, ledger);
  assert.equal(v.ok, false);
});

test("sanitize removes tables", () => {
  const out = sanitizeAtsMarkdown("| A | B |\n|---|---|\n| Cloud | AWS |");
  assert.ok(!out.includes("|"));
  assert.ok(out.includes("Cloud"));
});

test("normalizeCoverLetterMarkdown unescapes literal newlines", () => {
  const raw =
    "Dear Hiring Manager,\\n\\nI am writing about AWS at Acme.\\n\\nAyub Shaik";
  const out = normalizeCoverLetterMarkdown(raw);
  assert.ok(!out.includes("\\n"));
  assert.match(out, /Dear Hiring Manager,/);
  assert.match(out, /\n\nI am writing/);
});

test("fixDuplicatedFragments repairs AWAWS and AyAyub", () => {
  const out = normalizeCoverLetterMarkdown(
    "Experience with AWAWS and signed by AyAyub Shaik.",
  );
  assert.match(out, /\bAWS\b/);
  assert.doesNotMatch(out, /AWAWS/);
  assert.match(out, /Ayub Shaik/);
  assert.doesNotMatch(out, /AyAyub/);
});
