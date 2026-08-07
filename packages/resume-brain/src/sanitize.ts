/** ATS-safe markdown sanitizer (shared brain). */

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
