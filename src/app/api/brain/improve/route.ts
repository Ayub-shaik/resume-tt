import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireSession } from "@/lib/auth/session";
import { benchmarkTriple } from "@tomorrowtools/resume-brain";
import {
  brainImproveChain,
  brainImproveMore,
  brainImprovePass,
} from "@/lib/brain/client";
import { scoreTriple } from "@/lib/ats/keywords";
import type { ImproveFocus, ResumeVersion } from "@/lib/ats/keywords";
import {
  acquireUserAiJob,
  cancelUserAiJob,
  getUserAiJob,
  releaseUserAiJob,
} from "@/lib/security/rateLimit";
import { getMemoryContext, runRecoveryJob, saveMemorySnapshot } from "@/lib/recovery/store";

export const runtime = "nodejs";

type Body = {
  action?: "chain" | "pass" | "more";
  masterResume: string;
  currentResume?: string;
  jdText?: string;
  targetRole?: string;
  targetVersion?: ResumeVersion;
  currentVersion?: ResumeVersion;
  focus?: ImproveFocus;
  matchScore?: number;
};

export async function POST(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requestId = req.headers.get("x-request-id") || randomUUID();
  try {
    const body = (await req.json()) as Body;
    const master = String(body.masterResume || "").trim();
    if (!master) {
      return NextResponse.json({ error: "masterResume required" }, { status: 400 });
    }
    const jdText = String(body.jdText || "");
    const targetRole = String(body.targetRole || "");
    const matchScore =
      Number(body.matchScore) ||
      scoreTriple(master, jdText, targetRole).overall;

    const action = body.action || "pass";
    const override = req.headers.get("x-tt-override") === "true";
    let job = acquireUserAiJob(ctx.user.id, "improve");
    if (!job && override) {
      const cancelled = cancelUserAiJob(ctx.user.id);
      if (cancelled) {
        console.warn(
          `[brain/improve ${requestId}] cancelled job ${cancelled.jobId} for override`,
        );
      }
      job = acquireUserAiJob(ctx.user.id, "improve");
    }
    if (!job) {
      const active = getUserAiJob(ctx.user.id);
      return NextResponse.json(
        {
          error: "An earlier analyze/improve request is still running. Cancel it and retry to replace it.",
          code: "AI_JOB_ACTIVE",
          jobId: active?.jobId,
          activeAction: active?.action,
        },
        { status: 409 },
      );
    }

    try {
      const memoryContext = getMemoryContext(ctx.user.id, `resume:${ctx.user.id}`);
      if (action === "chain") {
        const targetVersion = (body.targetVersion || 1) as ResumeVersion;
        const recovery = await runRecoveryJob({
          userId: ctx.user.id,
          action: "brain.improve.chain",
          idempotencyKey: req.headers.get("x-idempotency-key") || requestId,
          request: body,
          provider: process.env.AI_PROVIDER || "openclaw",
          execute: async () => {
            const chain = await brainImproveChain({
              masterResume: master, jdText, targetRole, targetVersion,
              focus: body.focus, matchScore, signal: job.controller.signal, memoryContext,
            });
            return {
              chain,
              benchmark: await Promise.all(
                chain.versions.map((v) => benchmarkTriple(v.resumeMd, jdText, v.scores)),
              ),
            };
          },
        });
        if (!recovery.result) {
          return NextResponse.json({ recoveryJobId: recovery.job.id, status: recovery.job.status, checkpoint: recovery.job.checkpoint }, { status: 202 });
        }
        saveMemorySnapshot({ userId: ctx.user.id, resourceId: `resume:${ctx.user.id}`, kind: "brain.improve.chain", summary: JSON.stringify(recovery.result), sourceCursor: recovery.job.id });
        return NextResponse.json({ ...recovery.result, recoveryJobId: recovery.job.id });
      }

      if (action === "more") {
        const current = String(body.currentResume || master).trim();
        const currentVersion = (body.currentVersion || 1) as ResumeVersion;
        const recovery = await runRecoveryJob({
          userId: ctx.user.id,
          action: "brain.improve.more",
          idempotencyKey: req.headers.get("x-idempotency-key") || requestId,
          request: body,
          provider: process.env.AI_PROVIDER || "openclaw",
          execute: async () => {
            const pass = await brainImproveMore({
              masterResume: master, currentResume: current, currentVersion,
              jdText, targetRole, matchScore, focus: body.focus,
              signal: job.controller.signal, memoryContext,
            });
            return {
              pass,
              benchmark: await benchmarkTriple(pass.resumeMd, jdText, pass.scores),
            };
          },
        });
        if (!recovery.result) {
          return NextResponse.json({ recoveryJobId: recovery.job.id, status: recovery.job.status, checkpoint: recovery.job.checkpoint }, { status: 202 });
        }
        saveMemorySnapshot({ userId: ctx.user.id, resourceId: `resume:${ctx.user.id}`, kind: "brain.improve.more", summary: recovery.result.pass.resumeMd, sourceCursor: recovery.job.id });
        return NextResponse.json({ ...recovery.result, recoveryJobId: recovery.job.id });
      }

      const current = String(body.currentResume || master).trim();
      const version = (body.currentVersion || 1) as ResumeVersion;
      const recovery = await runRecoveryJob({
        userId: ctx.user.id,
        action: "brain.improve.pass",
        idempotencyKey: req.headers.get("x-idempotency-key") || requestId,
        request: body,
        provider: process.env.AI_PROVIDER || "openclaw",
        execute: async () => {
          const pass = await brainImprovePass({
            masterResume: master, currentResume: current, jdText, targetRole,
            version, focus: body.focus || "balanced", matchScore,
            signal: job.controller.signal, memoryContext,
          });
          return {
            pass,
            preScores: scoreTriple(current, jdText, targetRole),
            benchmark: await benchmarkTriple(pass.resumeMd, jdText, pass.scores),
          };
        },
      });
      if (!recovery.result) {
        return NextResponse.json({ recoveryJobId: recovery.job.id, status: recovery.job.status, checkpoint: recovery.job.checkpoint }, { status: 202 });
      }
      saveMemorySnapshot({ userId: ctx.user.id, resourceId: `resume:${ctx.user.id}`, kind: "brain.improve.pass", summary: recovery.result.pass.resumeMd, sourceCursor: recovery.job.id });
      return NextResponse.json({ ...recovery.result, recoveryJobId: recovery.job.id });
    } finally {
      releaseUserAiJob(ctx.user.id, job.token);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[brain/improve ${requestId}] ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
