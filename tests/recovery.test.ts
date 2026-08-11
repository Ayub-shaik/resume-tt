import { beforeEach, describe, expect, it } from "vitest";
import { withDatabase } from "@/lib/db";
import {
  beginRecoveryJob,
  compactMemory,
  getRecoveryJob,
  updateRecoveryJob,
} from "@/lib/recovery/store";

beforeEach(() => {
  withDatabase((db) => {
    db.exec("DELETE FROM recovery_jobs; DELETE FROM memory_snapshots;");
  });
});

describe("durable recovery store", () => {
  it("creates migration tables", () => {
    const tables = withDatabase((db) =>
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>,
    ).map((row) => row.name);
    expect(tables).toContain("recovery_jobs");
    expect(tables).toContain("memory_snapshots");
  });

  it("reuses an identical idempotency key", () => {
    const first = beginRecoveryJob({
      userId: "user-a",
      action: "test",
      idempotencyKey: "same",
      request: { value: 1 },
    });
    const second = beginRecoveryJob({
      userId: "user-a",
      action: "test",
      idempotencyKey: "same",
      request: { value: 1 },
    });
    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);
    expect(second.job.id).toBe(first.job.id);
    expect(() => beginRecoveryJob({
      userId: "user-a",
      action: "test",
      idempotencyKey: "same",
      request: { value: 2 },
    })).toThrow("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST");
  });

  it("persists lifecycle and enforces ownership", () => {
    const { job } = beginRecoveryJob({
      userId: "owner",
      action: "test",
      idempotencyKey: "lifecycle",
      request: {},
    });
    updateRecoveryJob(job.id, { status: "uncertain", checkpoint: "restart_reconciliation" });
    expect(getRecoveryJob("owner", job.id)?.status).toBe("uncertain");
    expect(getRecoveryJob("other", job.id)).toBeNull();
  });

  it("compacts oversized context deterministically", () => {
    const compacted = compactMemory("a".repeat(20), 10);
    expect(compacted).toContain("[context compacted]");
    expect(compacted.length).toBeLessThan(40);
  });
});
