"use client";

import { useEffect, useState } from "react";
import { ResumeAsIsPreview } from "@/components/ResumeAsIsPreview";
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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "modified") {
      setPdfUrl(null);
      return;
    }
    if (!jsonResume || !text.trim()) {
      setPdfUrl(null);
      return;
    }
    let cancelled = false;
    setBusy(true);
    setErr(null);
    void (async () => {
      try {
        const res = await fetch("/api/ats/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template: templateId, resume: jsonResume }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error || "Preview render failed",
          );
        }
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : String(e));
          setPdfUrl(null);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, jsonResume, templateId, text]);

  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl],
  );

  if (mode === "original" && originalPreviewUrl) {
    return (
      <ResumeAsIsPreview
        url={originalPreviewUrl}
        mimeType={originalPreviewMime}
        filename={originalFilename}
        className="h-full min-h-[360px]"
      />
    );
  }

  if (mode === "modified" && pdfUrl) {
    return (
      <iframe
        title="Formatted resume preview"
        src={pdfUrl}
        className="h-full min-h-[360px] w-full rounded-lg border-0 bg-white"
      />
    );
  }

  if (mode === "modified" && busy) {
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--line)] bg-white/60 text-sm text-[var(--muted)]">
        <span className="stream-status__spinner" />
        Rendering formatted preview…
      </div>
    );
  }

  if (mode === "modified" && err) {
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
    <pre className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--line)] bg-white/80 p-3 font-sans text-sm leading-relaxed">
      {text || "No content yet."}
    </pre>
  );
}
