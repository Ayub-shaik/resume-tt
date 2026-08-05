"use client";

import { useMemo, useState } from "react";
import type { QuickScores } from "@/lib/ats/keywords";
import { isNovelSuggestion } from "@/lib/ats/dedupe";

function fmtDelta(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `${n}`;
  return "0";
}

function tokenizeWords(text: string): string[] {
  return text.split(/(\s+)/);
}

function ImprovedText({ original, improved }: { original: string; improved: string }) {
  const origSet = new Set(
    original
      .toLowerCase()
      .match(/[a-z0-9][a-z0-9+.#/-]{2,}/g) || [],
  );
  const parts = tokenizeWords(improved);
  return (
    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
      {parts.map((part, i) => {
        const word = part.toLowerCase().replace(/[^a-z0-9+.#/-]/g, "");
        const isNew =
          word.length >= 3 &&
          !origSet.has(word) &&
          !/^\s+$/.test(part);
        if (isNew) {
          return (
            <mark
              key={i}
              className="rounded-sm bg-emerald-200/80 px-0.5 text-[var(--ink)]"
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </pre>
  );
}

export function ImproveCompare({
  original,
  improved,
  before,
  after,
  onAddLine,
  onAsk,
  onOriginalChange,
}: {
  original: string;
  improved: string;
  before: QuickScores;
  after: QuickScores;
  onAddLine?: (line: string) => void;
  onAsk?: (input: { question: string; context: string }) => Promise<string>;
  onOriginalChange?: (text: string) => void;
}) {
  const [ask, setAsk] = useState<{
    anchor: string;
    draft: string;
    busy: boolean;
    messages: Array<{ role: "user" | "assistant"; text: string }>;
  } | null>(null);
  const [editAsIs, setEditAsIs] = useState(false);

  const deltas = {
    overall: after.overall - before.overall,
    keywordMatchPct: after.keywordMatchPct - before.keywordMatchPct,
    atsReadability: after.atsReadability - before.atsReadability,
  };

  const improvedLines = useMemo(() => {
    return improved
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 20)
      .map((line) => {
        const novel = isNovelSuggestion(line, original);
        const existsInOriginal = original
          .toLowerCase()
          .includes(line.toLowerCase().slice(0, 48));
        return {
          line,
          novel,
          // Present in source but not a novel add → placement/order change
          reorder: !novel && existsInOriginal,
        };
      });
  }, [improved, original]);

  async function sendAsk() {
    if (!ask || !onAsk || !ask.draft.trim() || ask.busy) return;
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
              messages: [...prev.messages, { role: "assistant", text: reply }],
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

  return (
    <div className="relative space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["Overall", before.overall, after.overall, deltas.overall],
            ["Keywords", before.keywordMatchPct, after.keywordMatchPct, deltas.keywordMatchPct],
            ["ATS format", before.atsReadability, after.atsReadability, deltas.atsReadability],
          ] as const
        ).map(([label, b, a, d]) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--line)] bg-white/80 px-3 py-3 text-center"
          >
            <p className="text-[11px] font-semibold tracking-wide text-[var(--muted)] uppercase">
              {label}
            </p>
            <p className="font-[family-name:var(--font-display)] text-xl">
              {Math.round(b)}
              <span className="mx-1 text-[var(--muted)]">→</span>
              {Math.round(a)}
            </p>
            <p
              className={`text-sm font-semibold ${
                d > 0
                  ? "text-emerald-700"
                  : d < 0
                    ? "text-[var(--danger)]"
                    : "text-[var(--muted)]"
              }`}
            >
              {fmtDelta(d)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <section className="ats-pane flex min-h-[280px] flex-col">
          <header className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2">
            <span className="font-[family-name:var(--font-display)] text-sm font-semibold">
              As-is · original order
            </span>
            {onOriginalChange ? (
              <button
                type="button"
                className="rounded-md border border-[var(--line)] bg-white px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
                onClick={() => setEditAsIs((v) => !v)}
              >
                {editAsIs ? "Done" : "Edit"}
              </button>
            ) : null}
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 text-[var(--muted)]">
            {editAsIs && onOriginalChange ? (
              <textarea
                className="min-h-[240px] w-full resize-y rounded-lg border border-[var(--line)] bg-white/80 p-2 font-sans text-sm leading-relaxed text-[var(--ink)] outline-none"
                value={original}
                onChange={(e) => onOriginalChange(e.target.value)}
                spellCheck={false}
                aria-label="Edit as-is resume"
              />
            ) : (
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
                {original}
              </pre>
            )}
          </div>
        </section>
        <section className="ats-pane ats-pane--proposed flex min-h-[280px] flex-col">
          <header className="border-b border-emerald-200 px-3 py-2 font-[family-name:var(--font-display)] text-sm font-semibold text-emerald-900">
            Proposed · Ask inline
          </header>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            <ImprovedText original={original} improved={improved} />
            {(onAddLine || onAsk) &&
              improvedLines.slice(0, 24).map((row, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-emerald-200/70 bg-white/80 px-2 py-1.5 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    {row.reorder ? (
                      <span className="mb-0.5 inline-block text-[9px] font-bold tracking-wide text-[var(--muted)] uppercase">
                        Reorder
                      </span>
                    ) : null}
                    <p className="leading-relaxed">{row.line}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {onAsk ? (
                      <button
                        type="button"
                        className="rounded border border-[var(--line)] px-1.5 py-0.5 font-semibold"
                        onClick={() =>
                          setAsk({
                            anchor: row.line,
                            draft:
                              "Explain or further improve this line for the target role.",
                            busy: false,
                            messages: [],
                          })
                        }
                      >
                        Ask
                      </button>
                    ) : null}
                    {onAddLine && row.novel ? (
                      <button
                        type="button"
                        className="rounded border border-[var(--line)] px-1.5 py-0.5 font-bold"
                        onClick={() => onAddLine(row.line)}
                      >
                        +
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>

      {ask && (
        <div
          className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--panel-solid)] p-3 shadow-[var(--shadow)] sm:inset-x-auto sm:right-6 sm:bottom-6"
          role="dialog"
          aria-label="Ask about line"
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
                    : "border border-[var(--line)] bg-white/80"
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
