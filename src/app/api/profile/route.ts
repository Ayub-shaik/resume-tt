import { requireSession } from "@/lib/auth/session";
import { listInterviews, listResumes, listTurns, getReviewPack } from "@/lib/db";
import { listAllowlist } from "@/lib/auth/store";
import { jsonError, jsonOk } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);

  const interviews = listInterviews(ctx.user.id);
  const resumes = listResumes(ctx.user.id);

  const history = interviews
    .filter((i) => i.status === "completed" && i.finalScore != null)
    .map((i) => ({
      id: i.id,
      name: i.name,
      score: i.finalScore as number,
      at: i.updatedAt,
      companyRole: i.name,
    }))
    .sort((a, b) => a.at.localeCompare(b.at));

  const weaknessCounter = new Map<string, number>();
  const topicScores = new Map<string, number[]>();

  for (const interview of interviews) {
    const turns = listTurns(interview.id);
    for (const t of turns) {
      for (const w of t.evaluation?.weaknesses || []) {
        const key = w.slice(0, 80);
        weaknessCounter.set(key, (weaknessCounter.get(key) || 0) + 1);
      }
      for (const d of t.evaluation?.evalV1?.dimensions || []) {
        const arr = topicScores.get(d.name) || [];
        arr.push(d.score);
        topicScores.set(d.name, arr);
      }
    }
    const pack = getReviewPack(interview.id);
    for (const d of pack?.dimensionScores || []) {
      const arr = topicScores.get(d.name) || [];
      arr.push(d.score);
      topicScores.set(d.name, arr);
    }
  }

  const recurringWeaknesses = [...weaknessCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([text, count]) => ({ text, count }));

  const competencyTrends = [...topicScores.entries()].map(([name, scores]) => ({
    name,
    latest: scores[scores.length - 1] ?? 0,
    avg: Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10,
    series: scores.slice(-12),
    improving:
      scores.length >= 2
        ? scores[scores.length - 1]! - scores[0]!
        : 0,
  }));

  const readiness =
    history.length === 0
      ? null
      : Math.round(
          (history.slice(-3).reduce((s, h) => s + h.score, 0) /
            Math.min(3, history.length)) *
            10,
        );

  return jsonOk({
    user: {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
      role: ctx.user.role,
      image: ctx.user.image,
    },
    resumes: resumes.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      score: r.scoreJson,
    })),
    interviews: interviews.map((i) => ({
      id: i.id,
      name: i.name,
      status: i.status,
      finalScore: i.finalScore,
      updatedAt: i.updatedAt,
      parentInterviewId: i.parentInterviewId,
    })),
    performance: {
      history,
      recurringWeaknesses,
      competencyTrends,
      readinessPct: readiness,
      growthVsConsistency: competencyTrends.map((c) => ({
        name: c.name,
        delta: c.improving,
        label:
          c.improving > 0.5
            ? "improving"
            : c.improving < -0.5
              ? "regressing"
              : "consistent",
      })),
    },
    allowlist: ctx.user.role === "admin" ? listAllowlist() : undefined,
  });
}
