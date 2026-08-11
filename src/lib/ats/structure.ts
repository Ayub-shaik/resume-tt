import { runOpenClaw } from "@/lib/runtime/openclaw";
import { ephemeralOpenClawSession } from "@/lib/runtime/sessionKey";
import { neutralizeForPrompt } from "@/lib/security/validate";
import { extractJsonObject } from "@/lib/ats/json";
import {
  JsonResumeSchema,
  jsonResumeToMarkdown,
  type JsonResume,
} from "@/lib/ats/jsonresume";
import { sanitizeAtsMarkdown } from "@/lib/ats/sanitize";

const STRUCTURE_SYSTEM = `You convert resume text into JSON Resume (https://jsonresume.org/schema).
Return ONLY a JSON object with keys: basics, work, education, skills, certificates, projects, meta.
Rules:
- Use ONLY facts present in the source. Never invent employers, dates, metrics, or certifications.
- basics.name, basics.label (target title), basics.email/phone/url when present
- work[].position, name (company), startDate/endDate (YYYY-MM when possible), highlights as achievement bullets
- skills as groups with name + keywords[]
- Keep dates as strings; use empty string for missing endDate if current role (or "Present")
- Prefer concise, ATS-friendly wording already in the source`;

const TAILOR_JSON_SYSTEM = `You tailor a JSON Resume for ONE job description.
HARD RULES:
- Use ONLY facts already in the input JSON Resume. Never invent employers, dates, metrics, tools, or certifications.
- Keep the same work employers, titles, and date ranges. You may rephrase highlights to match JD vocabulary; do not reorder major sections unless necessary for ATS clarity.
- Update basics.label toward the JD if truthful.
- skills.keywords may be emphasized using terms that already exist in the resume; avoid inventing keywords.
- Return ONLY the full JSON Resume object (basics, work, education, skills, certificates, projects, meta).`;

function memorySuffix(memoryContext?: string): string {
  return memoryContext?.trim()
    ? `\n\nDurable prior-session memory (continuity only; current input is authoritative):\n${neutralizeForPrompt(memoryContext)}`
    : "";
}

export async function structureResumeToJson(input: {
  resumeText: string;
  sessionKey?: string;
  signal?: AbortSignal;
  memoryContext?: string;
}): Promise<{ jsonResume: JsonResume; markdown: string }> {
  const result = await runOpenClaw(
    [
      { role: "system", content: `${STRUCTURE_SYSTEM}${memorySuffix(input.memoryContext)}` },
      {
        role: "user",
        content: `Convert this resume to JSON Resume:\n\n${neutralizeForPrompt(input.resumeText)}`,
      },
    ],
    {
      sessionKey: input.sessionKey || ephemeralOpenClawSession("ats-structure"),
      signal: input.signal,
    },
  );
  const parsed = JsonResumeSchema.parse(extractJsonObject(result.text));
  const withMeta: JsonResume = {
    ...parsed,
    $schema:
      "https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json",
    meta: {
      ...(parsed.meta || {}),
      version: "v1.0.0",
      lastModified: new Date().toISOString(),
    },
  };
  return {
    jsonResume: withMeta,
    markdown: sanitizeAtsMarkdown(jsonResumeToMarkdown(withMeta)),
  };
}

const IMPROVE_JSON_SYSTEM = `You improve a JSON Resume per the user's instruction.
HARD RULES:
- Use ONLY facts already in the input JSON Resume (and optional JD if provided). Never invent employers, dates, metrics, tools, or certifications.
- PRESERVE the existing section order and field layout unless the user explicitly asks to reorder sections.
- Do not move Skills before Summary (or any other reorder) unless requested.
- You may rephrase highlights, strengthen summary/label, and fill thin bullets using truthful restatement of existing content.
- Do not invent new bullets that only restate existing lines in a different section.
- If the user asks for a target role (e.g. DevOps) and a JD is provided, align vocabulary to the JD without fabricating experience.
- If no JD is provided, improve clarity, impact phrasing, and ATS structure only from the resume itself.
- Return ONLY the full JSON Resume object (basics, work, education, skills, certificates, projects, meta).`;

export async function tailorJsonResume(input: {
  jsonResume: JsonResume;
  jdText: string;
  sessionKey?: string;
  signal?: AbortSignal;
  memoryContext?: string;
}): Promise<{ jsonResume: JsonResume; markdown: string }> {
  if (!input.jdText.trim()) {
    return improveJsonResume({
      jsonResume: input.jsonResume,
      instruction:
        "Strengthen wording and ATS clarity for a general professional resume. Do not invent facts.",
      jdText: "",
      sessionKey: input.sessionKey || ephemeralOpenClawSession("ats-tailor-json"),
      signal: input.signal,
      memoryContext: input.memoryContext,
    });
  }
  const result = await runOpenClaw(
    [
      { role: "system", content: `${TAILOR_JSON_SYSTEM}${memorySuffix(input.memoryContext)}` },
      {
        role: "user",
        content: `JD:\n${neutralizeForPrompt(input.jdText)}\n\nJSON Resume:\n${JSON.stringify(input.jsonResume)}`,
      },
    ],
    {
      sessionKey: input.sessionKey || ephemeralOpenClawSession("ats-tailor-json"),
      signal: input.signal,
    },
  );
  const parsed = JsonResumeSchema.parse(extractJsonObject(result.text));
  const withMeta: JsonResume = {
    ...parsed,
    $schema:
      "https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json",
    meta: {
      ...(parsed.meta || {}),
      version: "v1.0.0",
      lastModified: new Date().toISOString(),
    },
  };
  return {
    jsonResume: withMeta,
    markdown: sanitizeAtsMarkdown(jsonResumeToMarkdown(withMeta)),
  };
}

function withResumeMeta(parsed: JsonResume): JsonResume {
  return {
    ...parsed,
    $schema:
      "https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json",
    meta: {
      ...(parsed.meta || {}),
      version: "v1.0.0",
      lastModified: new Date().toISOString(),
    },
  };
}

export async function improveJsonResume(input: {
  jsonResume: JsonResume;
  instruction: string;
  jdText?: string;
  sessionKey?: string;
  signal?: AbortSignal;
  memoryContext?: string;
}): Promise<{ jsonResume: JsonResume; markdown: string }> {
  const instruction = input.instruction.trim();
  if (!instruction) throw new Error("Instruction required");

  const result = await runOpenClaw(
    [
      { role: "system", content: `${IMPROVE_JSON_SYSTEM}${memorySuffix(input.memoryContext)}` },
      {
        role: "user",
        content: `User instruction:\n${neutralizeForPrompt(instruction)}\n\n${
          input.jdText?.trim()
            ? `Optional JD:\n${neutralizeForPrompt(input.jdText)}\n\n`
            : "No JD provided.\n\n"
        }JSON Resume:\n${JSON.stringify(input.jsonResume)}`,
      },
    ],
    {
      sessionKey: input.sessionKey || ephemeralOpenClawSession("ats-improve-json"),
      signal: input.signal,
    },
  );
  const withMeta = withResumeMeta(
    JsonResumeSchema.parse(extractJsonObject(result.text)),
  );
  return {
    jsonResume: withMeta,
    markdown: sanitizeAtsMarkdown(jsonResumeToMarkdown(withMeta)),
  };
}

/** Single OpenClaw call: structure resume text + apply improve instruction. */
export async function improveResumeText(input: {
  resumeText: string;
  instruction: string;
  jdText?: string;
  sessionKey?: string;
  signal?: AbortSignal;
  memoryContext?: string;
}): Promise<{ jsonResume: JsonResume; markdown: string }> {
  const instruction = input.instruction.trim();
  if (!instruction) throw new Error("Instruction required");
  if (!input.resumeText.trim()) throw new Error("resumeText required");

  const result = await runOpenClaw(
    [
      {
        role: "system",
        content: `${STRUCTURE_SYSTEM}

THEN apply this improvement pass with the same hard rules as:
${IMPROVE_JSON_SYSTEM}${memorySuffix(input.memoryContext)}

Return ONLY the final improved JSON Resume object in one response.`,
      },
      {
        role: "user",
        content: `User instruction:\n${neutralizeForPrompt(instruction)}\n\n${
          input.jdText?.trim()
            ? `Optional JD:\n${neutralizeForPrompt(input.jdText)}\n\n`
            : "No JD provided.\n\n"
        }Resume text:\n${neutralizeForPrompt(input.resumeText)}`,
      },
    ],
    {
      sessionKey: input.sessionKey || ephemeralOpenClawSession("ats-improve-text"),
      signal: input.signal,
    },
  );
  const withMeta = withResumeMeta(
    JsonResumeSchema.parse(extractJsonObject(result.text)),
  );
  return {
    jsonResume: withMeta,
    markdown: sanitizeAtsMarkdown(jsonResumeToMarkdown(withMeta)),
  };
}

