"use client";

import { useEffect, useMemo, useState } from "react";
import { ImproveResumeViewer } from "@/components/ImproveResumeViewer";
import { diffResumeLines } from "@/lib/ats/resumeLineDiff";
import type { JsonResume } from "@/lib/ats/jsonresume";
import type { TemplateId } from "@/lib/ats/templates";

export function VersionPreviewModal({
  label,
  resumeText,
  originalText,
  templateId,
  onClose,
  onLoad,
}: {
  label: string;
  resumeText: string;
  originalText: string;
  templateId: TemplateId;
  onClose: () => void;
  onLoad: () => void;
}) {
  const [jsonResume, setJsonResume] = useState<JsonResume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const highlights = useMemo(
    () => diffResumeLines(originalText, resumeText, []),
    [originalText, resumeText],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/ats/structure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "structure", resumeText }),
        });
        const data = (await res.json()) as {
          jsonResume?: JsonResume;
          error?: string;
        };
        if (!res.ok || !data.jsonResume) {
          throw new Error(data.error || "Could not render this version");
        }
        if (!cancelled) setJsonResume(data.jsonResume);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resumeText]);

  async function download() {
    if (!jsonResume) return;
    const res = await fetch("/api/ats/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: templateId, resume: jsonResume }),
    });
    if (!res.ok) throw new Error("Download failed");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-${label}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="drive-modal" role="dialog" aria-modal="true" aria-label={`${label} resume preview`}>
      <button type="button" className="drive-modal__backdrop" aria-label="Close preview" onClick={onClose} />
      <div className="drive-modal__panel max-h-[94vh] w-[min(1100px,100%)]">
        <div className="drive-modal__head">
          <div>
            <p className="drive-modal__title">Rendered resume {label}</p>
            <p className="drive-modal__sub">Green additions, amber changes, and red removals are highlighted below.</p>
          </div>
          <button type="button" className="drive-modal__close" onClick={onClose}>Close</button>
        </div>
        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[1fr_280px]">
          <div className="min-h-[520px] rounded-xl bg-[#ebe7dc] p-3">
            {busy ? <p className="p-4 text-sm text-[var(--muted)]">Rendering version…</p> : null}
            {error ? <p className="p-4 text-sm text-[var(--danger)]">{error}</p> : null}
            {!busy && !error && jsonResume ? (
              <ImproveResumeViewer
                mode="modified"
                text={resumeText}
                originalPreviewUrl={null}
                originalPreviewMime={null}
                originalFilename={null}
                jsonResume={jsonResume}
                templateId={templateId}
              />
            ) : null}
          </div>
          <aside className="rounded-xl border border-[var(--line)] bg-white/80 p-3">
            <h3 className="text-sm font-semibold">Improvements</h3>
            <div className="mt-2 max-h-[420px] space-y-1 overflow-y-auto text-xs">
              {highlights.map((line, index) => (
                <p
                  key={`${index}-${line.text}`}
                  className={`rounded border px-2 py-1 ${
                    line.kind === "add"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : line.kind === "remove"
                        ? "border-red-200 bg-red-50 text-red-900"
                        : line.kind === "modify"
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-transparent text-[var(--muted)]"
                  }`}
                >
                  {line.text}
                </p>
              ))}
            </div>
          </aside>
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-[var(--line)] p-3">
          <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={onLoad}>
            Load {label} for analysis
          </button>
          <button type="button" className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold" disabled={!jsonResume} onClick={() => void download()}>
            Download {label}
          </button>
        </footer>
      </div>
    </div>
  );
}
