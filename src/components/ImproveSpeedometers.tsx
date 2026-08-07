"use client";

import type { ImproveFocus, ResumeVersion, TripleScores } from "@/lib/ats/keywords";

type VersionEntry = {
  version: ResumeVersion;
  scores: TripleScores;
  resumeMd: string;
};

function Gauge({
  label,
  value,
  max = 100,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="brain-gauge" aria-label={`${label} ${value}`}>
      <svg viewBox="0 0 120 70" className="brain-gauge-svg">
        <path
          d="M 12 60 A 48 48 0 0 1 108 60"
          fill="none"
          stroke="var(--line)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 12 60 A 48 48 0 0 1 108 60"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${pct} 100`}
        />
      </svg>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function scoreForRow(row: ImproveFocus, scores: TripleScores): number {
  if (row === "ats") return scores.ats;
  if (row === "jd") return scores.jd;
  return scores.overall;
}

export function ImproveSpeedometers({
  masterScores,
  currentScores,
  versions,
  nextVersion,
  busy,
  saturated,
  onImprove,
  onDownloadVersion,
}: {
  masterScores: TripleScores;
  currentScores: TripleScores;
  versions: VersionEntry[];
  nextVersion: ResumeVersion | null;
  busy: boolean;
  saturated: boolean;
  onImprove: (focus: ImproveFocus) => void;
  onDownloadVersion: (v: ResumeVersion) => void;
}) {
  const rows: Array<{ key: ImproveFocus; title: string }> = [
    { key: "ats", title: "ATS score" },
    { key: "jd", title: "JD match" },
    { key: "balanced", title: "Overall" },
  ];

  return (
    <div className="brain-speedometers">
      {rows.map((row) => {
        const before = scoreForRow(row.key, masterScores);
        const after = scoreForRow(row.key, currentScores);
        return (
          <div key={row.key} className="brain-speed-row cardish">
            <p className="brain-speed-title">{row.title}</p>
            <div className="brain-speed-main">
              <Gauge label="Before" value={before} />
              <button
                type="button"
                className="brain-improve-btn"
                disabled={busy || saturated || !nextVersion}
                onClick={() => onImprove(row.key)}
                title={
                  saturated
                    ? "No further honest gains"
                    : `Improve → v${nextVersion}`
                }
              >
                <span className="brain-improve-arrow" aria-hidden>
                  ⤴
                </span>
                {nextVersion ? (
                  <span className="brain-improve-badge">v{nextVersion}</span>
                ) : null}
                <span className="sr-only">Improve {row.title}</span>
              </button>
              <Gauge label="After" value={after} />
            </div>
            <div className="brain-version-pills">
              {([1, 2, 3, 4] as ResumeVersion[]).map((v) => {
                const unlocked = versions.some((x) => x.version === v);
                return (
                  <button
                    key={v}
                    type="button"
                    className={`brain-v-pill${unlocked ? " unlocked" : ""}`}
                    disabled={!unlocked}
                    onClick={() => onDownloadVersion(v)}
                  >
                    v{v}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
