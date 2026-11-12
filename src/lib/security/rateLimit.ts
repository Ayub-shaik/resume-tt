import { randomUUID } from "crypto";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Simple in-memory sliding window rate limiter (single-process).
 * Fine for local studio; replace with Redis for multi-instance.
 */
export function rateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const current = buckets.get(opts.key);

  if (!current || now >= current.resetAt) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }

  if (current.count >= opts.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { ok: true };
}

export function clientKey(req: Request, suffix: string): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  return `${ip}:${suffix}`;
}

/** Prevent overlapping AI jobs for the same interview. */
const locks = new Map<string, number>();

export function acquireInterviewLock(
  interviewId: string,
  ttlMs = 180_000,
): boolean {
  const now = Date.now();
  const until = locks.get(interviewId);
  if (until && until > now) return false;
  locks.set(interviewId, now + ttlMs);
  return true;
}

export function releaseInterviewLock(interviewId: string) {
  locks.delete(interviewId);
}

export type UserAiJob = {
  jobId: string;
  userId: string;
  action: string;
  token: string;
  startedAt: number;
  until: number;
  controller: AbortController;
};

const userJobs = new Map<string, UserAiJob>();
const globalAiTokens = new Set<string>();

function maxUserInflight(): number {
  const n = Number(process.env.AI_USER_MAX_INFLIGHT ?? "1");
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function maxGlobalInflight(): number {
  const n = Number(process.env.AI_GLOBAL_MAX_INFLIGHT ?? "8");
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 8;
}

function pruneUserJobs(userId: string) {
  const now = Date.now();
  const current = userJobs.get(userId);
  if (current && current.until <= now) {
    current.controller.abort();
    globalAiTokens.delete(current.token);
    userJobs.delete(userId);
  }
}

/**
 * Starts one cancellable AI job per user (or up to AI_USER_MAX_INFLIGHT).
 * Also enforces AI_GLOBAL_MAX_INFLIGHT across all users on this process.
 */
export function acquireUserAiJob(
  userId: string,
  action: string,
  ttlMs = 240_000,
): UserAiJob | null {
  const now = Date.now();
  pruneUserJobs(userId);
  const current = userJobs.get(userId);
  const perUserMax = maxUserInflight();
  if (current && current.until > now && perUserMax <= 1) return null;
  if (current && perUserMax <= 1) {
    current.controller.abort();
    globalAiTokens.delete(current.token);
    userJobs.delete(userId);
  }
  if (globalAiTokens.size >= maxGlobalInflight()) return null;

  const job: UserAiJob = {
    jobId: randomUUID(),
    userId,
    action,
    token: randomUUID(),
    startedAt: now,
    until: now + ttlMs,
    controller: new AbortController(),
  };
  globalAiTokens.add(job.token);
  userJobs.set(userId, job);
  return job;
}

export function getUserAiJob(userId: string): UserAiJob | null {
  pruneUserJobs(userId);
  return userJobs.get(userId) ?? null;
}

export function cancelUserAiJob(userId: string, jobId?: string): UserAiJob | null {
  const current = getUserAiJob(userId);
  if (!current || (jobId && current.jobId !== jobId)) return null;
  current.controller.abort();
  globalAiTokens.delete(current.token);
  userJobs.delete(userId);
  return current;
}

export function releaseUserAiJob(userId: string, token: string) {
  if (userJobs.get(userId)?.token === token) {
    globalAiTokens.delete(token);
    userJobs.delete(userId);
  }
}

/** Backward-compatible lock API for lower-priority ATS routes. */
export function acquireUserAiLock(
  userId: string,
  ttlMs = 240_000,
): string | null {
  return acquireUserAiJob(userId, "legacy", ttlMs)?.token ?? null;
}

export function releaseUserAiLock(userId: string, token: string) {
  releaseUserAiJob(userId, token);
}

export function clientFingerprint(req: Request): string {
  const h = req.headers;
  const tls = h.get("cf-ja4") || h.get("cf-ja3-hash") || "";
  const traits = ["user-agent", "accept-language", "accept-encoding", "sec-ch-ua", "sec-ch-ua-platform"].map((k) => h.get(k) || "").join("|");
  let x = 5381;
  for (const c of `${tls}#${traits}`) x = ((x << 5) + x + c.charCodeAt(0)) | 0;
  return (x >>> 0).toString(36);
}

/**
 * Failed-credential tracking per (account, client). No account lockout: locking after N failures lets an
 * attacker lock real people out. Requests rejected by the cheap gates never reach this counter.
 */
const fails = new Map<string, { n: number; t: number }>();
export function failedDelayMs(key: string): { delayMs: number; hardStop: boolean } {
  const e = fails.get(key);
  if (!e || Date.now() - e.t > 15 * 60_000) return { delayMs: 0, hardStop: false };
  return { delayMs: e.n >= 3 ? Math.min(8000, 500 * 2 ** (e.n - 3)) : 0, hardStop: e.n >= 10 };
}
export function recordFailure(key: string) {
  const now = Date.now(); const e = fails.get(key);
  if (!e || now - e.t > 15 * 60_000) fails.set(key, { n: 1, t: now }); else { e.n += 1; e.t = now; }
  if (fails.size > 20_000) for (const [k, v] of fails) if (now - v.t > 15 * 60_000) fails.delete(k);
}
export function clearFailures(key: string) { fails.delete(key); }
