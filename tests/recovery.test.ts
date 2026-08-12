import { beforeEach, describe, expect, it, vi } from "vitest";
import { withDatabase } from "@/lib/db";
import {
  beginRecoveryJob,
  compactMemory,
  getMemoryContext,
  getRecoveryJob,
  reconcileStaleRecoveryJobs,
  saveMemorySnapshot,
  updateRecoveryJob,
} from "@/lib/recovery/store";
import { AiHttpError, resolveAiConfig } from "@/lib/runtime/provider";
import { runOpenClaw } from "@/lib/runtime/openclaw";
import { resolveAuthSecret } from "@/lib/auth/secret";

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

  it("loads compact session memory and reconciles stale work", () => {
    saveMemorySnapshot({
      userId: "owner",
      resourceId: "resume:owner",
      kind: "test",
      summary: "remember this",
    });
    expect(getMemoryContext("owner", "resume:owner")).toContain("remember this");
    const { job } = beginRecoveryJob({
      userId: "owner",
      action: "stale",
      idempotencyKey: "stale",
      request: {},
    });
    reconcileStaleRecoveryJobs(-1);
    expect(getRecoveryJob("owner", job.id)?.status).toBe("uncertain");
  });

  it("selects a configured provider and blocks untrusted remote endpoints", () => {
    const previous = { ...process.env };
    process.env.AI_BASE_URL = "http://127.0.0.1:9999/v1";
    process.env.AI_API_KEY = "test-key";
    process.env.AI_MODEL = "test-model";
    expect(resolveAiConfig()).toMatchObject({
      endpoint: "http://127.0.0.1:9999/v1/chat/completions",
      model: "test-model",
    });
    process.env.AI_MODEL_FAST = "fast-model";
    expect(resolveAiConfig({ fast: true }).model).toBe("fast-model");
    expect(resolveAiConfig().model).toBe("test-model");
    process.env.AI_BASE_URL = "https://example.com/v1";
    process.env.AI_ALLOW_REMOTE = "false";
    expect(() => resolveAiConfig()).toThrow("AI endpoint must be localhost");
    process.env = previous;
  });
});

describe("provider retries and auth secret", () => {
  it("AiHttpError exposes typed status for retries", () => {
    const err = new AiHttpError(429, "rate limited");
    expect(err.status).toBe(429);
    expect(err.message).toContain("429");
  });

  it("retries transient 503 then succeeds", async () => {
    const previous = { ...process.env };
    process.env.AI_BASE_URL = "http://127.0.0.1:9999/v1";
    process.env.AI_API_KEY = "test-key";
    process.env.AI_MODEL = "test-model";
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("busy", { status: 503 });
      }
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await runOpenClaw([{ role: "user", content: "hi" }]);
    expect(result.text).toBe("ok");
    expect(calls).toBe(2);
    vi.unstubAllGlobals();
    process.env = previous;
  });

  it("fail-closes auth secret in production", () => {
    const previous = { ...process.env };
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    process.env.NODE_ENV = "production";
    expect(() => resolveAuthSecret()).toThrow(/must be set in production/);
    process.env.NODE_ENV = "development";
    expect(resolveAuthSecret()).toBe("mpi-dev-secret-change-me");
    process.env = previous;
  });
});

describe("account cascading delete", () => {
  it("removes recovery and memory rows for a user", async () => {
    const { deleteAllUserOwnedData } = await import("@/lib/db");
    beginRecoveryJob({
      userId: "del-user",
      action: "test",
      idempotencyKey: "del-1",
      request: { v: 1 },
    });
    saveMemorySnapshot({
      userId: "del-user",
      resourceId: "r1",
      kind: "session",
      summary: "note",
    });
    const result = deleteAllUserOwnedData("del-user");
    expect(result.recoveryJobs).toBeGreaterThanOrEqual(1);
    expect(result.memorySnapshots).toBeGreaterThanOrEqual(1);
    expect(getMemoryContext("del-user", "r1")).toBe("");
  });
});

describe("account export", () => {
  it("includes recovery metadata and builds a valid ZIP magic", async () => {
    const { exportAllUserOwnedData } = await import("@/lib/db");
    const { buildZipStore } = await import("@/lib/security/zipStore");
    beginRecoveryJob({
      userId: "exp-user",
      action: "test",
      idempotencyKey: "exp-1",
      request: { v: 1 },
    });
    saveMemorySnapshot({
      userId: "exp-user",
      resourceId: "r-exp",
      kind: "session",
      summary: "export-note",
    });
    const data = exportAllUserOwnedData("exp-user");
    expect(data.recoveryJobs.length).toBeGreaterThanOrEqual(1);
    expect(data.memorySnapshots.length).toBeGreaterThanOrEqual(1);
    const zip = buildZipStore([
      { name: "manifest.json", body: '{"ok":true}' },
      { name: "data.json", body: JSON.stringify(data) },
    ]);
    expect(zip.subarray(0, 4).toString("binary")).toBe("PK\u0003\u0004");
    expect(zip.length).toBeGreaterThan(40);
  });
});

describe("sqlite at-rest encryption", () => {
  it("stores an encrypted file header (not plaintext SQLite magic)", async () => {
    const fs = await import("fs");
    const path = process.env.TT_DB_PATH;
    expect(path).toBeTruthy();
    withDatabase((db) => {
      db.prepare("SELECT 1").get();
    });
    const fd = fs.openSync(path!, "r");
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    expect(buf.subarray(0, 15).toString("utf8")).not.toBe("SQLite format 3");
  });

  it("fail-closes DATA_AT_REST_KEY in production", async () => {
    const { resolveDataAtRestKey } = await import("@/lib/security/sqlite");
    const previous = { ...process.env };
    delete process.env.DATA_AT_REST_KEY;
    delete process.env.SQLITE_ENCRYPTION_KEY;
    process.env.NODE_ENV = "production";
    expect(() => resolveDataAtRestKey()).toThrow(/DATA_AT_REST_KEY/);
    process.env = previous;
  });
});
