const YEAR_RE = /\b(19|20)\d{2}\b/g;
const METRIC_RE = /\b\d+(?:\.\d+)?%|\$\d[\d,]*|\d+\+|\d+x\b/gi;
export function buildFactLedger(masterResume) {
    const text = masterResume || "";
    const years = [...new Set(text.match(YEAR_RE) || [])];
    const metrics = [...new Set((text.match(METRIC_RE) || []).map((m) => m.toLowerCase()))];
    const employers = [];
    for (const line of text.split("\n")) {
        const h3 = line.match(/^###\s+(.+)/);
        if (h3)
            employers.push(h3[1].trim());
        const pipe = line.match(/^[^#\n|]+\|\s*[^|]+$/);
        if (pipe && !/linkedin|http/i.test(line)) {
            employers.push(line.split("|")[0].trim());
        }
    }
    return {
        years,
        metrics,
        employers: [...new Set(employers.filter(Boolean))].slice(0, 24),
    };
}
export function validateFacts(masterResume, tailoredResume, ledger) {
    const violations = [];
    const masterLower = masterResume.toLowerCase();
    const tailoredLower = tailoredResume.toLowerCase();
    const newYears = [...new Set(tailoredResume.match(YEAR_RE) || [])].filter((y) => !ledger.years.includes(y) && !masterLower.includes(y));
    if (newYears.length) {
        violations.push(`New years not in master: ${newYears.join(", ")}`);
    }
    const newMetrics = [...new Set((tailoredResume.match(METRIC_RE) || []).map((m) => m.toLowerCase()))].filter((m) => !ledger.metrics.includes(m) && !masterLower.includes(m));
    if (newMetrics.length) {
        violations.push(`New metrics not in master: ${newMetrics.join(", ")}`);
    }
    // Block obvious employer invention: ### headers not traceable to master
    for (const line of tailoredResume.split("\n")) {
        const h3 = line.match(/^###\s+(.+)/);
        if (!h3)
            continue;
        const title = h3[1].trim().toLowerCase();
        if (title.length < 4)
            continue;
        if (!masterLower.includes(title.slice(0, Math.min(title.length, 12)))) {
            violations.push(`Possible new role header: ${h3[1].trim()}`);
        }
    }
    if (tailoredResume.length < masterResume.length * 0.35 && masterResume.length > 800) {
        violations.push("Tailored resume suspiciously short vs master");
    }
    return { ok: violations.length === 0, violations: violations.slice(0, 6) };
}
//# sourceMappingURL=facts.js.map