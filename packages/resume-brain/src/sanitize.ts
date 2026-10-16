/** ATS-safe markdown sanitizer (shared brain). */

function stripAtsNoise(text: string) {
  return String(text || "")
    .replace(/[✉✆🔗📍●•]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trimEnd();
}

/** LLMs sometimes emit literal \\n instead of real newlines inside JSON strings. */
export function unescapeLiteralNewlines(text: string): string {
  return String(text || "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\r\n/g, "\n");
}

function fixWordDuplication(word: string): string {
  for (let len = 2; len <= Math.min(5, word.length - 2); len++) {
    const prefix = word.slice(0, len);
    const rest = word.slice(len);
    if (rest.toLowerCase().startsWith(prefix.toLowerCase())) {
      return prefix + rest.slice(prefix.length);
    }
  }
  return word;
}

/** Collapse doubled words and partial-prefix duplicates (AWAWS → AWS, AyAyub → Ayub). */
export function fixDuplicatedFragments(text: string): string {
  let out = String(text || "");
  out = out.replace(/\b(\w+)\s+\1\b/gi, "$1");
  out = out.replace(/\b[A-Za-z][A-Za-z0-9]{3,}\b/g, (word) => fixWordDuplication(word));
  return out;
}

/** Insert missing spaces after sentence-ending punctuation. */
export function fixMissingSpaces(text: string): string {
  let out = String(text || "");
  out = out.replace(/([.!?])([A-Za-z])/g, "$1 $2");
  out = out.replace(/ {2,}/g, " ");
  return out;
}

export function normalizeProseMarkdown(md: string): string {
  let text = unescapeLiteralNewlines(stripAtsNoise(md));
  text = fixDuplicatedFragments(text);
  text = fixMissingSpaces(text);
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

/** Cover letters need real paragraph breaks for PDF + copy/paste. */
export function normalizeCoverLetterMarkdown(md: string): string {
  let text = normalizeProseMarkdown(md);
  if (!text) return "";

  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\n+/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (blocks.length <= 1 && text.length > 200) {
    const parts = text
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 3) {
      const salutation = parts[0].match(/^(dear\b[^.!?]*[,:]?)$/i) ? parts.shift() : "";
      const closingIdx = parts.findIndex((p) =>
        /^(sincerely|regards|best regards|thank you|yours faithfully)/i.test(p),
      );
      const rebuilt: string[] = [];
      if (salutation) rebuilt.push(salutation);
      if (closingIdx > 0) {
        rebuilt.push(parts.slice(0, closingIdx).join(" "));
        rebuilt.push(...parts.slice(closingIdx));
      } else {
        rebuilt.push(...parts);
      }
      return `${rebuilt.filter(Boolean).join("\n\n").trim()}\n`;
    }
  }

  return `${blocks.join("\n\n").trim()}\n`;
}

export function sanitizeAtsMarkdown(md: string): string {
  let text = normalizeProseMarkdown(md).replace(/^\s*-{3,}\s*$/gm, "");

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
