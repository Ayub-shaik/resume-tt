import { spawnSync } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

function cleanupExtracted(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function looksLikeBinaryGarbage(text: string): boolean {
  if (!text.trim()) return true;
  const sample = text.slice(0, 4000);
  let bad = 0;
  for (const ch of sample) {
    const c = ch.charCodeAt(0);
    if (c === 9 || c === 10 || c === 13) continue;
    if (c < 32) bad += 1;
  }
  const replacement = (sample.match(/\uFFFD/g) || []).length;
  return bad / sample.length > 0.08 || replacement > 20;
}

/** Firecrawl AnyDoc — local, no API key. Office + text PDFs → markdown. */
async function extractAnydoc(
  buf: Buffer,
  filename: string,
): Promise<string | null> {
  try {
    const { toMarkdownBytes, formatFromBytes, formatFromExtension } =
      await import("@firecrawl/anydoc");
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const ext = path.extname(filename || "");
    const fmt =
      formatFromBytes(bytes) ||
      (ext ? formatFromExtension(ext) : null) ||
      undefined;
    const md = await toMarkdownBytes(bytes, fmt ?? null);
    const text = cleanupExtracted(md || "");
    if (text && !looksLikeBinaryGarbage(text)) return text;
  } catch {
    /* fall through to legacy extractors */
  }
  return null;
}

async function extractPdfUnpdf(buf: Buffer): Promise<string> {
  const { ensureMathSumPrecise } = await import("@/lib/polyfills/mathSumPrecise");
  ensureMathSumPrecise();
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  const joined = Array.isArray(text) ? text.join("\n") : String(text || "");
  return cleanupExtracted(joined);
}

function extractPdfPoppler(buf: Buffer): string {
  const tmp = path.join(os.tmpdir(), `resume-tt-${randomUUID()}.pdf`);
  fs.writeFileSync(tmp, buf);
  try {
    const r = spawnSync(
      "pdftotext",
      ["-layout", "-enc", "UTF-8", tmp, "-"],
      { encoding: "buffer", maxBuffer: 12 * 1024 * 1024 },
    );
    if (r.error || r.status !== 0) {
      throw new Error(r.stderr?.toString("utf8") || "pdftotext failed");
    }
    return cleanupExtracted(r.stdout.toString("utf8"));
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

async function extractPdf(buf: Buffer): Promise<string> {
  const any = await extractAnydoc(buf, "file.pdf");
  if (any) return any;

  const errors: string[] = [];
  try {
    const t = await extractPdfUnpdf(buf);
    if (t && !looksLikeBinaryGarbage(t)) return t;
    errors.push("unpdf returned empty/garbage");
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  try {
    const t = extractPdfPoppler(buf);
    if (t && !looksLikeBinaryGarbage(t)) return t;
    errors.push("pdftotext returned empty/garbage");
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  throw new Error(
    `Could not extract readable PDF text (${errors.join("; ")}). If it is a scanned image, OCR is required.`,
  );
}

async function extractDocx(buf: Buffer): Promise<string> {
  const any = await extractAnydoc(buf, "file.docx");
  if (any) return any;

  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: buf });
    const text = cleanupExtracted(result.value || "");
    if (text) return text;
  } catch {
    /* fall through to unzip */
  }

  const tmp = path.join(os.tmpdir(), `resume-tt-${randomUUID()}.docx`);
  fs.writeFileSync(tmp, buf);
  try {
    const r = spawnSync("unzip", ["-p", tmp, "word/document.xml"], {
      encoding: "buffer",
      maxBuffer: 12 * 1024 * 1024,
    });
    if (r.error || r.status !== 0) {
      throw new Error("Could not read .docx");
    }
    const xml = r.stdout.toString("utf8");
    const withBreaks = xml
      .replace(/<\/w:p>/g, "\n")
      .replace(/<w:br\b[^/]*\/>/g, "\n")
      .replace(/<w:tab\b[^/]*\/>/g, "\t");
    const text = cleanupExtracted(
      withBreaks
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'"),
    );
    if (!text) throw new Error("DOCX had no readable text");
    return text;
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

const OFFICE_EXT =
  /\.(docx?|docm|pptx?|pptm|ppsx?|ppsm|xlsx?|xlsm|xlsb|odt|ods|odp|rtf|epub|csv)$/i;

export async function extractResumeText(
  buf: Buffer,
  filename: string,
  mimeType?: string | null,
): Promise<string> {
  const name = (filename || "upload").toLowerCase();
  const mime = (mimeType || "").toLowerCase();
  const isPdf = name.endsWith(".pdf") || mime.includes("pdf");
  const isDocx =
    name.endsWith(".docx") ||
    name.endsWith(".docm") ||
    mime.includes("wordprocessingml");
  const isPlain =
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    mime.startsWith("text/");

  if (isPlain) {
    const asUtf8 = cleanupExtracted(buf.toString("utf8"));
    if (!asUtf8) throw new Error("Empty text file");
    return asUtf8;
  }

  if (isPdf) return extractPdf(buf);
  if (isDocx) return extractDocx(buf);

  if (OFFICE_EXT.test(name) || mime.includes("officedocument") || mime.includes("msword") || mime.includes("ms-powerpoint") || mime.includes("ms-excel") || mime.includes("opendocument") || mime.includes("rtf") || mime.includes("epub")) {
    const any = await extractAnydoc(buf, filename);
    if (any) return any;
    throw new Error(
      "Could not extract text from this office document. Try .docx, .pdf, or paste text.",
    );
  }

  const any = await extractAnydoc(buf, filename);
  if (any) return any;

  const asUtf8 = cleanupExtracted(buf.toString("utf8"));
  if (asUtf8 && !looksLikeBinaryGarbage(asUtf8)) return asUtf8;
  throw new Error(
    "Unsupported or binary file. Use .txt, .md, .pdf, .doc, .docx, .pptx, or paste text.",
  );
}
