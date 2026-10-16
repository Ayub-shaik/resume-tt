"use client";

import { useEffect, useState } from "react";
import { JsonResumeEditor } from "@/components/JsonResumeEditor";
import { ImproveResumeViewer } from "@/components/ImproveResumeViewer";
import { LayoutStudio } from "@/components/LayoutStudio";
import type { JsonResume } from "@/lib/ats/jsonresume";
import type { TemplateId } from "@/lib/ats/templates";

export function ResumeBuilder({
  jsonResume,
  onJsonResumeChange,
  selectedTemplate,
  onTemplateChange,
  resumeText,
  busy,
  structuring,
  onStructureFromText,
  onPreviewPdf,
  onDownloadPdf,
  onExport,
}: {
  jsonResume: JsonResume | null;
  onJsonResumeChange: (jr: JsonResume) => void;
  selectedTemplate: TemplateId;
  onTemplateChange: (id: TemplateId) => void;
  resumeText: string;
  busy: string | null;
  structuring: boolean;
  onStructureFromText: () => void;
  onPreviewPdf: () => void;
  onDownloadPdf: () => void;
  onExport: (format: "docx" | "html" | "json" | "portable-json" | "pdf") => void;
}) {
  const [mobilePane, setMobilePane] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    if (!jsonResume && resumeText.trim()) {
      onStructureFromText();
    }
    // Parent passes a stable-enough callback; avoid depending on it to prevent restructure loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsonResume, resumeText]);

  return (
    // Mobile: allow the whole builder to scroll (avoid overflow-hidden + h-screen trap).
    // Desktop: keep split panes with internal scroll.
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:overflow-hidden">
      <div className="shrink-0 border-b border-[var(--line)] bg-white/70 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
              Resume builder
            </p>
            <p className="text-sm text-[var(--muted)]">
              Edit sections, preview full layouts, pick a template, download PDF.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
              disabled={Boolean(busy) || structuring || !resumeText.trim()}
              onClick={onStructureFromText}
            >
              {structuring ? "Structuring…" : "Refresh from text"}
            </button>
            <button
              type="button"
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
              disabled={Boolean(busy) || !jsonResume}
              onClick={onPreviewPdf}
            >
              {busy === "preview" ? "Previewing…" : "Preview PDF"}
            </button>
            <button
              type="button"
              className="btn-primary px-3 py-2 text-sm disabled:opacity-40"
              disabled={Boolean(busy) || !jsonResume}
              onClick={onDownloadPdf}
            >
              {busy === "download" ? "Downloading…" : "Download PDF"}
            </button>
            <select
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
              defaultValue=""
              disabled={Boolean(busy) || !jsonResume}
              onChange={(e) => {
                const format = e.target.value as
                  | "docx"
                  | "html"
                  | "json"
                  | "portable-json"
                  | "pdf";
                if (format) onExport(format);
                e.currentTarget.value = "";
              }}
              aria-label="Export resume format"
            >
              <option value="" disabled>Export as…</option>
              <option value="docx">DOCX</option>
              <option value="html">HTML</option>
              <option value="json">JSON Resume</option>
              <option value="portable-json">Portable sections JSON</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              type="button"
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold md:hidden"
              onClick={() => {
                setMobilePane((p) => {
                  const next = p === "edit" ? "preview" : "edit";
                  if (next === "preview") {
                    window.setTimeout(() => {
                      document
                        .getElementById("builder-live-preview")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 50);
                  }
                  return next;
                });
              }}
            >
              {mobilePane === "edit" ? "Show preview" : "Show editor"}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <LayoutStudio
            jsonResume={jsonResume}
            selectedTemplate={selectedTemplate}
            onSelect={(id) => onTemplateChange(id as TemplateId)}
            preparing={structuring}
            onPrepare={onStructureFromText}
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-2">
        <section
          className={`min-h-0 overflow-y-auto border-b border-[var(--line)] p-4 lg:border-r lg:border-b-0 ${
            mobilePane === "preview" ? "hidden lg:block" : ""
          }`}
        >
          {structuring && !jsonResume ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 text-sm text-[var(--muted)]">
              <span className="stream-status__spinner" />
              Structuring resume for the builder…
            </div>
          ) : (
            <JsonResumeEditor value={jsonResume} onChange={onJsonResumeChange} />
          )}
        </section>
        <section
          id="builder-live-preview"
          className={`flex min-h-[520px] flex-col bg-[#ebe7dc] p-4 lg:min-h-0 ${
            mobilePane === "edit" ? "hidden lg:flex" : "flex"
          }`}
        >
          <header className="mb-2 shrink-0 text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
            Live PDF preview · {selectedTemplate}
          </header>
          <div className="min-h-[480px] flex-1 overflow-y-auto rounded-xl border border-[var(--line)] bg-white shadow-sm lg:min-h-0 lg:overflow-hidden">
            <ImproveResumeViewer
              mode="modified"
              text={resumeText}
              originalPreviewUrl={null}
              originalPreviewMime={null}
              originalFilename={null}
              jsonResume={jsonResume}
              templateId={selectedTemplate}
            />
          </div>
        </section>
      </div>

    </div>
  );
}
