"use client";

const STAGES = [
  "Parsing resume…",
  "Reading job description…",
  "Scoring coverage…",
  "Building dual view…",
] as const;

export function AnalyzeLoadingPanel({
  stage,
  onStop,
  label = "Analyzing your resume",
}: {
  stage: number;
  onStop?: () => void;
  label?: string;
}) {
  return (
    <div className="flex min-h-[min(520px,70vh)] flex-col items-center justify-center gap-4 rounded-xl border border-[var(--line)] bg-white/80 p-8 text-center">
      <span className="stream-status__spinner" />
      <p className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
        {label}
      </p>
      <p className="text-sm font-medium text-[var(--accent)]">
        {STAGES[stage % STAGES.length]}
      </p>
      {onStop ? (
        <button
          type="button"
          className="rounded-xl border border-[var(--danger)] bg-white px-4 py-2 text-sm font-semibold text-[var(--danger)]"
          onClick={onStop}
        >
          Stop
        </button>
      ) : null}
      <div className="grid w-full max-w-2xl gap-3 md:grid-cols-2">
        <div className="ats-pane min-h-[160px] animate-pulse p-4" />
        <div className="ats-pane ats-pane--proposed min-h-[160px] animate-pulse p-4" />
      </div>
    </div>
  );
}
