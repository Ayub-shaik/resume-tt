"use client";

import { useEffect, useState } from "react";
import { ResumeAsIsPreview } from "@/components/ResumeAsIsPreview";
import { PdfPreview } from "@/components/PdfPreview";
import type { TemplateId } from "@/lib/ats/templates";
import type { JsonResume } from "@/lib/ats/jsonresume";

export function ImproveResumeViewer({
  mode,
  text,
  originalPreviewUrl,
  originalPreviewMime,
  originalFilename,
  jsonResume,
  templateId,
}: {
  mode: "modified" | "original";
  text: string;
  originalPreviewUrl: string | null;
  originalPreviewMime: string | null;
  originalFilename: string | null;
  jsonResume: JsonResume | null;
  templateId: TemplateId;
}) {
  const [pages, setPages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openingPdf, setOpeningPdf] = useState(false);

  useEffect(() => {
    if (mode !== "modified") {
      setPages([]);
      setBusy(false);
      setErr(null);
      return;
    }
    if (!jsonResume) {
      setPages([]);
      return;
    }
    let cancelled = false;
    setBusy(true);
    setErr(null);
    void (async () => {
      try {
        // Image stack — blob PDF iframe/object embeds often render blank.
        const imgRes = await fetch("/api/ats/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template: templateId,
            resume: jsonResume,
            format: "images",
          }),
        });
        if (!imgRes.ok) {
          const data = await imgRes.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error || "Preview render failed",
          );
        }
        const data = (await imgRes.json()) as { pages?: string[] };
        if (cancelled) return;
        if (!data.pages?.length) {
          throw new Error("Render returned no preview pages");
        }
        setPages(data.pages);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : String(e));
          setPages([]);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, jsonResume, templateId]);

  async function openPdfTab() {
    if (!jsonResume || openingPdf) return;
    setOpeningPdf(true);
    try {
      const res = await fetch("/api/ats/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateId, resume: jsonResume }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || "PDF open failed",
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setOpeningPdf(false);
    }
  }

  if (mode === "original") {
    if (originalPreviewUrl) {
      return (
        <ResumeAsIsPreview
          url={originalPreviewUrl}
          mimeType={originalPreviewMime}
          filename={originalFilename}
          className="h-full min-h-[480px]"
        />
      );
    }
    return (
      <pre className="max-h-[50vh] min-h-[320px] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--line)] bg-white/80 p-3 font-sans text-sm leading-relaxed">
        {text || "No original content yet. Upload a resume in Prepare."}
      </pre>
    );
  }

  if (pages.length) {
    return (
      <div className="flex h-full min-h-[480px] flex-col">
        <PdfPreview
          pages={pages}
          title="Formatted resume preview"
          className="min-h-0 flex-1"
        />
        <div className="mt-2 shrink-0">
          <button
            type="button"
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            disabled={openingPdf}
            onClick={() => void openPdfTab()}
          >
            {openingPdf ? "Opening…" : "Open PDF in new tab"}
          </button>
        </div>
      </div>
    );
  }

  if (busy || (!jsonResume && text.trim())) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--line)] bg-white/60 text-sm text-[var(--muted)]">
        <span className="stream-status__spinner" />
        {jsonResume
          ? "Rendering formatted preview…"
          : "Structuring resume for preview…"}
      </div>
    );
  }

  if (err) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-[var(--danger)]">{err}</p>
        <pre className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--line)] bg-white/80 p-3 font-sans text-sm leading-relaxed">
          {text}
        </pre>
      </div>
    );
  }

  return (
    <pre className="max-h-[50vh] min-h-[320px] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--line)] bg-white/80 p-3 font-sans text-sm leading-relaxed">
      {text || "No content yet. Paste or upload a resume, then open Improve or Builder."}
    </pre>
  );
}
