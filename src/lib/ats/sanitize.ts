/** Ported from automation/job-search sanitizeAtsMarkdown — ATS-safe markdown. */

function stripAtsNoise(text: string) {
  return String(text || "")
    .replace(/[✉✆🔗📍●•]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trimEnd();
}

export function sanitizeAtsMarkdown(md: string): string {
  let text = stripAtsNoise(md).replace(/\r\n/g, "\n");
  text = text.replace(/^\s*-{3,}\s*$/gm, "");

  const lines = text.split("\n");
  const out: string[] = [];
  let tableBuf: string[] = [];

  const flushTable = () => {
    if (!tableBuf.length) return;
    for (const row of tableBuf) {
      if (/^\s*\|?\s*-{2,}/.test(row)) continue;
      const cells = row
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length >= 2) {
        if (/^domain$/i.test(cells[0]) && /^skills?$/i.test(cells[1])) continue;
        out.push(`- ${cells[0]}: ${cells.slice(1).join(" — ")}`);
      } else if (cells.length === 1) {
        out.push(`- ${cells[0]}`);
      }
    }
    tableBuf = [];
  };

  for (const line of lines) {
    if (/^\s*\|/.test(line) && line.includes("|")) {
      tableBuf.push(line.trim());
      continue;
    }
    flushTable();
    out.push(line);
  }
  flushTable();
  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function markdownToAtsHtml(md: string, title = "Resume"): string {
  const cleaned = stripAtsNoise(md)
    .replace(/\r\n/g, "\n")
    .replace(/^\s*-{3,}\s*$/gm, "");
  const lines = cleaned.split("\n");
  const out: string[] = [];
  let inList = false;
  let inHeader = true;

  const flushList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  const inline = (t: string) =>
    escapeHtml(t)
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }
    if (/^##\s+/.test(line)) {
      inHeader = false;
      flushList();
      out.push(`<h2>${inline(line.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushList();
      out.push(`<h1>${inline(line.replace(/^#\s+/, ""))}</h1>`);
      continue;
    }
    if (/^###\s+/.test(line)) {
      inHeader = false;
      flushList();
      out.push(`<h3>${inline(line.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      inHeader = false;
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }
    flushList();
    const cls = inHeader ? ' class="meta"' : "";
    out.push(`<p${cls}>${inline(line.trim())}</p>`);
  }
  flushList();

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>
  @page { margin: 14mm; }
  body { font-family: Calibri, "Segoe UI", Arial, sans-serif; font-size: 10.5pt; line-height: 1.32; color: #111; }
  h1 { font-size: 18pt; margin: 0 0 4pt; text-align: center; }
  h2 { font-size: 11.5pt; margin: 12pt 0 5pt; border-bottom: 1px solid #222; padding-bottom: 2pt; text-transform: uppercase; letter-spacing: 0.04em; }
  h3 { font-size: 11pt; margin: 9pt 0 2pt; }
  p { margin: 0 0 5pt; }
  .meta { text-align: center; font-size: 9.8pt; }
  ul { margin: 0 0 7pt; padding-left: 16pt; }
  li { margin: 0 0 2.5pt; }
  a { color: #111; text-decoration: none; }
</style></head><body>${out.join("\n")}</body></html>`;
}
