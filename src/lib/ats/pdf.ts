import { spawnSync } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { markdownToAtsHtml, sanitizeAtsMarkdown } from "@/lib/ats/sanitize";

function chromeBin(): string | null {
  const fromEnv = process.env.CHROME_PATH?.trim();
  const candidates = [
    fromEnv,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    try {
      fs.accessSync(c, fs.constants.X_OK);
      return c;
    } catch {
      /* try next */
    }
  }
  return null;
}

export function markdownToPdfBuffer(
  markdown: string,
  title = "ATS Resume",
): Buffer {
  const chrome = chromeBin();
  if (!chrome) {
    throw new Error(
      "Chrome/Chromium not found for PDF export. Install google-chrome or set CHROME_PATH.",
    );
  }
  const md = sanitizeAtsMarkdown(markdown);
  const html = markdownToAtsHtml(md, title);
  const id = randomUUID();
  const htmlPath = path.join(os.tmpdir(), `mpi-ats-${id}.html`);
  const pdfPath = path.join(os.tmpdir(), `mpi-ats-${id}.pdf`);
  fs.writeFileSync(htmlPath, html, "utf8");
  try {
    const r = spawnSync(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        `--print-to-pdf=${pdfPath}`,
        `file://${htmlPath}`,
      ],
      { timeout: 60_000, encoding: "utf8" },
    );
    if (r.status !== 0 || !fs.existsSync(pdfPath)) {
      throw new Error(
        r.stderr?.toString() || r.error?.message || "Chrome PDF failed",
      );
    }
    return fs.readFileSync(pdfPath);
  } finally {
    try {
      fs.unlinkSync(htmlPath);
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(pdfPath);
    } catch {
      /* ignore */
    }
  }
}
