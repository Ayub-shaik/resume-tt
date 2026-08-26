import { describe, expect, it } from "vitest";

/**
 * Lightweight regression for Analyze → Builder handoff helpers.
 * Full UI coverage remains manual/browser; this locks the version label rule.
 */
describe("analyze version labeling", () => {
  it("labels vN from previous length", () => {
    const prev: { label: string }[] = [];
    const nextLabel = (p: { label: string }[]) => `v${p.length + 1}`;
    expect(nextLabel(prev)).toBe("v1");
    prev.push({ label: "v1" });
    expect(nextLabel(prev)).toBe("v2");
    prev.push({ label: "v2" });
    expect(nextLabel(prev)).toBe("v3");
  });
});
