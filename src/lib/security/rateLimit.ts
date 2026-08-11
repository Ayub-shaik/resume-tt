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

/** Prevent overlapping long AI jobs for same user. */
type UserAiLock = { token: string; until: number };

const userLocks = new Map<string, UserAiLock>();

/**
 * Returns an ownership token so an expired request cannot release a newer
 * request's lock. The TTL is only a recovery guard; normal requests release
 * in finally blocks.
 */
export function acquireUserAiLock(
  userId: string,
  ttlMs = 240_000,
): string | null {
  const now = Date.now();
  const current = userLocks.get(userId);
  if (current && current.until > now) return null;
  const token = randomUUID();
  userLocks.set(userId, { token, until: now + ttlMs });
  return token;
}

export function releaseUserAiLock(userId: string, token: string) {
  if (userLocks.get(userId)?.token === token) {
    userLocks.delete(userId);
  }
}
