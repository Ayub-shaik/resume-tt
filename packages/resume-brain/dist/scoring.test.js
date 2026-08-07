import test from "node:test";
import assert from "node:assert/strict";
import { scoreTriple, deliverVersionForMatch, selectModelTier, buildFactLedger, validateFacts, sanitizeAtsMarkdown, } from "./index.js";
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
//# sourceMappingURL=scoring.test.js.map