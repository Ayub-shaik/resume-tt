"use client";

import { useEffect, useId, useRef } from "react";
import type { ImproveFocus, TripleScores } from "@/lib/ats/keywords";
import type { ResumeChangeLine } from "@/lib/ats/resumeLineDiff";

export type TailorScoreVersion = {
  label: string; // Original | v1 | v2…
  scores: TripleScores;
  resumeText?: string;
};

export type TailorRowState = {
  improveCount: number;
  afterScores: TripleScores | null;
  changeLines: ResumeChangeLine[];
  feedActive: boolean;
  /** Chronological scores: Original, then each tailor pass */
  history: TailorScoreVersion[];
};

const GAUGE_SIZE = 100;
const STROKE = 7;
const R = (GAUGE_SIZE - STROKE) / 2;
const CX = GAUGE_SIZE / 2;
const CY = GAUGE_SIZE / 2;
const ARC_FRACTION = 0.75;
const CIRC = 2 * Math.PI * R;
const ARC_LEN = CIRC * ARC_FRACTION;

function CircularGauge({
  value,
  empty,
  compact,
}: {
  value: number | null;
  empty?: boolean;
  compact?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const display = empty || value == null ? null : Math.round(value);
  const pct = display == null ? 0 : Math.max(0, Math.min(100, display));
  const filled = (pct / 100) * ARC_LEN;
  const dotAngle = 135 + ARC_FRACTION * 360 * (pct / 100);
  const dotRad = (dotAngle * Math.PI) / 180;
  const dotX = CX + R * Math.cos(dotRad);
  const dotY = CY + R * Math.sin(dotRad);
  const size = compact ? GAUGE_SIZE * 0.62 : GAUGE_SIZE;

  return (
    <svg
      viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
      className={compact ? "brain-ring-gauge brain-ring-gauge--sm" : "brain-ring-gauge"}
      width={size}
      height={size}
      aria-hidden
      role="presentation"
    >
      <defs>
        <linearGradient id={`ring-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        stroke="color-mix(in srgb, var(--accent) 18%, #e2e8f0)"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${ARC_LEN} ${CIRC}`}
        transform={`rotate(135 ${CX} ${CY})`}
      />
      {display != null ? (
        <>
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={`url(#ring-grad-${uid})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRC}`}
            transform={`rotate(135 ${CX} ${CY})`}
            className="brain-ring-progress"
          />
          <circle cx={dotX} cy={dotY} r={compact ? 2.5 : 3.5} fill="#0891b2" />
        </>
      ) : null}
      <circle
        cx={CX}
        cy={CY}
        r={compact ? 20 : 26}
        fill="color-mix(in srgb, #e0f2fe 80%, white)"
      />
      <text
        x={CX}
        y={CY}
        textAnchor="middle"
        dominantBaseline="middle"
        className={compact ? "brain-ring-value brain-ring-value--sm" : "brain-ring-value"}
      >
        {display == null ? "—" : `${display}%`}
      </text>
    </svg>
  );
}

function Gauge({
  label,
  value,
  empty,
  onClick,
  clickable,
  compact,
}: {
  label: string;
  value: number | null;
  empty?: boolean;
  onClick?: () => void;
  clickable?: boolean;
  compact?: boolean;
}) {
  const inner = (
    <>
      <CircularGauge value={value} empty={empty} compact={compact} />
      <span className="brain-gauge-caption">{label}</span>
    </>
  );

  if (clickable && onClick) {
    return (
      <button
        type="button"
        className="brain-gauge brain-gauge-btn"
        onClick={onClick}
        aria-label={`${label} ${value ?? "not yet improved"}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="brain-gauge" aria-label={`${label} ${value ?? "—"}`}>
      {inner}
    </div>
  );
}

function TailorIcon() {
  return (
    <svg
      className="brain-tailor-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

function scoreForRow(row: ImproveFocus, scores: TripleScores): number {
  if (row === "ats") return scores.ats;
  if (row === "jd") return scores.jd;
  return scores.overall;
}

function TailorFeed({ lines }: { lines: ResumeChangeLine[] }) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines]);

  if (!lines.length) return null;

  return (
    <div className="tailor-feed" ref={boxRef}>
      {lines.map((line, i) => (
        <p key={i} className={`tailor-feed-line tailor-feed-${line.kind}`}>
          {line.kind === "remove" && "− "}
          {line.kind === "add" && "+ "}
          {line.kind === "modify" && "↻ "}
          {line.text}
        </p>
      ))}
    </div>
  );
}

export function ImproveSpeedometers({
  masterScores,
  jdPresent,
  rows,
  busyFocus,
  onImprove,
  onExplainTailor,
  onShowChanges,
  onVersionClick,
}: {
  masterScores: TripleScores;
  jdPresent: boolean;
  rows: Record<ImproveFocus, TailorRowState>;
  busyFocus: ImproveFocus | null;
  onImprove: (focus: ImproveFocus) => void;
  onExplainTailor: (metric: "ats" | "jd" | "overall") => void;
  onShowChanges: (focus: ImproveFocus) => void;
  onVersionClick?: (
    focus: ImproveFocus,
    version: TailorScoreVersion,
  ) => void;
}) {
  const allRows: Array<{ key: ImproveFocus; title: string }> = [
    { key: "ats", title: "ATS score" },
    { key: "jd", title: "JD match" },
    { key: "balanced", title: "Overall" },
  ];

  return (
    <div className="brain-speedometers">
      {!jdPresent ? (
        <p className="mb-2 text-xs text-[var(--muted)]">
          Showing ATS-only scoring (no usable job target).
        </p>
      ) : null}
      {allRows.map((row) => {
        const state = rows[row.key];
        const unavailable = !jdPresent && row.key !== "ats";
        const before = unavailable ? null : scoreForRow(row.key, masterScores);
        const after = unavailable
          ? null
          : state.afterScores
          ? scoreForRow(row.key, state.afterScores)
          : null;
        const nextVer = state.improveCount + 1;
        const saturated = state.improveCount >= 4;
        const rowBusy = busyFocus === row.key;
        const showFeed = rowBusy || state.feedActive;
        const history =
          state.history.length > 0
            ? state.history
            : [{ label: "Original", scores: masterScores }];

        return (
          <div key={row.key} className="brain-speed-row cardish">
            <p className="brain-speed-title">{row.title}</p>
            <div className="brain-speed-main">
              <Gauge
                label={unavailable ? "Add JD" : "Before"}
                value={before}
                empty={unavailable}
                onClick={
                  unavailable
                    ? undefined
                    : () =>
                        onExplainTailor(
                          row.key === "jd"
                            ? "jd"
                            : row.key === "ats"
                              ? "ats"
                              : "overall",
                        )
                }
                clickable={!unavailable}
              />
              <button
                type="button"
                className="brain-improve-btn"
                disabled={
                  unavailable ||
                  Boolean(busyFocus) ||
                  saturated ||
                  (after != null && after >= 92)
                }
                onClick={() => onImprove(row.key)}
                title={
                  unavailable
                    ? "Add a job description to enable this row"
                    : saturated
                      ? "Max passes for this row"
                      : after != null && after >= 92
                        ? "Already high — re-analyse if JD changed"
                        : state.improveCount === 0
                          ? "Improve this row"
                          : `Improve pass ${nextVer}`
                }
              >
                <TailorIcon />
                <span className="brain-improve-label">
                  {unavailable ? "Add JD" : "Improve"}
                </span>
                {state.improveCount > 0 ? (
                  <span className="brain-improve-badge">v{nextVer}</span>
                ) : null}
              </button>
              <Gauge
                label={unavailable ? "Add JD" : "After"}
                value={after}
                empty={after == null}
                clickable={after != null}
                onClick={
                  after != null ? () => onShowChanges(row.key) : undefined
                }
              />
            </div>
            {history.length > 1 ? (
              <div className="brain-version-gauges" aria-label="Score versions">
                {history.map((h) => (
                  <Gauge
                    key={h.label}
                    label={h.label}
                    value={scoreForRow(row.key, h.scores)}
                    compact
                    clickable={Boolean(onVersionClick && h.resumeText)}
                    onClick={
                      onVersionClick && h.resumeText
                        ? () => onVersionClick(row.key, h)
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : null}
            {showFeed ? <TailorFeed lines={state.changeLines} /> : null}
          </div>
        );
      })}
    </div>
  );
}
