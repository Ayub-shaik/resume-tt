import { describe, expect, it } from "vitest";
import { extractResumeText, sniffKind, withParseTimeout } from "@/lib/resume/extract";

describe("upload sniffing", () => {
  it("detects kinds from magic bytes", () => {
    expect(sniffKind(Buffer.from("%PDF-1.7 x"))).toBe("pdf");
    expect(sniffKind(Buffer.from([0x50, 0x4b, 3, 4, 0]))).toBe("zip");
    expect(sniffKind(Buffer.from("d0cf11e0a1b11ae1", "hex"))).toBe("ole");
    expect(sniffKind(Buffer.from("plain resume text"))).toBe("text");
    expect(sniffKind(Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0, 0]))).toBe("unknown");
  });
  it("rejects spoofed extensions and binaries", async () => {
    await expect(extractResumeText(Buffer.from("just text, not a pdf"), "cv.pdf", "application/pdf")).rejects.toThrow(/does not match/);
    await expect(extractResumeText(Buffer.from("%PDF-1.4 fake"), "cv.docx", null)).rejects.toThrow(/does not match/);
    await expect(extractResumeText(Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0, 1, 2]), "cv.txt", "text/plain")).rejects.toThrow(/binary/);
  });
  it("accepts a real text file", async () => {
    await expect(extractResumeText(Buffer.from("Jane Doe\nEngineer"), "cv.txt", "text/plain")).resolves.toContain("Jane Doe");
  });
  it("times out a hung parser", async () => {
    await expect(withParseTimeout(new Promise(() => {}), 50)).rejects.toThrow(/too long/);
  });
});
