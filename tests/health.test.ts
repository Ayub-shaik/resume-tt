import { describe, expect, it } from "vitest";
import { GET } from "@/app/health/route";

describe("/health", () => {
  it("returns only {status: ok}", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
