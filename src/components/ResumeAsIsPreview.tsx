"use client";

import { useEffect, useState } from "react";
import { PdfPreview } from "@/components/PdfPreview";

type Props = {
  url: string | null;
  mimeType: string | null;
  filename: string | null;
  className?: string;
};

function isPdfFile(mimeType: string | null, filename: string | null) {
  const name = (filename || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();
  return mime === "application/pdf" || mime.includes("pdf") || name.endsWith(".pdf");
}

export function ResumeAsIsPreview({ url, mimeType, filename, className }: Props) {
  const [pages, setPages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!url || !isPdfFile(mimeType, filename)) {
      setPages([]);
      setBusy(false);
      setErr(null);
      return;
    }

    let cancelled = false;
    setBusy(true);
    setErr(null);
    setPages([]);

    void (async () => {
      try {
        const blobRes = await fetch(url);
        if (!blobRes.ok) {
          throw new Error(`Could not read uploaded file (${blobRes.status})`);
        }
        const blob = await blobRes.blob();
        const fd = new FormData();
        fd.append(
          "file",
          new File([blob], filename || "resume.pdf", {
            type: mimeType || blob.type || "application/pdf",
          }),
        );
        const res = await fetch("/api/resumes/preview", {
          method: "POST",
          body: fd,
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          pages?: string[];
        };
        if (!res.ok) {
          throw new Error(data.error || "Preview render failed");
        }
        if (!data.pages?.length) {
          throw new Error("Preview returned no pages");
        }
        if (!cancelled) setPages(data.pages);
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
  }, [url, mimeType, filename]);

  if (!url) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-[var(--line-strong)] bg-white/50 text-sm text-[var(--muted)] ${className || ""}`}
      >
        Upload a PDF/DOCX to preview the original file as-is.
      </div>
    );
  }

  const pdf = isPdfFile(mimeType, filename);
  if (pdf) {
    if (pages.length) {
      return (
        <PdfPreview
          pages={pages}
          title={filename || "Uploaded resume"}
          pdfUrl={url}
          className={className}
        />
      );
    }

    if (busy) {
      return (
        <div
          className={`flex min-h-[480px] flex-col items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white/80 text-sm text-[var(--muted)] ${className || ""}`}
        >
          <span className="stream-status__spinner" />
          Rendering original PDF…
        </div>
      );
    }

    return (
      <div
        className={`flex min-h-[320px] flex-col items-start justify-center gap-2 rounded-xl border border-[var(--line)] bg-white/80 p-4 text-sm ${className || ""}`}
      >
        <p className="font-semibold">{filename || "Uploaded PDF"}</p>
        {err ? (
          <p className="text-[var(--danger)]">{err}</p>
        ) : (
          <p className="text-[var(--muted)]">
            Could not render a page preview. Download the original file instead.
          </p>
        )}
        <a
          href={url}
          download={filename || "resume.pdf"}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold"
        >
          Download / open original PDF
        </a>
      </div>
    );
  }

  const isDoc =
    mimeType?.includes("word") ||
    mimeType === "application/msword" ||
    /\.docx?$/i.test(filename || "");

  return (
    <div
      className={`flex flex-col items-start justify-center gap-2 rounded-xl border border-[var(--line)] bg-white/80 p-4 text-sm ${className || ""}`}
    >
      <p className="font-semibold">{filename || "Uploaded file"}</p>
      <p className="text-[var(--muted)]">
        {isDoc
          ? "Word files are kept for AI parsing; browsers can’t render DOCX natively. Download to view the original layout."
          : "Preview is available for PDF. This file type is used for text extraction only."}
      </p>
      <a
        href={url}
        download={filename || "resume"}
        className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold"
      >
        Download original
      </a>
    </div>
  );
}

/** Fetch Drive (or any same-origin) file into a blob: URL for AS-IS preview. */
export async function fetchPreviewBlob(
  fileId: string,
): Promise<{ url: string; mimeType: string }> {
  const res = await fetch(`/api/drive/raw?fileId=${encodeURIComponent(fileId)}`);
  if (!res.ok) {
    const text = await res.text();
    let msg = `Preview fetch failed (${res.status})`;
    try {
      msg = (JSON.parse(text) as { error?: string }).error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const mimeType = blob.type || res.headers.get("content-type") || "application/pdf";
  return { url: URL.createObjectURL(blob), mimeType };
}
