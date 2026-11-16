import { describe, expect, it } from "vitest";
import { isBlockedIp, pinnedGet, resolvePublicIp } from "@/lib/security/ssrf";
import { fetchJobDescriptionFromUrl } from "@/lib/ats/fetchJd";

describe("ssrf pinning", () => {
  it.each(["127.0.0.1", "10.1.2.3", "192.168.0.5", "172.20.0.1", "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])("blocks %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });
  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])("allows %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });
  it("rejects loopback and .internal hosts", async () => {
    await expect(resolvePublicIp("localhost")).rejects.toThrow(/not allowed/);
    await expect(resolvePublicIp("metadata.google.internal")).rejects.toThrow(/not allowed/);
    await expect(pinnedGet("https://127.0.0.1:1/", { maxBytes: 100 })).rejects.toThrow(/not allowed/);
  });
  it("rejects http and non-https", async () => {
    await expect(pinnedGet("http://8.8.8.8/", { maxBytes: 100 })).rejects.toThrow(/https/);
    await expect(fetchJobDescriptionFromUrl("http://example.com/job")).rejects.toThrow(/https/);
  });
  it("rejects decimal/hex IPv4 forms and mapped IPv6 via URL normalisation", async () => {
    await expect(fetchJobDescriptionFromUrl("https://2130706433/x")).rejects.toThrow(/not allowed/);
    await expect(fetchJobDescriptionFromUrl("https://[::ffff:127.0.0.1]/x")).rejects.toThrow(/not allowed/);
  });
  it("public IP literal is accepted for pinning", async () => {
    await expect(resolvePublicIp("8.8.8.8")).resolves.toEqual({ address: "8.8.8.8", family: 4 });
  });
});
