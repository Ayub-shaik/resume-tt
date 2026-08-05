"use client";

import { useMemo, useState } from "react";
import type { AtsAnalysis } from "@/lib/ats/analyze";
import {
  annotateResumeLines,
  buildImprovedText,
  type LineTag,
} from "@/lib/ats/dualPage";
import { isNovelSuggestion } from "@/lib/ats/dedupe";

const TAG_STYLE: Record<LineTag, string> = {
  weak: "bg-amber-100 text-amber-900 border-amber-300",
  remove: "bg-red-100 text-red-900 border-red-300",
  improve: "bg-sky-100 text-sky-900 border-sky-300",
  vague: "bg-orange-100 text-orange-900 border-orange-300",
  keyword: "bg-violet-100 text-violet-900 border-violet-300",
  ats: "bg-teal-100 text-teal-900 border-teal-300",
  outdated: "bg-stone-200 text-stone-800 border-stone-400",
  inflate: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300",
  missing: "bg-rose-100 text-rose-900 border-rose-300",
  strong: "bg-emerald-100 text-emerald-900 border-emerald-300",
  ok: "bg-transparent text-[var(--muted)] border-transparent",
};

type AskThread = {
  anchor: string;
  messages: Array<{ role: "user" | "assistant"; text: string }>;
  draft: string;
  busy: boolean;
};

export function AnalyzeWorkbench({
  resumeText,
  analysis,
  onAdd,
  onReplace,
  onAsk,
  onResumeChange,
}: {
  resumeText: string;
  analysis: AtsAnalysis;
  onAdd: (text: string) => void;
  onReplace: (current: string, suggested: string) => void;
  onAsk: (input: {
    question: string;
    context: string;
  }) => Promise<string>;
  onResumeChange?: (text: string) => void;
}) {
  const [ask, setAsk] = useState<AskThread | null>(null);
  const [mobilePane, setMobilePane] = useState<"original" | "improved">(
    "original",
  );
  const [editAsIs, setEditAsIs] = useState(false);

  const suggestions = analysis.rewriteSuggestions || [];
  const novelSuggestions = useMemo(
    () =>
      suggestions
        .filter((r) => {
          const same =
            r.current.trim() &&
            r.suggested.trim() &&
            r.current.trim() !== r.suggested.trim();
          if (!same) return isNovelSuggestion(r.suggested, resumeText);
          return true;
        })
        .map((r) => {
          const isReorderOnly =
            !isNovelSuggestion(r.suggested, resumeText) &&
            r.current.trim() !== r.suggested.trim();
          return {
            ...r,
            kind: isReorderOnly ? ("reorder" as const) : ("edit" as const),
          };
        }),
    [suggestions, resumeText],
  );

  const leftLines = useMemo(
    () => annotateResumeLines(resumeText, suggestions, analysis.gaps || []),
    [resumeText, suggestions, analysis.gaps],
  );

  const improved = useMemo(
    () => buildImprovedText(resumeText, suggestions),
    [resumeText, suggestions],
  );

  function openAsk(anchor: string, seed?: string) {
    setAsk({
      anchor,
      messages: [],
      draft: seed || "Why is this better, and how would you tighten it?",
      busy: false,
    });
  }

  async function sendAsk() {
    if (!ask || !ask.draft.trim() || ask.busy) return;
    const question = ask.draft.trim();
    setAsk((prev) =>
      prev
        ? {
            ...prev,
            draft: "",
            busy: true,
            messages: [...prev.messages, { role: "user", text: question }],
          }
        : prev,
    );
    try {
      const reply = await onAsk({ question, context: ask.anchor });
      setAsk((prev) =>
        prev
          ? {
              ...prev,
              busy: false,
              messages: [
                ...prev.messages,
                { role: "assistant", text: reply },
              ],
            }
          : prev,
      );
    } catch (e) {
      setAsk((prev) =>
        prev
          ? {
              ...prev,
              busy: false,
              messages: [
                ...prev.messages,
                {
                  role: "assistant",
                  text: e instanceof Error ? e.message : String(e),
                },
              ],
            }
          : prev,
      );
    }
  }

  const paneToggle = (
    <div className="mb-2 flex gap-1 md:hidden">
      <button
        type="button"
        className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${
          mobilePane === "original"
            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
            : "border-[var(--line)] bg-white"
        }`}
        onClick={() => setMobilePane("original")}
      >
        Original
      </button>
      <button
        type="button"
        className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${
          mobilePane === "improved"
            ? "border-emerald-600 bg-emerald-50"
            : "border-[var(--line)] bg-white"
        }`}
        onClick={() => setMobilePane("improved")}
      >
        Improved
      </button>
    </div>
  );

  return (
    <div className="relative space-y-4">
      {paneToggle}
      <div className="grid min-h-0 gap-3 md:grid-cols-2">
        <section
          className={`ats-pane flex min-h-[360px] max-h-[70vh] flex-col ${
            mobilePane === "original" ? "flex" : "hidden md:flex"
          }`}
        >
          <header className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2">
            <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight">
              As-is · original order
            </span>
            {onResumeChange ? (
              <button
                type="button"
                className="rounded-md border border-[var(--line)] bg-white px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
                onClick={() => setEditAsIs((v) => !v)}
              >
                {editAsIs ? "Show tags" : "Edit"}
              </button>
            ) : null}
          </header>
          {editAsIs && onResumeChange ? (
            <textarea
              className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-[13px] leading-relaxed outline-none"
              value={resumeText}
              onChange={(e) => onResumeChange(e.target.value)}
              spellCheck={false}
              aria-label="Edit as-is resume"
            />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[13px] leading-relaxed">
              {leftLines.map((row, i) => (
                <div
                  key={i}
                  className={`group flex gap-2 rounded px-1 py-0.5 ${
                    row.tag !== "ok" ? "bg-[#faf7f2]" : ""
                  }`}
                >
                  <div className="w-16 shrink-0 pt-0.5">
                    {row.tag !== "ok" ? (
                      <span
                        className={`inline-block rounded border px-1 py-0.5 text-[9px] font-bold tracking-wide uppercase ${TAG_STYLE[row.tag]}`}
                        title={row.note}
                      >
                        {row.tag}
                      </span>
                    ) : null}
                  </div>
                  <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[var(--ink)]">
                    {row.text || "\u00a0"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          className={`ats-pane ats-pane--proposed flex min-h-[360px] max-h-[70vh] flex-col ${
            mobilePane === "improved" ? "flex" : "hidden md:flex"
          }`}
        >
          <header className="border-b border-emerald-200 px-3 py-2 font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-emerald-950">
            Proposed · Ask inline
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[13px] leading-relaxed">
            {improved.lines.map((row, i) => (
              <div
                key={i}
                className={`flex gap-2 rounded px-1 py-0.5 ${
                  row.modified ? "bg-white/90" : ""
                }`}
              >
                <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                  {row.text || "\u00a0"}
                </p>
                {row.modified && row.text.trim() ? (
                  <div className="flex shrink-0 items-start gap-1">
                    {isNovelSuggestion(row.text, resumeText) ? (
                      <button
                        type="button"
                        className="rounded border border-[var(--line)] bg-white px-1.5 py-0.5 text-[10px] font-bold"
                        title="Add to working resume"
                        onClick={() => onAdd(row.text)}
                      >
                        +
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded border border-[var(--line)] bg-white px-1.5 py-0.5 text-[10px] font-bold"
                      title="Ask about this line"
                      onClick={() => openAsk(row.text)}
                    >
                      Ask
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>

      {(analysis.gaps || []).length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 px-3 py-2 text-sm">
          <p className="text-xs font-semibold tracking-wide text-rose-900 uppercase">
            Gaps
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[var(--ink)]">
            {(analysis.gaps || []).map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight">
          Edit plan
        </h3>
        {novelSuggestions.map((r, i) => (
          <div
            key={i}
            className="relative rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.72)] px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold">
                {r.area}
                {r.kind === "reorder" ? (
                  <span className="ml-2 text-[10px] font-bold tracking-wide text-[var(--muted)] uppercase">
                    Reorder
                  </span>
                ) : null}
              </p>
              <div className="flex gap-1">
                {r.kind !== "reorder" &&
                isNovelSuggestion(r.suggested, resumeText) ? (
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-xs font-bold"
                    title="Add suggested text"
                    onClick={() => onAdd(r.suggested)}
                  >
                    +
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-xs font-bold"
                  title="Replace original line"
                  onClick={() => onReplace(r.current, r.suggested)}
                >
                  /
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-xs font-bold"
                  onClick={() =>
                    openAsk(
                      `Area: ${r.area}\nNow: ${r.current}\nTry: ${r.suggested}\nWhy: ${r.why}`,
                    )
                  }
                >
                  Ask
                </button>
              </div>
            </div>
            <p className="mt-1 text-[var(--muted)]">Now: {r.current}</p>
            <p className="mt-1">Try: {r.suggested}</p>
            {r.why ? (
              <p className="mt-1 text-xs text-[var(--muted)]">{r.why}</p>
            ) : null}
          </div>
        ))}
        {!novelSuggestions.length && (
          <p className="text-sm text-[var(--muted)]">
            No novel edit suggestions — section order and wording already look
            aligned.
          </p>
        )}
      </div>

      {ask && (
        <div
          className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--panel-solid)] p-3 shadow-[var(--shadow)] sm:inset-x-auto sm:right-6 sm:bottom-6"
          role="dialog"
          aria-label="Ask about suggestion"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--accent)] uppercase">
                Ask
              </p>
              <p className="line-clamp-2 text-xs text-[var(--muted)]">
                {ask.anchor}
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-[var(--muted)]"
              onClick={() => setAsk(null)}
            >
              Close
            </button>
          </div>
          <div className="mb-2 max-h-40 space-y-2 overflow-y-auto text-sm">
            {ask.messages.map((m, i) => (
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
            {ask.busy ? (
              <p className="text-xs text-[var(--muted)]">Thinking…</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm outline-none"
              value={ask.draft}
              disabled={ask.busy}
              onChange={(e) =>
                setAsk((prev) =>
                  prev ? { ...prev, draft: e.target.value } : prev,
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendAsk();
                }
              }}
            />
            <button
              type="button"
              className="btn-primary px-3 py-1.5 text-sm disabled:opacity-40"
              disabled={ask.busy || !ask.draft.trim()}
              onClick={() => void sendAsk()}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
