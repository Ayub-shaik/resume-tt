"use client";

export function ScoreRing({
  label,
  valueText,
  fraction,
  tickFraction,
}: {
  label: string;
  valueText: string;
  fraction: number;
  tickFraction?: number | null;
}) {
  const pct = Math.max(0, Math.min(1, fraction));
  const size = 128;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const tick = tickFraction == null ? null : Math.max(0, Math.min(1, tickFraction));
  const tickAngle = tick == null ? 0 : -Math.PI / 2 + tick * Math.PI * 2;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(250,246,239,0.12)"
            strokeWidth={stroke}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#FFB020"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
          {tick != null ? (
            <line
              x1={cx + Math.cos(tickAngle) * (r - stroke / 2)}
              y1={cy + Math.sin(tickAngle) * (r - stroke / 2)}
              x2={cx + Math.cos(tickAngle) * (r + stroke / 2)}
              y2={cy + Math.sin(tickAngle) * (r + stroke / 2)}
              stroke="#FAF6EF"
              strokeWidth={2}
            />
          ) : null}
        </svg>
        <p className="absolute inset-0 flex items-center justify-center text-2xl font-semibold tabular-nums text-[#FAF6EF]">
          {valueText}
        </p>
      </div>
      <p className="text-sm text-[#A39A88]">{label}</p>
    </div>
  );
}
