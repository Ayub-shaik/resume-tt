import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Rasterize a PDF buffer to PNG page images via poppler `pdftoppm`.
 * Used for on-screen preview because Chromium/Firefox often show blank
 * native PDF plugins for blob: URLs inside iframe/object embeds.
 */
export async function pdfBufferToPngPages(
  pdf: Buffer,
  opts?: { dpi?: number; maxPages?: number },
): Promise<Buffer[]> {
  const dpi = opts?.dpi ?? 120;
  const maxPages = opts?.maxPages ?? 8;
  const dir = await mkdtemp(join(tmpdir(), "resume-tt-preview-"));
  const pdfPath = join(dir, "resume.pdf");
  const outPrefix = join(dir, "page");
  try {
    await writeFile(pdfPath, pdf);
    await execFileAsync(
      "pdftoppm",
      ["-png", "-r", String(dpi), "-f", "1", "-l", String(maxPages), pdfPath, outPrefix],
      { timeout: 45_000 },
    );
    const files = (await readdir(dir))
      .filter((f) => f.startsWith("page") && f.endsWith(".png"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const pages: Buffer[] = [];
    for (const f of files) {
      pages.push(await readFile(join(dir, f)));
    }
    if (!pages.length) {
      throw new Error("PDF rasterize produced no pages");
    }
    return pages;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
