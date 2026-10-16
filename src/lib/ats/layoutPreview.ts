import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { JsonResume } from "@/lib/ats/jsonresume";
import { pdfBufferToPngPages } from "@/lib/ats/pdfToPng";
import { renderResumePdf } from "@/lib/ats/templates";
import {
  LAYOUT_BENEFIT,
  LAYOUT_IDS,
  LAYOUT_META,
  type LayoutId,
} from "@/lib/ats/templates/shared";

const execFileAsync = promisify(execFile);

export type LayoutPreviewCard = {
  id: LayoutId;
  name: string;
  png: string;
  parserScore: number;
  survived: string;
  benefit: string;
};

const cache = new Map<string, LayoutPreviewCard[]>();

function resumeHash(resume: JsonResume): string {
  return createHash("sha256").update(JSON.stringify(resume)).digest("hex");
}

async function pdfToText(pdf: Buffer): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "resume-tt-txt-"));
  const pdfPath = join(dir, "resume.pdf");
  try {
    await writeFile(pdfPath, pdf);
    const { stdout } = await execFileAsync("pdftotext", ["-layout", pdfPath, "-"], {
      timeout: 20_000,
      maxBuffer: 2_000_000,
    });
    return stdout;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function scoreExtractedResume(
  text: string,
  resume: JsonResume,
): { parserScore: number; survived: string } {
  const lower = text.toLowerCase();
  const email = resume.basics?.email?.trim().toLowerCase() || "";
  const contact =
    (email.length > 0 && lower.includes(email)) ||
    /\+?\d[\d\s().-]{8,}\d/.test(text);
  const headings = ["experience", "skills", "education"].filter((h) => lower.includes(h));
  const contactAt = email && lower.includes(email) ? lower.indexOf(email) : 0;
  const experienceAt = lower.indexOf("experience");
  const orderOk = experienceAt === -1 || contactAt <= experienceAt;
  const skillNames = (resume.skills || [])
    .flatMap((s) => [s.name, ...(s.keywords || [])])
    .map((s) => (s || "").trim())
    .filter((s) => s.length >= 2)
    .slice(0, 12);
  const skillHits = skillNames.filter((s) => lower.includes(s.toLowerCase()));

  let score = 0;
  if (contact) score += 25;
  score += Math.round((25 * headings.length) / 3);
  if (orderOk && headings.includes("experience")) score += 25;
  score += skillNames.length
    ? Math.round((25 * skillHits.length) / skillNames.length)
    : 15;

  const bits: string[] = [];
  if (contact) bits.push("contact");
  if (headings.length) bits.push(headings.join(", "));
  if (orderOk && headings.includes("experience")) bits.push("contact before experience");
  if (skillNames.length) {
    bits.push(`${skillHits.length} of ${skillNames.length} skills extracted`);
  }
  return {
    parserScore: Math.max(0, Math.min(100, score)),
    survived: bits.length ? bits.join(" · ") : "Little text survived extraction.",
  };
}

async function previewOne(id: LayoutId, resume: JsonResume): Promise<LayoutPreviewCard> {
  const meta = LAYOUT_META.find((t) => t.id === id);
  const benefit = LAYOUT_BENEFIT[id];
  try {
    const pdf = await renderResumePdf(id, resume);
    const [pages, text] = await Promise.all([
      pdfBufferToPngPages(pdf, { dpi: 90, maxPages: 1 }),
      pdfToText(pdf),
    ]);
    const scored = scoreExtractedResume(text, resume);
    return {
      id,
      name: meta?.name || id,
      png: `data:image/png;base64,${pages[0].toString("base64")}`,
      parserScore: scored.parserScore,
      survived: scored.survived,
      benefit,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Preview failed";
    return {
      id,
      name: meta?.name || id,
      png: "",
      parserScore: 0,
      survived: message,
      benefit,
    };
  }
}

export async function buildLayoutPreviews(resume: JsonResume): Promise<LayoutPreviewCard[]> {
  const key = resumeHash(resume);
  const hit = cache.get(key);
  if (hit) return hit;
  const cards: LayoutPreviewCard[] = [];
  for (const id of LAYOUT_IDS) {
    cards.push(await previewOne(id, resume));
  }
  cache.set(key, cards);
  if (cache.size > 24) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  return cards;
}
