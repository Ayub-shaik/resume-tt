import type { AtsAnalysis } from "@/lib/ats/analyze";
import type { JsonResume } from "@/lib/ats/jsonresume";
import type { TemplateId } from "@/lib/ats/templates";

export type AtsDraftTab = "prepare" | "analyze" | "improve" | "builder";

export type AtsDraft = {
  version: 1;
  updatedAt: string;
  tab: AtsDraftTab;
  resumeText: string;
  jdText: string;
  originalText: string;
  improvedText: string;
  analysis: AtsAnalysis | null;
  jsonResume: JsonResume | null;
  selectedTemplate: TemplateId;
  sessionId: string | null;
  sessionName: string;
  instruction: string;
  chat: Array<{ role: "user" | "assistant"; text: string }>;
};

const KEY = "mpi.ats.draft.v1";

export function loadAtsDraft(): AtsDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AtsDraft;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAtsDraft(draft: AtsDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function clearAtsDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
