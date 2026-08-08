import { validatePublicHttpUrl, sanitizeText, LIMITS } from "@/lib/security/validate";

const FETCH_TIMEOUT_MS = 18_000;
const MAX_BYTES = 2 * 1024 * 1024;

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function assertSafeFetchHost(hostname: string): void {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "metadata.google.internal" ||
    host.endsWith(".internal")
  ) {
    throw new Error("That URL host is not allowed");
  }
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) {
    throw new Error("That URL host is not allowed");
  }
  if (isPrivateIpv4(host)) {
    throw new Error("That URL host is not allowed");
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)));
}

function stripHtml(html: string): string {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|section|article|header|footer)>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeHtmlEntities(s);
  return s
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function nodeJobPosting(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  const rec = node as Record<string, unknown>;
  const type = rec["@type"];
  const types = Array.isArray(type) ? type : type ? [type] : [];
  if (types.some((t) => String(t).toLowerCase() === "jobposting")) {
    return rec;
  }
  return null;
}

function collectJsonLdNodes(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.flatMap((item) => collectJsonLdNodes(item));
  }
  if (typeof data !== "object") return [];
  const rec = data as Record<string, unknown>;
  const graph = rec["@graph"];
  if (Array.isArray(graph)) {
    return graph.filter((n): n is Record<string, unknown> => typeof n === "object");
  }
  return [rec];
}

function formatJobPosting(job: Record<string, unknown>): string {
  const parts: string[] = [];
  if (job.title) parts.push(`Title: ${String(job.title).trim()}`);
  const org = job.hiringOrganization;
  if (org && typeof org === "object" && "name" in org) {
    parts.push(`Company: ${String((org as { name?: string }).name || "").trim()}`);
  }
  if (job.employmentType) {
    parts.push(`Employment: ${String(job.employmentType)}`);
  }
  if (job.jobLocation) {
    parts.push(`Location: ${JSON.stringify(job.jobLocation)}`);
  }
  if (job.description) {
    parts.push(stripHtml(String(job.description)));
  }
  if (job.qualifications) {
    parts.push(stripHtml(String(job.qualifications)));
  }
  if (job.responsibilities) {
    parts.push(stripHtml(String(job.responsibilities)));
  }
  if (job.skills) {
    parts.push(`Skills: ${String(job.skills)}`);
  }
  return parts.filter(Boolean).join("\n\n").trim();
}

function extractFromJsonLd(html: string): string | null {
  const scripts = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  for (const match of scripts) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      for (const node of collectJsonLdNodes(parsed)) {
        const job = nodeJobPosting(node);
        if (job) {
          const text = formatJobPosting(job);
          if (text.length >= 120) return text;
        }
      }
    } catch {
      /* try next script block */
    }
  }
  return null;
}

function extractFromMeta(html: string): string | null {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const og = html.match(
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  )?.[1];
  const desc = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  )?.[1];
  const parts = [title, og, desc]
    .map((p) => (p ? stripHtml(p) : ""))
    .filter((p) => p.length > 20);
  const joined = dedupeParagraphs(parts.join("\n\n").trim());
  return joined.length >= 120 ? joined : null;
}

/** LinkedIn public job pages put the full JD in collapsed rich HTML (Show more). */
function extractLinkedInRichDescription(html: string): string | null {
  const patterns = [
    /class="[^"]*show-more-less-html__markup[^"]*"[\s\S]*?>([\s\S]*?)<\/div>/i,
    /class="[^"]*description__text--rich[^"]*"[\s\S]*?>([\s\S]*?)<\/div>/i,
    /class="[^"]*description__text[^"]*"[\s\S]*?>([\s\S]*?)<\/div>/i,
  ];
  let best = "";
  for (const re of patterns) {
    for (const match of html.matchAll(new RegExp(re.source, "gi"))) {
      const text = stripHtml(match[1] || "");
      if (text.length > best.length) best = text;
    }
  }
  best = dedupeParagraphs(best);
  // Real JDs are much longer than the og: teaser (~150–250 chars)
  return best.length >= 400 ? best : null;
}

function isLinkedInJobHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "linkedin.com" || h.endsWith(".linkedin.com");
}

/** Meta teaser LinkedIn serves bots / collapsed previews. */
function looksLikeLinkedInTeaser(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 80) return true;
  if (/see this and similar jobs on linkedin/i.test(t)) return true;
  if (/^posted\s+\d/i.test(t) && t.length < 500) return true;
  // Duplicated short blurb pasted twice
  const half = Math.floor(t.length / 2);
  if (half > 80 && t.slice(0, half).trim() === t.slice(half).trim()) return true;
  return false;
}

function dedupeParagraphs(text: string): string {
  const parts = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const key = p.replace(/\s+/g, " ").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.join("\n\n").trim();
}

function pickBestText(candidates: (string | null | undefined)[]): string {
  let best = "";
  for (const c of candidates) {
    const t = dedupeParagraphs((c || "").trim());
    if (!t) continue;
    if (looksLikeLinkedInTeaser(t) && t.length < 600) continue;
    if (t.length > best.length) best = t;
  }
  return best;
}

function extractPageText(html: string, hostname: string): string {
  const linkedIn = isLinkedInJobHost(hostname);
  const linkedInRich = linkedIn ? extractLinkedInRichDescription(html) : null;
  if (linkedInRich) return linkedInRich;

  const fromLd = extractFromJsonLd(html);
  if (fromLd && !(linkedIn && looksLikeLinkedInTeaser(fromLd))) {
    return dedupeParagraphs(fromLd);
  }

  const fromMeta = extractFromMeta(html);
  if (fromMeta && !(linkedIn && looksLikeLinkedInTeaser(fromMeta))) {
    return dedupeParagraphs(fromMeta);
  }

  // Avoid full-page stripHtml on LinkedIn — it is mostly chrome + teaser.
  if (linkedIn) {
    return dedupeParagraphs(fromLd || fromMeta || "");
  }

  const fromBody = stripHtml(html);
  return pickBestText([fromLd, fromMeta, fromBody]);
}

async function readLimitedBody(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      throw new Error("Job page is too large to fetch");
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      throw new Error("Job page is too large to fetch");
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

export type FetchedJobDescription = {
  text: string;
  title?: string;
  sourceUrl: string;
};

export async function fetchJobDescriptionFromUrl(
  rawUrl: string,
): Promise<FetchedJobDescription> {
  const validated = validatePublicHttpUrl(rawUrl);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  const url = validated.url;
  if (!url) {
    throw new Error("URL required");
  }

  const parsed = new URL(url);
  assertSafeFetchHost(parsed.hostname);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      redirect: "follow",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) {
      throw new Error(`Could not fetch job page (HTTP ${res.status})`);
    }
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error("URL did not return an HTML job page");
    }

    const html = await readLimitedBody(res);
    const extracted = extractPageText(html, parsed.hostname);
    const text = sanitizeText(extracted, LIMITS.jd);

    if (
      isLinkedInJobHost(parsed.hostname) &&
      (text.length < 400 || looksLikeLinkedInTeaser(text))
    ) {
      throw new Error(
        "LinkedIn only returned a short preview (the text under “Show more” is not in that preview). Open the job → Show more → copy the full description into the JD box, or use the company’s careers-page URL.",
      );
    }

    if (text.length < 120) {
      throw new Error(
        "Could not extract enough job description text from that URL. Paste the JD manually, or try a public careers-page link.",
      );
    }

    const title =
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ||
      undefined;

    return {
      text,
      title: title ? sanitizeText(stripHtml(title), 200) : undefined,
      sourceUrl: parsed.toString(),
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Timed out fetching job URL");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
