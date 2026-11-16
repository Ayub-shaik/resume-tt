import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/store", () => ({
  isEmailAllowed: (e: string) => e === "ok@example.com",
  verifyUserPassword: () => false,
  getUserByEmail: () => null,
  upsertUserFromGoogle: () => null,
}));

import { POST } from "@/app/api/auth/mobile/password/route";

async function call(email: string) {
  const res = await POST(
    new Request("http://x/api/auth/mobile/password", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": `9.9.9.${Math.floor(Math.random() * 250)}` },
      body: JSON.stringify({ email, password: "wrong-pass" }),
    }),
  );
  return { status: res.status, body: await res.text() };
}

describe("mobile password route", () => {
  it("returns identical status and body for allowlisted and non-allowlisted emails", async () => {
    const a = await call("ok@example.com");
    const b = await call("nobody@example.com");
    expect(a.status).toBe(401);
    expect(b).toEqual(a);
    expect(b.body).toContain("Incorrect email or password");
  });
});
