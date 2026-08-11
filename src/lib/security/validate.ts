import { z } from "zod";

export const LIMITS = {
  name: 120,
  resume: 120_000,
  jd: 80_000,
  experience: 40_000,
  answer: 40_000,
  codeAnswer: 60_000,
  coachAsk: 8_000,
  url: 2_048,
  jsonBodyBytes: 1_500_000,
} as const;

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return uuidRe.test(value);
}

/** Strip NULs and normalize newlines; cap length. */
export function sanitizeText(input: string, max: number): string {
  return input
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, max);
}

/**
 * Validate job/LinkedIn URLs for storage (we do not server-fetch them).
 * Blocks dangerous schemes and credentials-in-URL.
 */
export function validatePublicHttpUrl(raw: string): {
  ok: true;
  url: string;
} | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, url: "" };
  if (trimmed.length > LIMITS.url) {
    return { ok: false, error: `URL too long (max ${LIMITS.url})` };
  }
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return { ok: false, error: "URL contains control characters" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "URL must be http or https" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "URL must not include credentials" };
  }
  if (!parsed.hostname || parsed.hostname === ".") {
    return { ok: false, error: "URL host is required" };
  }
  // Block obvious XSS / script hosts in href context
  if (/^(javascript|data|vbscript|file|blob):/i.test(trimmed)) {
    return { ok: false, error: "Blocked URL scheme" };
  }

  return { ok: true, url: parsed.toString() };
}

/**
 * OpenClaw base URL must stay on loopback / explicit private allowlist
 * to prevent token exfiltration via env misconfig.
 */
export function assertSafeInternalBaseUrl(raw: string): URL {
  const parsed = new URL(raw);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Internal API URL must be http(s)");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Internal API URL must not include credentials");
  }
  const host = parsed.hostname.toLowerCase();
  const allowed =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost");
  if (!allowed && process.env.AI_ALLOW_REMOTE !== "true") {
    throw new Error(
      "AI endpoint must be localhost by default; set AI_ALLOW_REMOTE=true only for an explicitly trusted endpoint",
    );
  }
  return parsed;
}

export const CreateInterviewSchema = z.object({
  name: z.string().max(LIMITS.name).optional(),
});

export const PatchInterviewSchema = z.object({
  name: z.string().max(LIMITS.name).optional(),
  resumeId: z.string().uuid().nullable().optional(),
  resumeText: z.string().max(LIMITS.resume).optional(),
  jdText: z.string().max(LIMITS.jd).optional(),
  jdUrl: z.string().max(LIMITS.url).optional(),
  experienceNotes: z.string().max(LIMITS.experience).optional(),
  runtimePreference: z.enum(["auto", "cursor", "openclaw"]).optional(),
  interviewerPersona: z
    .enum([
      "azure_devops_architect",
      "platform_engineering_manager",
      "principal_sre",
      "cloud_architect",
      "engineering_director",
      "cto",
      "default",
    ])
    .optional(),
  status: z.enum(["setup", "ready", "active", "completed"]).optional(),
});

export const CreateResumeSchema = z.object({
  name: z.string().max(LIMITS.name).optional(),
  originalFilename: z.string().max(LIMITS.name).optional(),
  content: z.string().max(LIMITS.resume).optional(),
  seedDefault: z.boolean().optional(),
});

export const AnswerSchema = z.object({
  turnId: z.string().uuid(),
  answer: z.string().min(1).max(LIMITS.answer),
  codeAnswer: z.string().max(LIMITS.codeAnswer).optional(),
  answerMode: z.enum(["voice", "text", "mixed"]).optional(),
});

export const CoachAskSchema = z.object({
  turnId: z.string().uuid(),
  field: z.enum(["howToImprove", "enterpriseImprovements"]),
  itemIndex: z.number().int().min(0).nullable().optional(),
  question: z.string().min(1).max(LIMITS.coachAsk),
});

/** Soften prompt-injection payloads before stuffing into model context. */
export function neutralizeForPrompt(text: string): string {
  return text
    .replace(/```/g, "'''")
    .replace(/\u0000/g, "")
    .slice(0, LIMITS.resume);
}
