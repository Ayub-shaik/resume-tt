"use client";

import { useEffect, useRef, useState } from "react";
import { JsonResumeEditor } from "@/components/JsonResumeEditor";
import { ImproveResumeViewer } from "@/components/ImproveResumeViewer";
import { TemplateGalleryModal } from "@/components/TemplateGalleryModal";
import { TemplateThumb } from "@/components/TemplateThumb";
import type { JsonResume } from "@/lib/ats/jsonresume";
import {
  TEMPLATE_CATEGORY_ORDER,
  TEMPLATE_META,
  type TemplateId,
} from "@/lib/ats/templates";

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
}) {
  const [category, setCategory] = useState("All");
  const [layoutsOpen, setLayoutsOpen] = useState(true);
  const [mobilePane, setMobilePane] = useState<"edit" | "preview">("edit");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryStart, setGalleryStart] = useState<TemplateId>(selectedTemplate);
  const templatesScrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(false);

  useEffect(() => {
    if (!jsonResume && resumeText.trim()) {
      onStructureFromText();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- structure once on mount when needed
  }, []);

  const categories = [
    "All",
    ...TEMPLATE_CATEGORY_ORDER.filter((c) =>
      TEMPLATE_META.some((t) => t.category === c),
    ),
  ];
  const visible = TEMPLATE_META.filter(
    (t) => category === "All" || t.category === category,
  );

  function openGallery(id: TemplateId) {
    setGalleryStart(id);
    setGalleryOpen(true);
  }

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
            <button
              type="button"
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold"
              onClick={() => setLayoutsOpen((v) => !v)}
            >
              {layoutsOpen ? "Hide layouts" : "Show layouts"}
            </button>
          </div>
        </div>

        {layoutsOpen ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    category === c
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                      : "border-[var(--line)] bg-white/70 text-[var(--muted)]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div
              ref={templatesScrollRef}
              className="grid max-h-[40vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-5"
              onScroll={(e) => {
                const el = e.currentTarget;
                const atBottom =
                  el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
                if (atBottom && atBottomRef.current) {
                  // Second scroll gesture at bottom collapses templates into a bar
                  setLayoutsOpen(false);
                  atBottomRef.current = false;
                  return;
                }
                atBottomRef.current = atBottom;
              }}
            >
              {visible.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openGallery(t.id)}
                  className={`overflow-hidden rounded-xl border text-left transition ${
                    selectedTemplate === t.id
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20"
                      : "border-[var(--line)] bg-white/70 hover:border-[var(--accent)]/40"
                  }`}
                >
                  <div className="border-b border-[var(--line)] bg-[#ebe7dc] p-2">
                    <div className="mx-auto max-h-28 overflow-hidden rounded-md bg-white shadow-sm">
                      <TemplateThumb id={t.id} accent={t.accent} />
                    </div>
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="truncate text-xs font-semibold">{t.name}</p>
                    <p className="truncate text-[10px] text-[var(--muted)]">
                      {t.category} · tap to preview
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--muted)]">
              Scroll to the end of templates, then scroll again to minimise into
              a bar.
            </p>
          </div>
        ) : (
          <button
            type="button"
            className="mt-2 flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2 text-left text-xs font-semibold"
            onClick={() => setLayoutsOpen(true)}
          >
            <span>
              Templates · {TEMPLATE_META.find((t) => t.id === selectedTemplate)?.name || selectedTemplate}
            </span>
            <span className="text-[var(--muted)]">Expand</span>
          </button>
        )}
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

      <TemplateGalleryModal
        open={galleryOpen}
        initialId={galleryStart}
        onClose={() => setGalleryOpen(false)}
        onSelect={(id) => {
          onTemplateChange(id);
          setGalleryOpen(false);
        }}
      />
    </div>
  );
}
