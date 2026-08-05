import { createHash } from "crypto";

const FOCUS_KEYWORDS = [
  "Azure DevOps",
  "Azure",
  "AWS",
  "GCP",
  "Kubernetes",
  "AKS",
  "Terraform",
  "DevOps",
  "DevSecOps",
  "SRE",
  "Platform",
  "CI/CD",
  "Docker",
  "Linux",
] as const;

export function computeContextFingerprint(input: {
  resumeId?: string | null;
  resumeText: string;
  jdText: string;
  jdUrl: string;
  experienceNotes: string;
}): string {
  const raw = [
    input.resumeId?.trim() || "",
    input.resumeText.trim(),
    input.jdText.trim(),
    input.jdUrl.trim(),
    input.experienceNotes.trim(),
  ].join("\n");
  return createHash("sha256").update(raw).digest("hex");
}

export function deriveInterviewTitle(jdText: string, jdUrl = ""): string {
  const text = `${jdText}\n${jdUrl}`.trim();
  if (!text) return "New interview";

  let company = "";
  const companyMatch =
    text.match(
      /(?:at|@|company[:\s]+)\s*([A-Z][A-Za-z0-9&.'\-\s]{1,40})/,
    ) ||
    text.match(
      /^([A-Z][A-Za-z0-9&.'\-]{2,40})\s*[—–\-|:]/m,
    );
  if (companyMatch?.[1]) {
    company = companyMatch[1].trim().replace(/\s+/g, " ").slice(0, 40);
  }

  let focus = "";
  const lower = text.toLowerCase();
  for (const kw of FOCUS_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      focus = kw;
      break;
    }
  }

  if (company && focus) return `${company} · ${focus}`;
  if (company) return company;
  if (focus) return focus;

  const roleMatch = text.match(
    /(?:senior|staff|principal|lead)?\s*([A-Za-z][A-Za-z0-9 /\-]{3,50}(?:engineer|architect|developer|manager))/i,
  );
  if (roleMatch?.[1]) return roleMatch[1].trim().slice(0, 60);

  return text.slice(0, 48).replace(/\s+/g, " ").trim() || "New interview";
}

export function formatResumeDisplayName(originalFilename: string, when = new Date()): string {
  const base =
    originalFilename.replace(/\.[^.]+$/, "").trim() ||
    originalFilename.trim() ||
    "Resume";
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())} ${pad(when.getHours())}:${pad(when.getMinutes())}`;
  return `${base.slice(0, 80)} · ${stamp}`;
}
