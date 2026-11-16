import fs from "fs";
import os from "os";
import path from "path";
import { afterAll, describe, expect, it, vi } from "vitest";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rcv-del-"));
const prevCwd = process.cwd();
process.chdir(tmp);
process.env.DATA_AT_REST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
afterAll(() => {
  process.chdir(prevCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("account erasure", () => {
  it("removes allowlist row and revokes drive token at Google", async () => {
    const allow = await import("@/lib/auth/allowlist");
    const drive = await import("@/lib/drive/store");
    const store = await import("@/lib/auth/store");
    allow.addAllowlistEmail("Gone@Example.com", "test");
    expect(allow.listAllowlist().some((r: { email: string }) => r.email === "gone@example.com")).toBe(true);
    drive.upsertUserDriveToken({ userId: "u-1", refreshToken: "rt-secret" });

    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await drive.revokeUserDriveToken("u-1")).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
    expect(url).toBe("https://oauth2.googleapis.com/revoke");
    expect(init.body).toContain("token=rt-secret");
    vi.unstubAllGlobals();

    drive.deleteUserDriveToken("u-1");
    expect(drive.getUserDriveToken("u-1")).toBeNull();
    store.deleteUserById("u-1", " Gone@Example.com ");
    expect(allow.listAllowlist().some((r: { email: string }) => r.email === "gone@example.com")).toBe(false);
  });
});
