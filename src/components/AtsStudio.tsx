"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { DriveBrowserModal } from "@/components/DriveBrowserModal";
import { AnalyzeLoadingPanel } from "@/components/AnalyzeLoadingPanel";
import { AnalyzeWorkbench, suggestionKey } from "@/components/AnalyzeWorkbench";
import { ResumeBuilder } from "@/components/ResumeBuilder";
import { CareerBrandPanel } from "@/components/CareerBrandPanel";
import { PdfPreview } from "@/components/PdfPreview";
import {
  fetchPreviewBlob,
  ResumeAsIsPreview,
} from "@/components/ResumeAsIsPreview";
import { ImproveSpeedometers, type TailorRowState } from "@/components/ImproveSpeedometers";
import { diffResumeLines } from "@/lib/ats/resumeLineDiff";
import {
  buildScoreExplanation,
  type ScoreExplainTopic,
} from "@/lib/ats/scoreExplain";
import { fetchJson } from "@/lib/fetchJson";
import {
  scoreTriple,
  isUsableJdText,
  type TripleScores,
} from "@/lib/ats/keywords";
import { assessResumeInput } from "@/lib/ats/resumeGate";
import type { ImproveFocus, ResumeVersion } from "@tomorrowtools/resume-brain";
import type { AtsAnalysis } from "@/lib/ats/analyze";
import { isNovelSuggestion } from "@/lib/ats/dedupe";
import { applyAllSuggestions } from "@/lib/ats/applySuggestions";
import { accommodateKeywordInExperience } from "@/lib/ats/dualPage";
import type { JsonResume } from "@/lib/ats/jsonresume";
import { jsonResumeToMarkdown } from "@/lib/ats/jsonresume";
import { quickScores, type QuickScores } from "@/lib/ats/keywords";
import { isStandaloneJobUrl } from "@/lib/ats/jdUrl";
import type { TemplateId } from "@/lib/ats/templates";
import { TEMPLATE_META, isTemplateId } from "@/lib/ats/templates";
import { loadAtsDraft, saveAtsDraft, clearAtsDraft } from "@/lib/ats/draftStore";
import type { Resume } from "@/lib/types";

const TAILOR_FEED_TICKS = [
  "Scanning sections…",
  "Matching JD vocabulary…",
  "Reordering bullets…",
  "Checking fact ledger…",
  "Polishing wording…",
] as const;

function emptyTailorRow(): TailorRowState {
  return {
    improveCount: 0,
    afterScores: null,
    changeLines: [],
    feedActive: false,
    history: [],
  };
}

type AnalyzeVersionSnap = {
  id: string;
  label: string; // v1, v2…
  resumeText: string;
  jdText: string;
  analysis: AtsAnalysis;
  masterScores: TripleScores | null;
  tailorRows: Record<ImproveFocus, TailorRowState>;
  createdAt: string;
};

function isDestructiveSuggestion(s: {
  area: string;
  current: string;
  suggested: string;
  why: string;
}): boolean {
  const t = `${s.area} ${s.why} ${s.suggested} ${s.current}`.toLowerCase();
  if (/\b(remove|delete|strip|drop)\b.*\b(address|phone|email|location|contact|linkedin)\b/.test(t)) {
    return true;
  }
  if (/^(remove|delete|cut)\b/i.test(s.suggested.trim())) return true;
  if (
    s.suggested.trim().length < 20 &&
    /\b(remove|delete)\b/i.test(`${s.why} ${s.suggested}`)
  ) {
    return true;
  }
  return false;
}

function defaultTailorRows(): Record<ImproveFocus, TailorRowState> {
  return {
    ats: emptyTailorRow(),
    jd: emptyTailorRow(),
    balanced: emptyTailorRow(),
  };
}

const ANALYZE_STAGES = [
  "Parsing resume…",
  "Reading job description…",
  "Scoring coverage…",
  "Building dual view…",
  "Finalising analysis…",
] as const;
/** Target analyse UX pacing (~28s to last stage; hold after). */
const ANALYZE_STAGE_MS = 5600;

type Tab = "prepare" | "analyze" | "builder" | "brand";
type StoredTab = Tab | "improve";
type ChatMsg = { role: "user" | "assistant"; text: string };
type AtsSessionRow = {
  id: string;
  name: string;
  step: StoredTab;
  resumeText: string;
  jdText: string;
  originalText: string;
  improvedText: string;
  jsonResumeJson: string | null;
  analysisJson: string | null;
  templateId: string | null;
  updatedAt: string;
};

export function AtsStudio() {
  const [navOpen, setNavOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("prepare");
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [jdSourceUrl, setJdSourceUrl] = useState<string | null>(null);
  const [jdFetching, setJdFetching] = useState(false);
  const [jsonResume, setJsonResume] = useState<JsonResume | null>(null);
  const [analysis, setAnalysis] = useState<AtsAnalysis | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [analyzeStage, setAnalyzeStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [driveMsg, setDriveMsg] = useState<string | null>(null);
  const [uploadMenu, setUploadMenu] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [analyzeBaselineText, setAnalyzeBaselineText] = useState("");
  const [improvedText, setImprovedText] = useState("");
  const [scoresBefore, setScoresBefore] = useState<QuickScores | null>(null);
  const [scoresAfter, setScoresAfter] = useState<QuickScores | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [showExtracted, setShowExtracted] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [instruction, setInstruction] = useState("");
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [sessions, setSessions] = useState<AtsSessionRow[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [dirty, setDirty] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("classic");
  const [masterScores, setMasterScores] = useState<TripleScores | null>(null);
  const [tailorRows, setTailorRows] = useState(defaultTailorRows);
  const [busyFocus, setBusyFocus] = useState<ImproveFocus | null>(null);
  const [scoreExplain, setScoreExplain] = useState<ScoreExplainTopic | null>(
    null,
  );
  const [benchmarkScore, setBenchmarkScore] = useState<number | null>(null);
  const [appliedSuggestionKeys, setAppliedSuggestionKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [queuedMissingKeywords, setQueuedMissingKeywords] = useState<string[]>(
    [],
  );
  const [jdPromptDismissed, setJdPromptDismissed] = useState(false);
  const [showInlineJd, setShowInlineJd] = useState(false);
  const [analyzeVersions, setAnalyzeVersions] = useState<AnalyzeVersionSnap[]>(
    [],
  );
  const [activeAnalyzeVersion, setActiveAnalyzeVersion] = useState<
    string | null
  >(null);
  const [applyingAll, setApplyingAll] = useState(false);
  const [pdfPreviewPages, setPdfPreviewPages] = useState<string[]>([]);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const pdfBlobRef = useRef<string | null>(null);
  const draftHydrated = useRef(false);
  const pendingAutoAnalyze = useRef(false);
  const analyzeAbortRef = useRef<AbortController | null>(null);

  const markDirty = useCallback(() => setDirty(true), []);

  function resetAnalysisPipeline(opts?: { keepResume?: boolean }) {
    setAnalysis(null);
    setMasterScores(null);
    setTailorRows(defaultTailorRows());
    setAppliedSuggestionKeys(new Set());
    setQueuedMissingKeywords([]);
    setBenchmarkScore(null);
    setAnalyzeBaselineText("");
    setAnalyzeVersions([]);
    setActiveAnalyzeVersion(null);
    setJdPromptDismissed(false);
    setShowInlineJd(false);
    if (!opts?.keepResume) {
      setResumeText("");
      setJdText("");
      setJdSourceUrl(null);
      setOriginalText("");
      setImprovedText("");
      setJsonResume(null);
      setPreviewUrl(null);
      setPreviewMime(null);
      setPreviewName(null);
      setShowExtracted(true);
    }
    setSessionId(null);
    setSessionName("");
    setDirty(false);
    clearAtsDraft();
  }

  function restartWithDoubleConfirm() {
    if (
      !window.confirm(
        "Restart analysis? This clears analyse/tailor progress and returns to Prepare.",
      )
    ) {
      return;
    }
    if (
      !window.confirm(
        "Confirm restart: unsaved analyse history and tailor versions will be lost.",
      )
    ) {
      return;
    }
    resetAnalysisPipeline({ keepResume: true });
    setTab("prepare");
  }

  function invalidatePipelineOnInputChange(opts?: { clearOriginal?: boolean }) {
    setAnalysis(null);
    setMasterScores(null);
    setTailorRows(defaultTailorRows());
    setAppliedSuggestionKeys(new Set());
    setQueuedMissingKeywords([]);
    setBenchmarkScore(null);
    setAnalyzeBaselineText("");
    setScoresBefore(null);
    setScoresAfter(null);
    setAnalyzeVersions([]);
    setActiveAnalyzeVersion(null);
    setJdPromptDismissed(false);
    if (opts?.clearOriginal) {
      setOriginalText("");
      setImprovedText("");
    }
  }

  function queueMissingKeyword(keyword: string) {
    const kw = keyword.trim();
    if (!kw) return;
    setQueuedMissingKeywords((prev) =>
      prev.includes(kw) ? prev : [...prev, kw],
    );
  }

  function startNewAnalysis() {
    if (
      dirty &&
      !window.confirm("Start a new analysis? Unsaved changes will be lost.")
    ) {
      return;
    }
    resetAnalysisPipeline({ keepResume: true });
    setTab("prepare");
  }

  function syncKeywordChipsFromDraft(draft: string, jd: string) {
    const scored = scoreTriple(draft, jd);
    setAnalysis((prev) =>
      prev
        ? {
            ...prev,
            matchedKeywords: scored.matchedKeywords,
            missingKeywords: scored.missingKeywords,
            keywordMatchPct: scored.keywordMatchPct,
            heuristic: {
              keywordMatchPct: scored.keywordMatchPct,
              matchedKeywords: scored.matchedKeywords,
              missingKeywords: scored.missingKeywords,
            },
          }
        : prev,
    );
    setQueuedMissingKeywords((prev) =>
      prev.filter(
        (k) =>
          !draft.toLowerCase().includes(k.toLowerCase()) &&
          scored.missingKeywords.some(
            (m) => m.toLowerCase() === k.toLowerCase(),
          ),
      ),
    );
  }

  async function resolveJdText(raw = jdText): Promise<string> {
    const trimmed = raw.trim();
    if (!trimmed || !isStandaloneJobUrl(trimmed)) {
      return trimmed;
    }
    setJdFetching(true);
    setError(null);
    try {
      const { res, data } = await fetchJson<{
        error?: string;
        text?: string;
        sourceUrl?: string;
        title?: string;
      }>("/api/ats/jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok || !data.text?.trim()) {
        throw new Error(data.error || "Could not fetch job description");
      }
      setJdText(data.text);
      setJdSourceUrl(data.sourceUrl || trimmed);
      markDirty();
      return data.text;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setJdFetching(false);
    }
  }

  const refreshResumes = useCallback(async () => {
    const res = await fetch("/api/resumes");
    const data = await res.json();
    if (res.ok) setResumes(data.resumes || []);
  }, []);

  const refreshSessions = useCallback(async () => {
    const res = await fetch("/api/ats/sessions");
    const data = await res.json();
    if (res.ok) setSessions(data.sessions || []);
  }, []);

  // Restore draft after remount (mobile↔desktop layout flip / refresh)
  useEffect(() => {
    if (draftHydrated.current) return;
    draftHydrated.current = true;
    const draft = loadAtsDraft();
    if (!draft) return;
    if (!draft.resumeText.trim() && !draft.jdText.trim() && !draft.analysis) {
      return;
    }
    setTab(
      draft.tab === "improve"
        ? "analyze"
        : draft.tab === "brand"
          ? "brand"
          : draft.tab === "builder" || draft.tab === "analyze" || draft.tab === "prepare"
            ? draft.tab
            : "prepare",
    );
    setResumeText(draft.resumeText);
    setJdText(draft.jdText);
    setOriginalText(draft.originalText);
    setImprovedText(draft.improvedText);
    setAnalysis(draft.analysis);
    setJsonResume(draft.jsonResume);
    setSelectedTemplate(
      isTemplateId(draft.selectedTemplate) ? draft.selectedTemplate : "classic",
    );
    setSessionId(draft.sessionId);
    setSessionName(draft.sessionName);
    setInstruction(draft.instruction);
    setChat(draft.chat || []);
    setDirty(true);
  }, []);

  // Debounced local draft persist
  useEffect(() => {
    if (!draftHydrated.current) return;
    const t = window.setTimeout(() => {
      saveAtsDraft({
        version: 1,
        updatedAt: new Date().toISOString(),
        tab,
        resumeText,
        jdText,
        originalText,
        improvedText,
        analysis,
        jsonResume,
        selectedTemplate,
        sessionId,
        sessionName,
        instruction,
        chat,
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [
    tab,
    resumeText,
    jdText,
    originalText,
    improvedText,
    analysis,
    jsonResume,
    selectedTemplate,
    sessionId,
    sessionName,
    instruction,
    chat,
  ]);

  useEffect(() => {
    void fetch("/api/drive")
      .then((r) => r.json())
      .then((d) => {
        setDriveConnected(Boolean(d.connected));
        setDriveEmail(d.googleEmail || null);
      })
      .catch(() => undefined);
    void refreshResumes();
    void refreshSessions();
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      if (pdfBlobRef.current) URL.revokeObjectURL(pdfBlobRef.current);
    };
  }, [refreshResumes, refreshSessions]);

  useEffect(() => {
    if (!uploadMenu) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setUploadMenu(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [uploadMenu]);

  const workingResumeForTemplates = useMemo(() => {
    if (improvedText.trim()) return improvedText;
    return resumeText;
  }, [improvedText, resumeText]);

  function setLocalPreview(file: File) {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setPreviewUrl(url);
    const lower = file.name.toLowerCase();
    const mime =
      file.type ||
      (lower.endsWith(".pdf")
        ? "application/pdf"
        : lower.endsWith(".docx")
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : null);
    setPreviewMime(mime);
    setPreviewName(file.name);
  }

  async function parseUpload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/resumes/parse", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Parse failed");
    return String(data.text || "");
  }

  async function importFromDrive(fileId: string, name: string, mime?: string) {
    setBusy("parse");
    setError(null);
    try {
      const res = await fetch("/api/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      const text = data.resume.content as string;
      invalidatePipelineOnInputChange({ clearOriginal: true });
      setResumeText(text);
      setOriginalText(text);
      setImprovedText("");
      setScoresBefore(null);
      setScoresAfter(null);
      setJsonResume(null);
      setPreviewName(data.resume.name || name);
      try {
        const preview = await fetchPreviewBlob(fileId);
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = preview.url;
        setPreviewUrl(preview.url);
        setPreviewMime(preview.mimeType || mime || "application/pdf");
        setShowExtracted(false);
      } catch {
        setPreviewUrl(null);
        setShowExtracted(true);
      }
      setDriveMsg(`Imported ${data.resume.name || name}`);
      markDirty();
      await refreshResumes();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function loadEarlierResume(id: string) {
    const found = resumes.find((r) => r.id === id);
    if (!found) return;
    invalidatePipelineOnInputChange({ clearOriginal: true });
    setResumeText(found.content);
    setOriginalText(found.content);
    setImprovedText("");
    setScoresBefore(null);
    setScoresAfter(null);
    setJsonResume(null);
    setPreviewUrl(null);
    setPreviewName(found.name);
    setShowExtracted(true);
    markDirty();
  }

  async function saveSession(opts?: { silent?: boolean; nextStep?: Tab }) {
    const name =
      sessionName.trim() ||
      (jsonResume?.basics?.name
        ? `${jsonResume.basics.name} — ATS`
        : `ATS ${new Date().toLocaleString()}`);
    setBusy("save");
    if (!opts?.silent) setError(null);
    try {
      const { res, data } = await fetchJson<{
        error?: string;
        session?: AtsSessionRow;
      }>("/api/ats/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionId || undefined,
          name,
          step: opts?.nextStep || tab,
          resumeText,
          jdText,
          originalText,
          improvedText,
          jsonResume,
          analysis,
          templateId: selectedTemplate,
        }),
      });
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.session) {
        setSessionId(data.session.id);
        setSessionName(data.session.name);
      }
      setDirty(false);
      await refreshSessions();
      // Also persist improved/current text as a resume upload for "earlier" picker
      if ((improvedText || resumeText).trim()) {
        await fetch("/api/resumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalFilename: name,
            content: improvedText.trim() || resumeText,
          }),
        });
        await refreshResumes();
      }
    } catch (e) {
      if (!opts?.silent) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function requestTabChange(next: Tab) {
    if (next === tab) return;
    if (dirty) {
      const choice = window.confirm(
        "Save this ATS flow to history before leaving this step?",
      );
      if (choice) await saveSession({ nextStep: next });
      else if (!window.confirm("Discard unsaved changes and continue?")) return;
    }
    if (next === "analyze") {
      freezeOriginalIfNeeded();
      if (!improvedText.trim() && resumeText.trim()) {
        setImprovedText(resumeText);
      }
    }
    setTab(next);
    if (next === "builder") {
      void ensureJsonResume();
    }
  }

  async function loadSession(id: string) {
    if (dirty) {
      const choice = window.confirm("Save current work before opening history?");
      if (choice) await saveSession();
    }
    const res = await fetch(`/api/ats/sessions?id=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load session");
      return;
    }
    const s = data.session as AtsSessionRow;
    setSessionId(s.id);
    setSessionName(s.name);
    setTab(s.step === "improve" ? "analyze" : s.step || "prepare");
    setResumeText(s.resumeText || "");
    setJdText(s.jdText || "");
    setOriginalText(s.originalText || "");
    setImprovedText(s.improvedText || "");
    try {
      setJsonResume(s.jsonResumeJson ? JSON.parse(s.jsonResumeJson) : null);
    } catch {
      setJsonResume(null);
    }
    try {
      setAnalysis(s.analysisJson ? JSON.parse(s.analysisJson) : null);
    } catch {
      setAnalysis(null);
    }
    setDirty(false);
    setShowExtracted(true);
    setPreviewUrl(null);
  }

  async function deleteSession(id: string) {
    if (!window.confirm("Delete this ATS history item?")) return;
    await fetch("/api/ats/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, delete: true }),
    });
    if (sessionId === id) {
      setSessionId(null);
      setSessionName("");
    }
    await refreshSessions();
  }

  async function ensureStructured(): Promise<JsonResume> {
    if (jsonResume) return jsonResume;
    const { res, data } = await fetchJson<{
      error?: string;
      jsonResume?: JsonResume;
      markdown?: string;
    }>("/api/ats/structure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "structure", resumeText }),
    });
    if (!res.ok) throw new Error(data.error || "Structure failed");
    setJsonResume(data.jsonResume || null);
    if (data.markdown) setResumeText(data.markdown);
    markDirty();
    return data.jsonResume as JsonResume;
  }

  async function runStructure() {
    if (!resumeText.trim()) return;
    setBusy("structure");
    setError(null);
    try {
      await ensureStructured();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (busy !== "analyze") {
      setAnalyzeStage(0);
      return;
    }
    setAnalyzeStage(0);
    const started = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const idx = Math.min(
        ANALYZE_STAGES.length - 1,
        Math.floor(elapsed / ANALYZE_STAGE_MS),
      );
      setAnalyzeStage(idx);
    }, 400);
    return () => window.clearInterval(id);
  }, [busy]);

  useEffect(
    () => () => {
      analyzeAbortRef.current?.abort();
    },
    [],
  );

  async function askAts(input: {
    question: string;
    context: string;
  }): Promise<string> {
    const { res, data } = await fetchJson<{
      error?: string;
      reply?: string;
    }>("/api/ats/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: input.question,
        context: input.context,
        resumeText: resumeText.slice(0, 8000),
        jdText,
      }),
    });
    if (!res.ok) throw new Error(data.error || "Ask failed");
    return String(data.reply || "No reply.");
  }

  function stopAnalyze() {
    analyzeAbortRef.current?.abort();
    analyzeAbortRef.current = null;
    setBusy(null);
  }

  async function runAnalyze(opts?: {
    silentTab?: boolean;
    /** Preserve tailor version counters (re-score only). */
    preserveTailor?: boolean;
  }) {
    if (!resumeText.trim()) {
      setError(
        "Please check your resume — there is less data to start from.",
      );
      return;
    }
    const gate = assessResumeInput(resumeText);
    if (gate.block) {
      setError(
        [gate.blockMessage, gate.warning].filter(Boolean).join(" "),
      );
      return;
    }

    analyzeAbortRef.current?.abort();
    const ac = new AbortController();
    analyzeAbortRef.current = ac;
    const preserveTailor = Boolean(opts?.preserveTailor);
    // Always clear stale analysis UI immediately so Prepare→Analyse never flashes old JD results
    setAnalysis(null);
    if (!preserveTailor) {
      setMasterScores(null);
      setTailorRows(defaultTailorRows());
      setAppliedSuggestionKeys(new Set());
      setQueuedMissingKeywords([]);
    }
    setBusy("analyze");
    setError(gate.warning);
    if (!opts?.silentTab) setTab("analyze");
    try {
      const resolvedRaw = await resolveJdText();
      const usableJd = isUsableJdText(resolvedRaw) ? resolvedRaw.trim() : "";
      if (!usableJd) setJdPromptDismissed(true);
      setShowInlineJd(false);

      const working = resumeText.trim();
      // Fresh analyse: baseline is current working text (never reuse a prior resume)
      // Re-analyse (preserveTailor): keep frozen original for Before gauges
      if (!preserveTailor || !originalText.trim()) {
        setOriginalText(working);
      }
      const baseline =
        preserveTailor && originalText.trim()
          ? originalText.trim()
          : working;
      setAnalyzeBaselineText(baseline);

      const { res, data } = await fetchJson<{
        error?: string;
        analysis?: AtsAnalysis;
      }>("/api/ats/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: working,
          jdText: usableJd,
        }),
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(data.error || "Analyze failed");
      const nextAnalysis = data.analysis || null;
      const local = scoreTriple(working, usableJd);
      if (nextAnalysis) {
        nextAnalysis.matchedKeywords = usableJd
          ? local.matchedKeywords
          : [];
        nextAnalysis.missingKeywords = usableJd
          ? local.missingKeywords
          : [];
        nextAnalysis.keywordMatchPct = usableJd ? local.keywordMatchPct : 0;
        nextAnalysis.heuristic = {
          keywordMatchPct: nextAnalysis.keywordMatchPct,
          matchedKeywords: nextAnalysis.matchedKeywords,
          missingKeywords: nextAnalysis.missingKeywords,
        };
        // Drop meta "remove address/phone" noise from edit plan
        nextAnalysis.rewriteSuggestions = (
          nextAnalysis.rewriteSuggestions || []
        ).filter((s) => !isDestructiveSuggestion(s));
      }
      setAnalysis(nextAnalysis);
      setAppliedSuggestionKeys(new Set());
      const baselineScores = scoreTriple(baseline, usableJd);
      setMasterScores(baselineScores);

      let nextRows = defaultTailorRows();
      if (preserveTailor) {
        nextRows = { ...tailorRows };
        for (const key of Object.keys(nextRows) as ImproveFocus[]) {
          if (nextRows[key].improveCount > 0) {
            nextRows[key] = {
              ...nextRows[key],
              afterScores: local,
              feedActive: false,
            };
          }
        }
        setTailorRows(nextRows);
      } else {
        nextRows = {
          ats: {
            ...emptyTailorRow(),
            history: [{ label: "Original", scores: baselineScores }],
          },
          jd: {
            ...emptyTailorRow(),
            history: [{ label: "Original", scores: baselineScores }],
          },
          balanced: {
            ...emptyTailorRow(),
            history: [{ label: "Original", scores: baselineScores }],
          },
        };
        setTailorRows(nextRows);
      }

      if (nextAnalysis) {
        const label = `v${Math.min(4, analyzeVersions.length + 1)}`;
        const snap: AnalyzeVersionSnap = {
          id: `${Date.now()}-${label}`,
          label,
          resumeText: working,
          jdText: usableJd,
          analysis: nextAnalysis,
          masterScores: baselineScores,
          tailorRows: nextRows,
          createdAt: new Date().toISOString(),
        };
        setAnalyzeVersions((prev) => [...prev, snap].slice(-4));
        setActiveAnalyzeVersion(snap.id);
      }
      markDirty();
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (analyzeAbortRef.current === ac) {
        analyzeAbortRef.current = null;
        setBusy(null);
      }
    }
  }

  function loadAnalyzeVersion(id: string) {
    const snap = analyzeVersions.find((v) => v.id === id);
    if (!snap) return;
    setActiveAnalyzeVersion(id);
    setResumeText(snap.resumeText);
    setImprovedText(snap.resumeText);
    setJdText(snap.jdText);
    setAnalysis(snap.analysis);
    setMasterScores(snap.masterScores);
    setTailorRows(snap.tailorRows);
    setAppliedSuggestionKeys(new Set());
    markDirty();
  }

  function markAllSuggestionsApplied() {
    if (!analysis) return;
    setAppliedSuggestionKeys(
      new Set(
        (analysis.rewriteSuggestions || []).map((s, i) => suggestionKey(s, i)),
      ),
    );
  }

  function accommodateMissing(keyword: string) {
    queueMissingKeyword(keyword);
  }

  function freezeOriginalIfNeeded() {
    if (!originalText.trim() && resumeText.trim()) {
      setOriginalText(resumeText);
    }
  }

  function commitWorkingDraft(next: string) {
    freezeOriginalIfNeeded();
    setResumeText(next);
    setImprovedText(next);
    markDirty();
  }

  const jdPresent = isUsableJdText(jdText);
  const showJdPrompt = !jdPresent && !jdPromptDismissed;

  useEffect(() => {
    if (tab !== "analyze" || !pendingAutoAnalyze.current) return;
    pendingAutoAnalyze.current = false;
    if (resumeText.trim() && busy !== "analyze") {
      void runAnalyze({ silentTab: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when landing on analyse from prepare
  }, [tab]);

  async function runBrainImprove(focus: ImproveFocus = "balanced") {
    if (!resumeText.trim() || !masterScores) return;
    const row = tailorRows[focus];
    if (row.improveCount >= 4) return;
    // Stop when After already high for this row
    if (row.afterScores) {
      const afterVal =
        focus === "ats"
          ? row.afterScores.ats
          : focus === "jd"
            ? row.afterScores.jd
            : row.afterScores.overall;
      if (afterVal >= 92) {
        setError("This row is already at a high score — re-analyse if inputs changed.");
        return;
      }
    }

    const nextVer = row.improveCount + 1;
    const baseline = originalText.trim() || resumeText.trim();
    let inputResume = resumeText.trim();
    freezeOriginalIfNeeded();

    // Apply queued missing keywords into experience before tailor
    if (queuedMissingKeywords.length) {
      let draft = inputResume;
      for (const kw of queuedMissingKeywords) {
        draft = accommodateKeywordInExperience(draft, kw);
      }
      if (draft !== inputResume) {
        commitWorkingDraft(draft);
        inputResume = draft.trim();
      }
    }

    setBusyFocus(focus);
    setBusy("improve");
    setError(null);

    let tickIdx = 0;
    setTailorRows((prev) => ({
      ...prev,
      [focus]: {
        ...prev[focus],
        feedActive: true,
        changeLines: [{ kind: "info", text: "Reading your working draft…" }],
      },
    }));

    const feedTimer = window.setInterval(() => {
      const idx = Math.min(TAILOR_FEED_TICKS.length - 1, tickIdx);
      tickIdx += 1;
      const msg = TAILOR_FEED_TICKS[idx];
      setTailorRows((prev) => ({
        ...prev,
        [focus]: {
          ...prev[focus],
          changeLines: [
            ...prev[focus].changeLines.filter((l) => l.kind === "info").slice(-2),
            { kind: "info" as const, text: msg },
          ],
        },
      }));
    }, 2200);

    try {
      const resolvedJd = await resolveJdText();
      const focusHints =
        queuedMissingKeywords.length > 0
          ? `\n\nWEAVE THESE MISSING TERMS truthfully into existing experience bullets (no invented tools/metrics): ${queuedMissingKeywords.join(", ")}`
          : "";
      const jdForPass = `${resolvedJd}${focusHints}`;
      const isFirstOnRow = row.improveCount === 0;
      const body: Record<string, unknown> = {
        action: isFirstOnRow ? "pass" : "more",
        masterResume: baseline,
        currentResume: inputResume,
        jdText: jdForPass,
        focus,
        matchScore: masterScores.overall,
        currentVersion: isFirstOnRow ? 1 : row.improveCount,
      };

      const { res, data } = await fetchJson<{
        error?: string;
        pass?: {
          version: ResumeVersion;
          resumeMd: string;
          scores: TripleScores;
          saturated?: boolean;
          notes?: string[];
        };
        benchmark?: { benchmark?: { score: number; tool: string } };
      }>("/api/brain/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !data.pass) {
        throw new Error(data.error || "Tailor pass failed");
      }
      const pass = data.pass;
      if (!pass.resumeMd?.trim() || pass.resumeMd.trim() === inputResume) {
        throw new Error(
          "Tailor returned no usable draft changes. Try again or edit the working draft.",
        );
      }
      const lines = diffResumeLines(inputResume, pass.resumeMd, pass.notes);
      commitWorkingDraft(pass.resumeMd);
      // Local scores — never trust inflated remote 100% on short JDs
      const afterLocal = scoreTriple(
        pass.resumeMd,
        isUsableJdText(resolvedJd) ? resolvedJd : "",
      );
      setTailorRows((prev) => {
        const prevRow = prev[focus];
        const baseHistory =
          prevRow.history.length > 0
            ? prevRow.history
            : [{ label: "Original", scores: masterScores }];
        return {
          ...prev,
          [focus]: {
            improveCount: nextVer,
            afterScores: afterLocal,
            changeLines: lines,
            feedActive: true,
            history: [
              ...baseHistory.filter((h) => h.label !== `v${nextVer}`),
              { label: `v${nextVer}`, scores: afterLocal },
            ].slice(0, 5),
          },
        };
      });
      setScoresBefore(quickScores(baseline, resolvedJd));
      setScoresAfter(quickScores(pass.resumeMd, resolvedJd));
      setBenchmarkScore(data.benchmark?.benchmark?.score ?? null);
      syncKeywordChipsFromDraft(pass.resumeMd, resolvedJd);
      setQueuedMissingKeywords([]);
      markDirty();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setTailorRows((prev) => ({
        ...prev,
        [focus]: { ...prev[focus], feedActive: false },
      }));
    } finally {
      window.clearInterval(feedTimer);
      setBusyFocus(null);
      setBusy(null);
    }
  }

  function applySuggestionAdd(text: string) {
    const piece = text.trim();
    if (!piece) return;
    if (!isNovelSuggestion(piece, resumeText)) return;
    commitWorkingDraft(`${resumeText.trimEnd()}\n${piece}\n`);
  }

  function applySuggestionReplace(current: string, suggested: string) {
    const from = current.trim();
    const to = suggested.trim();
    if (!to) return;
    const next = applyAllSuggestions(resumeText, [
      { current: from, suggested: to, area: "", why: "" },
    ]);
    commitWorkingDraft(next);
  }

  function applyAllImprovements() {
    if (!analysis || applyingAll) return;
    setApplyingAll(true);
    try {
      const safe = (analysis.rewriteSuggestions || []).filter(
        (s) => !isDestructiveSuggestion(s),
      );
      const next = applyAllSuggestions(resumeText, safe);
      commitWorkingDraft(next);
      markAllSuggestionsApplied();
      const jd = isUsableJdText(jdText) ? jdText.trim() : "";
      syncKeywordChipsFromDraft(next, jd);
      setAnalysis((prev) =>
        prev ? { ...prev, rewriteSuggestions: [] } : prev,
      );
      if (masterScores) {
        const afterLocal = scoreTriple(next, jd);
        setTailorRows((prev) => {
          const out = { ...prev };
          for (const key of Object.keys(out) as ImproveFocus[]) {
            if (out[key].improveCount > 0 || key === "balanced") {
              out[key] = {
                ...out[key],
                afterScores: afterLocal,
                improveCount: Math.max(out[key].improveCount, 1),
              };
            }
          }
          return out;
        });
      }
    } finally {
      window.setTimeout(() => setApplyingAll(false), 400);
    }
  }

  async function ensureJsonResume(opts?: { force?: boolean }): Promise<JsonResume | null> {
    if (jsonResume && !opts?.force) return jsonResume;
    const text = (improvedText || resumeText).trim();
    if (!text) return null;
    setBusy("structure");
    try {
      const { res, data } = await fetchJson<{
        error?: string;
        jsonResume?: JsonResume;
      }>("/api/ats/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "structure", resumeText: text }),
      });
      if (!res.ok) throw new Error(data.error || "Structure failed");
      const jr = data.jsonResume || null;
      if (jr) setJsonResume(jr);
      return jr;
    } finally {
      setBusy(null);
    }
  }

  async function renderSelectedPdf(mode: "preview" | "download") {
    setError(null);
    try {
      let jr = jsonResume;
      if (!jr) jr = await ensureJsonResume();
      if (!jr) {
        setError("Improve or load a resume first");
        return;
      }
      setBusy(mode === "preview" ? "preview" : "download");
      if (mode === "preview") {
        // Raster pages — blob PDF iframe embeds often show blank.
        const res = await fetch("/api/ats/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template: selectedTemplate,
            resume: jr,
            format: "images",
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error || "PDF preview failed",
          );
        }
        const data = (await res.json()) as { pages?: string[] };
        if (!data.pages?.length) {
          throw new Error("Preview returned no pages");
        }
        setPdfPreviewPages(data.pages);
        setShowPdfPreview(true);
        return;
      }
      const res = await fetch("/api/ats/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: selectedTemplate, resume: jr }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || "PDF render failed",
        );
      }
      const blob = await res.blob();
      if (pdfBlobRef.current) URL.revokeObjectURL(pdfBlobRef.current);
      const url = URL.createObjectURL(blob);
      pdfBlobRef.current = url;
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(jr.basics?.name || "resume").replace(/\s+/g, "_")}-${selectedTemplate}.pdf`;
      a.click();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const tabs: [Tab, string][] = [
    ["prepare", "Prepare"],
    ["analyze", "Analyse & improve"],
    ["brand", "Career Brand"],
    ["builder", "Builder"],
  ];

  return (
    // Desktop: fixed viewport with pane scroll. Mobile: allow page scroll
    // (overflow-hidden + h-dvh traps Builder like the MPI bug).
    <div className="flex min-h-dvh flex-col md:h-dvh md:flex-row md:overflow-hidden">
      {navOpen && (
        <button
          type="button"
          className="studio-overlay md:hidden"
          aria-label="Close nav"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        className={`studio-sidebar flex h-full w-[280px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--panel-solid)]/90 backdrop-blur-xl ${
          navOpen ? "studio-sidebar--open" : ""
        }`}
      >
        <AppNav mobileOpen={navOpen} onMobileClose={() => setNavOpen(false)} />
        <div className="border-b border-[var(--line)] px-3 py-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void saveSession()}
            className="btn-primary w-full px-3 py-2 text-sm disabled:opacity-40"
          >
            {busy === "save" ? "Saving…" : dirty ? "Save to history" : "Saved"}
          </button>
          <input
            className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-xs outline-none"
            placeholder="Session name"
            value={sessionName}
            onChange={(e) => {
              setSessionName(e.target.value);
              markDirty();
            }}
          />
          <button
            type="button"
            className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
            disabled={Boolean(busy)}
            onClick={() => startNewAnalysis()}
          >
            New analysis
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <p className="mb-2 px-2 text-[11px] tracking-wide text-[var(--muted)] uppercase">
            ATS history
          </p>
          <ul className="space-y-1">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-start gap-1">
                <button
                  type="button"
                  className={`min-w-0 flex-1 rounded-xl px-2.5 py-2 text-left text-sm ${
                    sessionId === s.id
                      ? "bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/25"
                      : "hover:bg-black/[0.03]"
                  }`}
                  onClick={() => void loadSession(s.id)}
                >
                  <span className="block truncate font-semibold">{s.name}</span>
                  <span className="text-[11px] capitalize text-[var(--muted)]">
                    {s.step} · {new Date(s.updatedAt).toLocaleDateString()}
                  </span>
                </button>
                <button
                  type="button"
                  className="rounded px-1.5 text-[11px] text-[var(--muted)] hover:text-[var(--danger)]"
                  title="Delete"
                  onClick={() => void deleteSession(s.id)}
                >
                  ✕
                </button>
              </li>
            ))}
            {!sessions.length && (
              <li className="px-2 text-xs text-[var(--muted)]">
                Save a flow to keep Prepare → Analyse → Career Brand → Builder
                here.
              </li>
            )}
          </ul>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="studio-topbar flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-[var(--line)] bg-white/80 px-2 py-1 md:hidden"
              onClick={() => setNavOpen(true)}
            >
              Menu
            </button>
            <img src="/resume-mark.svg" alt="" className="hidden h-8 w-8 sm:block" />
            <div className="min-w-0">
              <p className="studio-topbar__brand truncate text-base font-semibold text-[var(--ink)]">
                ATS Resume Builder
              </p>
              <p className="truncate text-xs text-[var(--muted)]">
                Analyze · improve · layouts
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--line)] bg-white/80 p-1 backdrop-blur">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  tab === id
                    ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
                onClick={() => void requestTabChange(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {error && (
          <p className="border-b border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        {driveMsg && (
          <p className="border-b border-[var(--line)] bg-white px-4 py-2 text-xs text-[var(--muted)]">
            {driveMsg}
          </p>
        )}

        {tab === "prepare" && (
          <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-2">
            <section className="flex min-h-0 flex-col border-b border-[var(--line)] lg:border-r lg:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-2">
                <h2 className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
                  Resume
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="max-w-[200px] rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-xs"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) loadEarlierResume(e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">Choose from earlier uploads…</option>
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  {previewUrl ? (
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-[var(--muted)] underline"
                      onClick={() => setShowExtracted((v) => !v)}
                    >
                      {showExtracted ? "Show original" : "Show extracted text"}
                    </button>
                  ) : null}
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-xs font-semibold"
                      onClick={() => setUploadMenu((v) => !v)}
                    >
                      + Upload
                    </button>
                    {uploadMenu && (
                      <div className="upload-menu">
                        <button
                          type="button"
                          onClick={() => {
                            setUploadMenu(false);
                            fileRef.current?.click();
                          }}
                        >
                          Upload from device
                        </button>
                        {driveConnected ? (
                          <button
                            type="button"
                            onClick={() => {
                              setUploadMenu(false);
                              setDriveOpen(true);
                            }}
                          >
                            Upload from Drive
                          </button>
                        ) : (
                          <a href="/api/drive/connect">Connect Google Drive</a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {showExtracted || !previewUrl ? (
                <textarea
                  className="min-h-[240px] flex-1 resize-none border-0 bg-transparent px-4 py-3 text-sm leading-relaxed outline-none"
                  value={resumeText}
                  onChange={(e) => {
                    setResumeText(e.target.value);
                    invalidatePipelineOnInputChange({ clearOriginal: true });
                    markDirty();
                  }}
                />
              ) : (
                <div className="min-h-0 flex-1 p-3">
                  <ResumeAsIsPreview
                    url={previewUrl}
                    mimeType={previewMime}
                    filename={previewName}
                    className="h-full min-h-[320px]"
                  />
                </div>
              )}
              <div className="border-t border-[var(--line)] px-4 py-2">
                <label className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
                  Job description or URL (optional)
                </label>
                <textarea
                  className="mt-1 h-28 w-full resize-y rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2 text-sm outline-none"
                  placeholder="Paste the job description, or paste a public job posting URL (careers page, Greenhouse, Lever, etc.)"
                  value={jdText}
                  onChange={(e) => {
                    setJdText(e.target.value);
                    if (!isStandaloneJobUrl(e.target.value)) {
                      setJdSourceUrl(null);
                    }
                    invalidatePipelineOnInputChange();
                    markDirty();
                  }}
                />
                {isStandaloneJobUrl(jdText) ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                      disabled={jdFetching || Boolean(busy)}
                      onClick={() => void resolveJdText()}
                    >
                      {jdFetching ? "Fetching job description…" : "Fetch job description"}
                    </button>
                    <span className="text-xs text-[var(--muted)]">
                      URL detected — fetch now or we&apos;ll fetch when you
                      analyse. LinkedIn: if fetch returns a short preview, open
                      the job → Show more → paste the full JD here.
                    </span>
                  </div>
                ) : null}
                {jdSourceUrl ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Loaded from{" "}
                    <a
                      href={jdSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[var(--accent)] underline"
                    >
                      job posting
                    </a>
                  </p>
                ) : null}
              </div>
            </section>
            <section className="flex min-h-0 flex-col overflow-y-auto px-4 py-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={Boolean(busy) || !resumeText.trim()}
                  onClick={() => void runStructure()}
                  className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  {busy === "structure" ? "Structuring…" : "Structure"}
                </button>
                <button
                  type="button"
                  disabled={Boolean(busy) || !resumeText.trim()}
                  onClick={() => {
                    invalidatePipelineOnInputChange();
                    pendingAutoAnalyze.current = true;
                    void requestTabChange("analyze");
                  }}
                  className="btn-primary px-3 py-2 text-sm disabled:opacity-40"
                >
                  {busy === "analyze" ? "Analysing…" : "Analyse"}
                </button>
              </div>
              <p className="mt-4 text-sm text-[var(--muted)]">
                Changing steps with unsaved work asks you to save into ATS history.
                Templates open the native builder with your working resume already loaded.
              </p>
            </section>
          </div>
        )}

        {tab === "analyze" && (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {busy === "analyze" ? (
              <AnalyzeLoadingPanel
                stageLabel={ANALYZE_STAGES[analyzeStage]}
                progress={
                  (analyzeStage + 0.35) / Math.max(1, ANALYZE_STAGES.length - 1)
                }
                onStop={stopAnalyze}
                label="Analysing your resume"
              />
            ) : (
              <div className="mx-auto max-w-6xl space-y-4">
                {!analysis ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--line-strong)] bg-white/60 p-6 text-center text-sm text-[var(--muted)]">
                    <p className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
                      Ready to analyse this resume
                    </p>
                    <p className="mt-1 max-w-md">
                      Score against your job description, review gaps, then tailor
                      with per-row passes.
                    </p>
                    <button
                      type="button"
                      className="btn-primary mt-4 px-4 py-2 text-sm"
                      disabled={Boolean(busy) || !resumeText.trim()}
                      onClick={() => void runAnalyze()}
                    >
                      Analyse
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="btn-primary px-3 py-2 text-sm disabled:opacity-40"
                        disabled={Boolean(busy) || applyingAll}
                        onClick={() => applyAllImprovements()}
                      >
                        {applyingAll
                          ? "Applying all improvements…"
                          : "Apply all improvements"}
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          void runAnalyze({
                            silentTab: true,
                            preserveTailor: true,
                          })
                        }
                      >
                        {busy === "analyze"
                          ? "Analysing…"
                          : "Re-analyse resume"}
                      </button>
                      {analyzeVersions.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold uppercase ${
                            activeAnalyzeVersion === v.id
                              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                              : "border-[var(--line)] bg-white"
                          }`}
                          title={`Load ${v.label} from ${new Date(v.createdAt).toLocaleString()}`}
                          onClick={() => loadAnalyzeVersion(v.id)}
                        >
                          {v.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="rounded-xl border border-[var(--danger)]/40 bg-white px-2.5 py-2 text-sm text-[var(--danger)] disabled:opacity-40"
                        disabled={Boolean(busy)}
                        title="Restart — clear analyse progress"
                        aria-label="Restart analysis"
                        onClick={() => restartWithDoubleConfirm()}
                      >
                        ↻
                      </button>
                    </div>
                    {showJdPrompt ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm">
                        <button
                          type="button"
                          className="text-left font-semibold text-amber-950 underline decoration-amber-400 underline-offset-2"
                          onClick={() => setShowInlineJd(true)}
                        >
                          Please add a JD or role you are targeting to improve
                          your resume selection chances
                        </button>
                        {showInlineJd ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              className="h-24 w-full resize-y rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none"
                              placeholder="Paste job description or target role…"
                              value={jdText}
                              onChange={(e) => {
                                setJdText(e.target.value);
                                markDirty();
                              }}
                            />
                            <button
                              type="button"
                              className="btn-primary px-3 py-1.5 text-sm"
                              disabled={Boolean(busy) || !resumeText.trim()}
                              onClick={() =>
                                void runAnalyze({ silentTab: true })
                              }
                            >
                              Analyse with this target
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                      <button
                        type="button"
                        className="glass-panel flex flex-col items-center justify-center px-3 py-4 text-center transition hover:ring-2 hover:ring-[var(--accent)]/30"
                        onClick={() => setScoreExplain({ type: "readiness" })}
                      >
                        <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                          Readiness
                        </p>
                        <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--accent)]">
                          {analysis.overallScore}
                        </p>
                        <p className="text-xs text-[var(--muted)]">/ 100 · tap</p>
                      </button>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {(analysis.dimensions || []).slice(0, 9).map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-left transition hover:ring-2 hover:ring-[var(--accent)]/25"
                            title="Tap for score breakdown"
                            onClick={() =>
                              setScoreExplain({ type: "dimension", id: d.id })
                            }
                          >
                            <div className="mb-1 flex items-baseline justify-between gap-2">
                              <p className="text-[11px] font-semibold text-[var(--muted)]">
                                {d.label}
                              </p>
                              <p className="text-sm font-bold tabular-nums">
                                {d.score}
                              </p>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--accent-soft)]">
                              <div
                                className="h-full rounded-full bg-[var(--accent)]"
                                style={{ width: `${Math.min(100, d.score)}%` }}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {masterScores ? (
                      <section className="rounded-xl border border-[var(--line)] bg-white/80 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-[family-name:var(--font-display)] text-base font-semibold">
                            Tailor scores
                          </h3>
                          {benchmarkScore != null ? (
                            <p className="text-xs text-[var(--muted)]">
                              Benchmark: {benchmarkScore}/100
                            </p>
                          ) : null}
                        </div>
                        <p className="mb-3 text-xs text-[var(--muted)]">
                          Each row tailors your current working draft. After ATS
                          passes, Overall uses the updated resume.
                        </p>
                        <ImproveSpeedometers
                          masterScores={masterScores}
                          jdPresent={jdPresent}
                          rows={tailorRows}
                          busyFocus={busyFocus}
                          onImprove={(focus) => void runBrainImprove(focus)}
                          onExplainTailor={(metric) =>
                            setScoreExplain({ type: "tailor", metric })
                          }
                          onShowChanges={(focus) => {
                            const row = tailorRows[focus];
                            if (row.changeLines.length) {
                              setTailorRows((prev) => ({
                                ...prev,
                                [focus]: { ...prev[focus], feedActive: true },
                              }));
                            }
                          }}
                        />
                      </section>
                    ) : null}

                    {(analysis.hiringSkim || []).length > 0 && (
                      <div className="glass-panel p-4">
                        <h3 className="mb-2 font-[family-name:var(--font-display)] text-base font-semibold">
                          Hiring skim
                        </h3>
                        <ul className="list-disc space-y-1 pl-5 text-sm">
                          {analysis.hiringSkim.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{analysis.summary}</p>
                    <ChipBlock
                      title="Matched"
                      items={analysis.matchedKeywords}
                      tone="ok"
                    />
                    {queuedMissingKeywords.length > 0 ? (
                      <ChipBlock
                        title="Queued — weave on next Tailor"
                        items={queuedMissingKeywords}
                        tone="queued"
                        onItemClick={(k) =>
                          setQueuedMissingKeywords((prev) =>
                            prev.filter((x) => x !== k),
                          )
                        }
                      />
                    ) : null}
                    <ChipBlock
                      title="Missing — tap to queue for Tailor"
                      items={analysis.missingKeywords.filter(
                        (k) =>
                          !queuedMissingKeywords.some(
                            (q) => q.toLowerCase() === k.toLowerCase(),
                          ),
                      )}
                      tone="warn"
                      onItemClick={queueMissingKeyword}
                    />
                    <AnalyzeWorkbench
                      originalText={originalText.trim() || resumeText}
                      resumeText={resumeText}
                      analysis={analysis}
                      appliedKeys={appliedSuggestionKeys}
                      onAdd={applySuggestionAdd}
                      onReplace={applySuggestionReplace}
                      onAsk={askAts}
                      onAccommodateMissing={accommodateMissing}
                      missingKeywords={analysis.missingKeywords}
                      onMarkApplied={(key) =>
                        setAppliedSuggestionKeys((prev) => new Set(prev).add(key))
                      }
                      onResumeChange={(text) => {
                        commitWorkingDraft(text);
                      }}
                    />
                  </>
                )}

                {analysis ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary px-3 py-2 text-sm"
                      onClick={() => void requestTabChange("builder")}
                    >
                      Continue to Builder
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {tab === "brand" && (
          <CareerBrandPanel
            resumeText={improvedText.trim() || resumeText}
            jdText={jdText}
          />
        )}

        {tab === "builder" && (
          <ResumeBuilder
            jsonResume={jsonResume}
            onJsonResumeChange={(jr) => {
              setJsonResume(jr);
              const md = jsonResumeToMarkdown(jr);
              setResumeText(md);
              setImprovedText(md);
              markDirty();
            }}
            selectedTemplate={selectedTemplate}
            onTemplateChange={(id) => {
              setSelectedTemplate(id);
              markDirty();
            }}
            resumeText={workingResumeForTemplates}
            busy={busy}
            structuring={busy === "structure"}
            onStructureFromText={() => void ensureJsonResume({ force: true })}
            onPreviewPdf={() => void renderSelectedPdf("preview")}
            onDownloadPdf={() => void renderSelectedPdf("download")}
          />
        )}
      </div>

      {scoreExplain && (
        <div className="drive-modal">
          <button
            type="button"
            className="drive-modal__backdrop"
            aria-label="Close score explanation"
            onClick={() => setScoreExplain(null)}
          />
          <div className="drive-modal__panel max-w-lg">
            <div className="drive-modal__head">
              <p className="drive-modal__title">
                {
                  buildScoreExplanation(
                    scoreExplain,
                    analysis,
                    masterScores,
                    jdPresent,
                  ).title
                }
              </p>
              <button
                type="button"
                className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs"
                onClick={() => setScoreExplain(null)}
              >
                Close
              </button>
            </div>
            <div className="drive-modal__body whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
              {
                buildScoreExplanation(
                  scoreExplain,
                  analysis,
                  masterScores,
                  jdPresent,
                ).body
              }
            </div>
          </div>
        </div>
      )}

      {showPdfPreview && pdfPreviewPages.length > 0 && (
        <div className="drive-modal">
          <button
            type="button"
            className="drive-modal__backdrop"
            aria-label="Close preview"
            onClick={() => {
              setShowPdfPreview(false);
              setPdfPreviewPages([]);
            }}
          />
          <div className="drive-modal__panel max-h-[92vh] w-[min(920px,100%)]">
            <div className="drive-modal__head">
              <div>
                <p className="drive-modal__title">PDF preview · {selectedTemplate}</p>
                <p className="drive-modal__sub">
                  Check layout before download. Content comes from your improved resume.
                </p>
              </div>
              <button
                type="button"
                className="drive-modal__close"
                onClick={() => {
                  setShowPdfPreview(false);
                  setPdfPreviewPages([]);
                }}
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <PdfPreview
                pages={pdfPreviewPages}
                title={`PDF preview · ${selectedTemplate}`}
                className="min-h-[70vh]"
              />
            </div>
          </div>
        </div>
      )}

      <DriveBrowserModal
        open={driveOpen}
        googleEmail={driveEmail}
        onClose={() => setDriveOpen(false)}
        onImport={async (fileId, name) => {
          await importFromDrive(fileId, name);
          setDriveOpen(false);
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,.pdf,.docx"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy("parse");
          setError(null);
          try {
            setLocalPreview(file);
            const text = await parseUpload(file);
            invalidatePipelineOnInputChange({ clearOriginal: true });
            setResumeText(text);
            setOriginalText(text);
            setImprovedText("");
            setScoresBefore(null);
            setScoresAfter(null);
            setJsonResume(null);
            setShowExtracted(false);
            markDirty();
            await fetch("/api/resumes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                originalFilename: file.name,
                content: text,
              }),
            });
            await refreshResumes();
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          } finally {
            setBusy(null);
          }
        }}
      />
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white/80 px-3 py-3 text-center">
      <p className="font-[family-name:var(--font-display)] text-2xl">{Math.round(value)}</p>
      <p className="text-[11px] font-semibold tracking-wide text-[var(--muted)] uppercase">{label}</p>
    </div>
  );
}

function ChipBlock({
  title,
  items,
  tone,
  onItemClick,
}: {
  title: string;
  items: string[];
  tone: "ok" | "warn" | "queued";
  onItemClick?: (item: string) => void;
}) {
  if (!items.length) return null;
  const chipClass =
    tone === "ok"
      ? "ats-chip ats-chip--ok"
      : tone === "queued"
        ? "ats-chip ats-chip--ok ring-1 ring-[var(--accent)]"
        : "ats-chip ats-chip--warn";
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((k) =>
          onItemClick ? (
            <button
              key={k}
              type="button"
              className={`${chipClass} cursor-pointer hover:ring-2 hover:ring-[var(--accent)]/40`}
              title={
                tone === "queued"
                  ? "Remove from queue"
                  : "Queue for next Tailor pass"
              }
              onClick={() => onItemClick(k)}
            >
              {k}
            </button>
          ) : (
            <span key={k} className={chipClass}>
              {k}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
