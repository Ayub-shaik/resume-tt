"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { DriveBrowserModal } from "@/components/DriveBrowserModal";
import { AnalyzeLoadingPanel } from "@/components/AnalyzeLoadingPanel";
import { AnalyzeWorkbench } from "@/components/AnalyzeWorkbench";
import { ResumeBuilder } from "@/components/ResumeBuilder";
import { ImproveResumeViewer } from "@/components/ImproveResumeViewer";
import {
  fetchPreviewBlob,
  ResumeAsIsPreview,
} from "@/components/ResumeAsIsPreview";
import { fetchJson } from "@/lib/fetchJson";
import type { AtsAnalysis } from "@/lib/ats/analyze";
import { isNovelSuggestion } from "@/lib/ats/dedupe";
import { applyAllSuggestions } from "@/lib/ats/applySuggestions";
import type { JsonResume } from "@/lib/ats/jsonresume";
import { jsonResumeToMarkdown } from "@/lib/ats/jsonresume";
import { quickScores, type QuickScores } from "@/lib/ats/keywords";
import type { TemplateId } from "@/lib/ats/templates";
import { loadAtsDraft, saveAtsDraft } from "@/lib/ats/draftStore";
import type { Resume } from "@/lib/types";

const ANALYZE_STAGES = [
  "Parsing resume…",
  "Reading job description…",
  "Scoring coverage…",
  "Building dual view…",
] as const;

type Tab = "prepare" | "analyze" | "improve" | "builder";
type ChatMsg = { role: "user" | "assistant"; text: string };
type AtsSessionRow = {
  id: string;
  name: string;
  step: Tab;
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
  const [improveStarted, setImproveStarted] = useState(false);
  const [improveView, setImproveView] = useState<"modified" | "original">(
    "modified",
  );
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const pdfBlobRef = useRef<string | null>(null);
  const draftHydrated = useRef(false);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const [askIncludeAll, setAskIncludeAll] = useState<{
    busy: boolean;
    messages: Array<{ role: "user" | "assistant"; text: string }>;
  } | null>(null);

  const markDirty = useCallback(() => setDirty(true), []);

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
    setTab(draft.tab);
    setResumeText(draft.resumeText);
    setJdText(draft.jdText);
    setOriginalText(draft.originalText);
    setImprovedText(draft.improvedText);
    setAnalysis(draft.analysis);
    setJsonResume(draft.jsonResume);
    setSelectedTemplate(draft.selectedTemplate);
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
    if (next === "improve") {
      freezeOriginalIfNeeded();
      if (!improvedText.trim() && resumeText.trim()) {
        setImprovedText(resumeText);
      }
      setImproveView("modified");
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
    setTab(s.step || "prepare");
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
    const id = window.setInterval(() => {
      setAnalyzeStage((s) => (s + 1) % ANALYZE_STAGES.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [busy]);

  useEffect(() => {
    if (tab !== "improve" || improveView !== "modified") return;
    const text = (improvedText || resumeText).trim();
    if (!text || jsonResume) return;
    void ensureJsonResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- structure once when opening modified view
  }, [tab, improveView, improvedText, resumeText, jsonResume]);

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

  async function runAnalyze(opts?: { silentTab?: boolean }) {
    if (!resumeText.trim()) return;
    analyzeAbortRef.current?.abort();
    const ac = new AbortController();
    analyzeAbortRef.current = ac;
    setBusy("analyze");
    setError(null);
    if (!opts?.silentTab) setTab("analyze");
    try {
      const { res, data } = await fetchJson<{
        error?: string;
        analysis?: AtsAnalysis;
      }>("/api/ats/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jdText }),
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(data.error || "Analyze failed");
      setAnalysis(data.analysis || null);
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

  async function runAskIncludeAll() {
    if (!analysis || askIncludeAll?.busy) return;
    const question =
      "Include all improvements: decide which suggestions to add or replace, and summarize what you would change.";
    setAskIncludeAll({
      busy: true,
      messages: [{ role: "user", text: question }],
    });
    try {
      const reply = await askAts({
        question,
        context: JSON.stringify(
          (analysis.rewriteSuggestions || []).slice(0, 12),
        ).slice(0, 4000),
      });
      applyAllImprovements();
      setAskIncludeAll({
        busy: false,
        messages: [
          { role: "user", text: question },
          { role: "assistant", text: reply },
        ],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setAskIncludeAll(null);
    }
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

  async function runImprove(custom?: string) {
    const tip = (custom ?? instruction).trim();
    if (!tip) {
      setError("Describe the refinement you want (e.g. tighten bullets for a platform role).");
      return;
    }
    if (!resumeText.trim()) return;
    setBusy("improve");
    setError(null);
    setImproveStarted(true);
    setChat((c) => [...c, { role: "user", text: tip }]);
    try {
      // Always refine the current working draft (includes Analyze edits)
      const baseline = resumeText.trim();
      freezeOriginalIfNeeded();
      const before = quickScores(originalText.trim() || baseline, jdText);
      setScoresBefore(before);

      const body: Record<string, unknown> = {
        action: "improve",
        instruction: tip,
        jdText,
        saveAsResume: true,
        resumeText: baseline,
      };
      if (jsonResume) body.jsonResume = jsonResume;

      const { res, data } = await fetchJson<{
        error?: string;
        jsonResume?: JsonResume;
        markdown?: string;
      }>("/api/ats/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(data.error || "Improve failed");
      setJsonResume(data.jsonResume || null);
      const next = data.markdown || resumeText;
      commitWorkingDraft(next);
      setScoresAfter(quickScores(next, jdText));
      setChat((c) => [
        ...c,
        {
          role: "assistant",
          text: "Refinements applied below. Ask for more changes, or continue to Builder when ready.",
        },
      ]);
      setInstruction("");
      markDirty();
      setBusy(null);
      // Readiness-style re-score on the refined draft (Analyze panel metrics)
      await runAnalyze({ silentTab: true });
      return;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
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
    if (!analysis) return;
    const next = applyAllSuggestions(
      resumeText,
      analysis.rewriteSuggestions || [],
    );
    commitWorkingDraft(next);
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
      if (mode === "preview") {
        setPdfPreviewUrl(url);
        setShowPdfPreview(true);
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(jr.basics?.name || "resume").replace(/\s+/g, "_")}-${selectedTemplate}.pdf`;
        a.click();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const tabs: [Tab, string][] = [
    ["prepare", "Prepare"],
    ["analyze", "Analyze"],
    ["improve", "Improve"],
    ["builder", "Builder"],
  ];

  return (
    <div className="flex h-dvh overflow-hidden">
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
                Save a flow to keep Prepare → Analyze → Improve → Templates here.
              </li>
            )}
          </ul>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="studio-topbar flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-[var(--line)] bg-white/80 px-2 py-1 md:hidden"
              onClick={() => setNavOpen(true)}
            >
              Menu
            </button>
            <img src="/mpi-logo.svg" alt="" className="hidden h-8 w-8 sm:block" />
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
                  Job description (optional)
                </label>
                <textarea
                  className="mt-1 h-28 w-full resize-y rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2 text-sm outline-none"
                  value={jdText}
                  onChange={(e) => {
                    setJdText(e.target.value);
                    markDirty();
                  }}
                />
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
                  onClick={() => void runAnalyze()}
                  className="btn-primary px-3 py-2 text-sm disabled:opacity-40"
                >
                  {busy === "analyze" ? "Analyzing…" : "Analyze"}
                </button>
                <button
                  type="button"
                  disabled={Boolean(busy) || !resumeText.trim()}
                  onClick={() => void requestTabChange("improve")}
                  className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  Improve…
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
                stage={analyzeStage}
                onStop={stopAnalyze}
                label={
                  analysis
                    ? "Re-analyzing your resume"
                    : "Analyzing your resume"
                }
              />
            ) : !analysis ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--line-strong)] bg-white/60 p-6 text-center text-sm text-[var(--muted)]">
                <p className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
                  Ready to score this resume
                </p>
                <p className="mt-1 max-w-md">
                  Analyze compares your working resume to the JD and builds a dual view with an edit plan.
                </p>
                <button
                  type="button"
                  className="btn-primary mt-4 px-4 py-2 text-sm"
                  disabled={Boolean(busy) || !resumeText.trim()}
                  onClick={() => void runAnalyze()}
                >
                  Analyze now
                </button>
              </div>
            ) : analysis ? (
              <div className="mx-auto max-w-6xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn-primary px-3 py-2 text-sm disabled:opacity-40"
                    disabled={Boolean(busy)}
                    onClick={() => applyAllImprovements()}
                  >
                    Apply all improvements
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
                    disabled={Boolean(busy)}
                    onClick={() => void runAnalyze({ silentTab: true })}
                  >
                    {busy === "analyze"
                      ? "Analyzing…"
                      : "Re-analyze improved resume"}
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
                    disabled={Boolean(busy) || Boolean(askIncludeAll?.busy)}
                    onClick={() => void runAskIncludeAll()}
                  >
                    {askIncludeAll?.busy ? "Asking…" : "Ask · include all"}
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                  <div className="glass-panel flex flex-col items-center justify-center px-3 py-4 text-center">
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                      Readiness
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--accent)]">
                      {analysis.overallScore}
                    </p>
                    <p className="text-xs text-[var(--muted)]">/ 100</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(analysis.dimensions || []).slice(0, 9).map((d) => (
                      <div
                        key={d.id}
                        className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.7)] px-3 py-2"
                        title={d.rationale}
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
                      </div>
                    ))}
                  </div>
                </div>
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
                <ChipBlock title="Matched" items={analysis.matchedKeywords} tone="ok" />
                <ChipBlock title="Missing" items={analysis.missingKeywords} tone="warn" />
                <AnalyzeWorkbench
                  resumeText={resumeText}
                  analysis={analysis}
                  onAdd={applySuggestionAdd}
                  onReplace={applySuggestionReplace}
                  onAsk={askAts}
                  onResumeChange={(text) => {
                    commitWorkingDraft(text);
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-primary px-3 py-2 text-sm" onClick={() => void requestTabChange("improve")}>
                    Continue to Improve
                  </button>
                  <button type="button" className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold" onClick={() => void requestTabChange("builder")}>
                    Skip to Builder
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {tab === "improve" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
              <p className="text-sm text-[var(--muted)]">
                Working draft from Analyze (adds/replaces) shows here first.
                Start improving only when you want further AI refinements — then
                open Builder for layout and PDF export.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    improveView === "modified"
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--line)] bg-white"
                  }`}
                  onClick={() => setImproveView("modified")}
                >
                  Modified
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    improveView === "original"
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--line)] bg-white"
                  }`}
                  onClick={() => setImproveView("original")}
                >
                  Original
                </button>
              </div>

              {analysis ? (
                <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                  <div className="glass-panel flex flex-col items-center justify-center px-3 py-3 text-center">
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                      Readiness
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">
                      {analysis.overallScore}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(analysis.dimensions || []).slice(0, 6).map((d) => (
                      <div
                        key={d.id}
                        className="rounded-xl border border-[var(--line)] bg-white/70 px-2.5 py-2"
                      >
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[var(--muted)]">{d.label}</span>
                          <span className="font-bold">{d.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <section className="ats-pane flex min-h-[360px] flex-col">
                <header className="border-b border-[var(--line)] px-3 py-2 font-[family-name:var(--font-display)] text-sm font-semibold">
                  {improveView === "modified"
                    ? "Working draft · formatted preview"
                    : "Original · as uploaded / frozen"}
                </header>
                <div className="min-h-0 flex-1 p-3">
                  <ImproveResumeViewer
                    mode={improveView}
                    text={
                      improveView === "modified"
                        ? improvedText || resumeText
                        : originalText || resumeText
                    }
                    originalPreviewUrl={previewUrl}
                    originalPreviewMime={previewMime}
                    originalFilename={previewName}
                    jsonResume={jsonResume}
                    templateId={selectedTemplate}
                  />
                </div>
              </section>

              {!improveStarted ? (
                <div className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
                  <p className="text-sm text-[var(--muted)]">
                    Content edits from Analyze are already in the working draft
                    above. Use Start improving only for extra AI refinements.
                  </p>
                  <button
                    type="button"
                    className="btn-primary mt-3 px-4 py-2 text-sm disabled:opacity-40"
                    disabled={!resumeText.trim() || Boolean(busy)}
                    onClick={() => setImproveStarted(true)}
                  >
                    Start improving
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--line)] bg-white/70">
                  <div className="space-y-3 p-4">
                    {chat.map((m, i) => (
                      <div
                        key={i}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          m.role === "user"
                            ? "ml-8 bg-[var(--ink)] text-white"
                            : "mr-8 bg-[#f1f5f9]"
                        }`}
                      >
                        {m.text}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 border-t border-[var(--line)] p-3">
                    <input
                      className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none"
                      placeholder="Ask for further refinements…"
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void runImprove();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-primary px-3 py-2 text-sm disabled:opacity-40"
                      disabled={Boolean(busy) || !resumeText.trim()}
                      onClick={() => void runImprove()}
                    >
                      {busy === "improve" ? "Improving…" : "Send"}
                    </button>
                  </div>
                </div>
              )}

              {improveStarted && scoresBefore && scoresAfter ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <ScoreCard label="Before refine" value={scoresBefore.overall} />
                  <ScoreCard label="After refine" value={scoresAfter.overall} />
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary w-fit px-3 py-2 text-sm"
                  onClick={() => void requestTabChange("builder")}
                >
                  Continue to Builder
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
                  disabled={Boolean(busy) || !resumeText.trim()}
                  onClick={() => void runAnalyze({ silentTab: true })}
                >
                  {busy === "analyze" ? "Analyzing…" : "Re-score working draft"}
                </button>
              </div>
            </div>
          </div>
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

      {showPdfPreview && pdfPreviewUrl && (
        <div className="drive-modal">
          <button
            type="button"
            className="drive-modal__backdrop"
            aria-label="Close preview"
            onClick={() => setShowPdfPreview(false)}
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
                onClick={() => setShowPdfPreview(false)}
              >
                Close
              </button>
            </div>
            <iframe
              title="Resume PDF preview"
              src={pdfPreviewUrl}
              className="min-h-[70vh] w-full flex-1 border-0"
            />
          </div>
        </div>
      )}

      {askIncludeAll && (
        <div
          className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--panel-solid)] p-3 shadow-[var(--shadow)] sm:inset-x-auto sm:right-6 sm:bottom-6"
          role="dialog"
          aria-label="Ask include all improvements"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--accent)] uppercase">
                Ask · include all
              </p>
              <p className="text-xs text-[var(--muted)]">
                Applied all suggestions to your working draft.
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-[var(--muted)]"
              onClick={() => setAskIncludeAll(null)}
            >
              Close
            </button>
          </div>
          <div className="mb-2 max-h-48 space-y-2 overflow-y-auto text-sm">
            {askIncludeAll.messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg px-2 py-1.5 ${
                  m.role === "user"
                    ? "bg-[var(--accent-soft)]"
                    : "bg-white/80 border border-[var(--line)]"
                }`}
              >
                {m.text}
              </div>
            ))}
            {askIncludeAll.busy ? (
              <p className="text-xs text-[var(--muted)]">Thinking…</p>
            ) : null}
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
}: {
  title: string;
  items: string[];
  tone: "ok" | "warn";
}) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((k) => (
          <span key={k} className={tone === "ok" ? "ats-chip ats-chip--ok" : "ats-chip ats-chip--warn"}>
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}
