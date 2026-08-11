import { randomUUID } from "crypto";

/**
 * OpenClaw serializes work per session key and runs different keys in parallel
 * (up to agents.defaults.maxConcurrent). MPI sends full prompt context in each
 * request, so one-shot jobs should use a fresh key — never a shared static key
 * like "ats-analyze" or a single key per user that blocks concurrent ATS+interview.
 */

export function ephemeralOpenClawSession(
  kind: string,
  parts: Array<string | null | undefined> = [],
): string {
  const safe = parts
    .filter(Boolean)
    .map((p) => String(p).replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 64));
  return ["tt", kind, ...safe, randomUUID().slice(0, 8)].join(":");
}

/** Stable per interview only for optional continuity; prefer ephemeral for JSON turns. */
export function interviewOpenClawSession(
  interviewId: string,
  turnHint?: string | null,
): string {
  return ephemeralOpenClawSession("interview", [interviewId, turnHint || "turn"]);
}
