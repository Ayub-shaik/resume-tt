import { createHash, randomUUID } from "crypto";
import { withDatabase } from "@/lib/db";

export type RecoveryStatus =
  | "queued"
  | "running"
  | "uncertain"
  | "completed"
  | "failed"
  | "cancelled";

export type RecoveryJob = {
  id: string;
  userId: string;
  resourceId: string | null;
  action: string;
  idempotencyKey: string;
  requestHash: string;
  status: RecoveryStatus;
  checkpoint: string;
  provider: string | null;
  attemptCount: number;
  request: unknown;
  result: unknown;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

function map(row: Record<string, unknown>): RecoveryJob {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    resourceId: row.resource_id ? String(row.resource_id) : null,
    action: String(row.action),
    idempotencyKey: String(row.idempotency_key),
    requestHash: String(row.request_hash),
    status: String(row.status) as RecoveryStatus,
    checkpoint: String(row.checkpoint),
    provider: row.provider ? String(row.provider) : null,
    attemptCount: Number(row.attempt_count || 0),
    request: JSON.parse(String(row.request_json)),
    result: row.result_json ? JSON.parse(String(row.result_json)) : null,
    error: row.error ? String(row.error) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function hashRequest(request: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(request))
    .digest("hex");
}

export function beginRecoveryJob(input: {
  userId: string;
  resourceId?: string | null;
  action: string;
  idempotencyKey: string;
  request: unknown;
  provider?: string;
}): { job: RecoveryJob; reused: boolean } {
  const now = new Date().toISOString();
  const requestHash = hashRequest(input.request);
  return withDatabase((db) => {
    const existing = db
      .prepare(
        "SELECT * FROM recovery_jobs WHERE user_id = ? AND idempotency_key = ?",
      )
      .get(input.userId, input.idempotencyKey) as Record<string, unknown> | undefined;
    if (existing) {
      const job = map(existing);
      if (job.requestHash !== requestHash) {
        throw new Error("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST");
      }
      return { job, reused: true };
    }
    const id = randomUUID();
    db.prepare(
      `INSERT INTO recovery_jobs
       (id,user_id,resource_id,action,idempotency_key,request_hash,status,checkpoint,provider,request_json,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id,
      input.userId,
      input.resourceId ?? null,
      input.action,
      input.idempotencyKey,
      requestHash,
      "queued",
      "accepted",
      input.provider ?? null,
      JSON.stringify(input.request),
      now,
      now,
    );
    return {
      job: map(
        db.prepare("SELECT * FROM recovery_jobs WHERE id = ?").get(id) as Record<string, unknown>,
      ),
      reused: false,
    };
  });
}

export function updateRecoveryJob(
  id: string,
  patch: Partial<Pick<RecoveryJob, "status" | "checkpoint" | "provider" | "result" | "error">>,
): RecoveryJob | null {
  return withDatabase((db) => {
    const current = db.prepare("SELECT * FROM recovery_jobs WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!current) return null;
    const next = map(current);
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE recovery_jobs SET status=?, checkpoint=?, provider=?, result_json=?, error=?,
       attempt_count=?, updated_at=? WHERE id=?`,
    ).run(
      patch.status ?? next.status,
      patch.checkpoint ?? next.checkpoint,
      patch.provider ?? next.provider,
      patch.result === undefined ? (next.result ? JSON.stringify(next.result) : null) : JSON.stringify(patch.result),
      patch.error ?? next.error,
      next.attemptCount + (patch.status === "running" ? 1 : 0),
      now,
      id,
    );
    return map(db.prepare("SELECT * FROM recovery_jobs WHERE id = ?").get(id) as Record<string, unknown>);
  });
}

export async function runRecoveryJob<T>(input: {
  userId: string;
  resourceId?: string | null;
  action: string;
  idempotencyKey: string;
  request: unknown;
  provider?: string;
  execute: (job: RecoveryJob) => Promise<T>;
}): Promise<{ job: RecoveryJob; result?: T; reused: boolean }> {
  const started = beginRecoveryJob(input);
  if (started.reused && started.job.status === "completed") {
    return { job: started.job, result: started.job.result as T, reused: true };
  }
  if (started.reused && (started.job.status === "running" || started.job.status === "queued")) {
    return { job: started.job, reused: true };
  }
  let job = updateRecoveryJob(started.job.id, {
    status: "running",
    checkpoint: "provider_started",
  }) || started.job;
  try {
    const result = await input.execute(job);
    job = updateRecoveryJob(job.id, {
      status: "completed",
      checkpoint: "result_acknowledged",
      result,
    }) || job;
    return { job, result, reused: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    job = updateRecoveryJob(job.id, {
      status: /timeout|aborted|network|fetch failed|gateway/i.test(message)
        ? "uncertain"
        : "failed",
      checkpoint: "provider_failed",
      error: message.slice(0, 1000),
    }) || job;
    throw Object.assign(new Error(message), { recoveryJob: job });
  }
}

export function getRecoveryJob(userId: string, id: string): RecoveryJob | null {
  return withDatabase((db) => {
    const row = db.prepare("SELECT * FROM recovery_jobs WHERE id = ? AND user_id = ?").get(id, userId) as Record<string, unknown> | undefined;
    return row ? map(row) : null;
  });
}

export function compactMemory(text: string, maxChars = 12_000): string {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;
  const edge = Math.floor(maxChars * 0.42);
  return `${clean.slice(0, edge)}\n\n[context compacted]\n\n${clean.slice(-edge)}`;
}

export function saveMemorySnapshot(input: {
  userId: string;
  resourceId: string;
  kind: string;
  summary: string;
  sourceCursor?: string;
}): void {
  withDatabase((db) => {
    db.prepare(
      `INSERT INTO memory_snapshots
       (id,user_id,resource_id,kind,summary,source_cursor,created_at)
       VALUES (?,?,?,?,?,?,?)`,
    ).run(
      randomUUID(),
      input.userId,
      input.resourceId,
      input.kind,
      compactMemory(input.summary),
      input.sourceCursor ?? null,
      new Date().toISOString(),
    );
  });
}

export function getMemoryContext(
  userId: string,
  resourceId: string,
  limit = 6,
): string {
  return withDatabase((db) => {
    const rows = db.prepare(
      `SELECT summary FROM memory_snapshots
       WHERE user_id=? AND resource_id=? ORDER BY created_at DESC LIMIT ?`,
    ).all(userId, resourceId, limit) as Array<{ summary: string }>;
    return compactMemory(rows.reverse().map((row) => row.summary).join("\n\n"));
  });
}

/** Reconciles work that was interrupted by a process restart. */
export function reconcileStaleRecoveryJobs(maxAgeMs = 5 * 60_000): number {
  return withDatabase((db) => {
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
    const result = db.prepare(
      `UPDATE recovery_jobs
       SET status='uncertain', checkpoint='restart_reconciliation',
           error='The worker restarted before acknowledgement', updated_at=?
       WHERE status IN ('running','queued') AND updated_at < ?`,
    ).run(new Date().toISOString(), cutoff);
    return result.changes;
  });
}

const recoveryWorker = setInterval(() => {
  try {
    reconcileStaleRecoveryJobs();
  } catch {
    // Startup/shutdown races must not take down the application process.
  }
}, 30_000);
recoveryWorker.unref?.();
