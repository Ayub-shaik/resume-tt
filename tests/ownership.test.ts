import { describe, expect, it } from "vitest";
import { canAccess } from "@/lib/auth/ownership";

describe("ownership", () => {
  it("null-owner rows are not accessible to any user", () => {
    expect(canAccess({ userId: null }, "u1")).toBe(false);
    expect(canAccess({}, "u1")).toBe(false);
  });
  it("owner only", () => {
    expect(canAccess({ userId: "u1" }, "u1")).toBe(true);
    expect(canAccess({ userId: "u1" }, "u2")).toBe(false);
  });
});
