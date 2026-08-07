"use client";

import { useEffect, useState } from "react";
import { ResumeAsIsPreview } from "@/components/ResumeAsIsPreview";
import type { TemplateId } from "@/lib/ats/templates";
import type { JsonResume } from "@/lib/ats/jsonresume";

function PdfFrame({
  url,
  title,
  className,
}: {
  url: string;
  title: string;
  className?: string;
}) {
  // Prefer <object> for blob PDFs (more reliable than iframe alone).
  // Explicit min-height avoids flex collapse (h-full of a 0-height parent).
  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg border border-[var(--line)] bg-white ${className || ""}`}
      style={{ minHeight: 480 }}
    >
      <object
        data={url}
        type="application/pdf"
        className="absolute inset-0 h-full w-full"
        aria-label={title}
      >
        <iframe title={title} src={url} className="h-full min-h-[480px] w-full border-0" />
      </object>
    </div>
  );
}

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
      setBusy(false);
      setErr(null);
      return;
    }
    // Render from structured resume when available — text alone is fallback UI.
    if (!jsonResume) {
      setPdfUrl(null);
      return;
    }
    let cancelled = false;
    let createdUrl: string | null = null;
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
        if (!blob.size || !blob.type.includes("pdf")) {
          throw new Error("Render returned an empty or non-PDF response");
        }
        createdUrl = URL.createObjectURL(blob);
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return createdUrl;
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
      // Do not revoke here — React Strict Mode remounts; revoke only when
      // replaced via setPdfUrl or on unmount of the url holder below.
    };
  }, [mode, jsonResume, templateId]);

  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl],
  );

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

  if (pdfUrl) {
    return (
      <PdfFrame
        url={pdfUrl}
        title="Formatted resume preview"
        className="h-full min-h-[480px]"
      />
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
