"use client";

import { useMemo, useState } from "react";
import {
  buildCareerBrandKit,
  type CareerBrandKit,
} from "@/lib/ats/careerBrand";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-bold"
      onClick={() => {
        void copyText(text).then((ok) => {
          if (!ok) return;
          setDone(true);
          window.setTimeout(() => setDone(false), 1200);
        });
      }}
    >
      {done ? "Copied" : label || "Copy"}
    </button>
  );
}

export function CareerBrandPanel({
  resumeText,
  jdText,
}: {
  resumeText: string;
  jdText?: string;
}) {
  const [linkedinText, setLinkedinText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [kit, setKit] = useState<CareerBrandKit | null>(null);

  const empty = !resumeText.trim();

  const previewHint = useMemo(() => {
    if (empty) return "Load or paste a resume in Prepare first.";
    return "Generate a LinkedIn-ready brand kit from your working resume.";
  }, [empty]);

  function generate() {
    if (empty) return;
    setKit(
      buildCareerBrandKit({
        resumeText,
        linkedinText,
        targetRole: targetRole || jdText?.slice(0, 120) || "",
      }),
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 md:px-6">
      <header className="mb-4 max-w-3xl">
        <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--accent)] uppercase">
          Career Brand
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)]">
          LinkedIn positioning kit
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          We do not log into LinkedIn. Paste optional About/Experience text, set
          a target role, and copy improved headline + About into your profile.
          Same story as your ATS resume — clearer niche, stronger discoverability.
        </p>
      </header>

      {empty ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] bg-white/60 px-4 py-8 text-sm text-[var(--muted)]">
          {previewHint}
        </div>
      ) : (
        <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <section className="space-y-3">
            <label className="block text-xs font-bold tracking-wide text-[var(--muted)] uppercase">
              Target role (optional)
            </label>
            <input
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:outline-2 focus:outline-[color-mix(in_srgb,var(--accent)_35%,transparent)]"
              placeholder="e.g. Platform / SRE Engineer — banking"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
            <label className="block text-xs font-bold tracking-wide text-[var(--muted)] uppercase">
              Paste LinkedIn About / Experience (optional)
            </label>
            <textarea
              className="min-h-[160px] w-full resize-y rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm leading-relaxed outline-none"
              placeholder="Paste current LinkedIn About (and key experience lines) to check consistency with your resume…"
              value={linkedinText}
              onChange={(e) => setLinkedinText(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary px-4 py-2.5 text-sm"
              onClick={generate}
            >
              {kit ? "Regenerate brand kit" : "Generate brand kit"}
            </button>
            <p className="text-xs text-[var(--muted)]">
              Uses your working resume from Prepare / Analyse. Fast local pass —
              no LinkedIn OAuth.
            </p>
          </section>

          <section className="space-y-4">
            {!kit ? (
              <div className="rounded-xl border border-[var(--line)] bg-white/70 px-4 py-6 text-sm text-[var(--muted)]">
                Generate to see positioning, headlines, About draft, and a brand
                score.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-[var(--line)] bg-white/80 px-4 py-3">
                  <div>
                    <p className="text-xs font-bold tracking-wide text-[var(--muted)] uppercase">
                      Brand score
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
                      {kit.score}
                      <span className="text-base font-semibold text-[var(--muted)]">
                        /100
                      </span>
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      Niche: {kit.niche}
                    </p>
                  </div>
                  <CopyButton text={kit.positioning} label="Copy positioning" />
                </div>

                <article className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                      Positioning
                    </h3>
                  </div>
                  <p className="rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2 text-sm leading-relaxed">
                    {kit.positioning}
                  </p>
                </article>

                <article className="space-y-2">
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    Headline options
                  </h3>
                  <ul className="space-y-2">
                    {kit.headlines.map((h, i) => (
                      <li
                        key={h}
                        className="flex items-start justify-between gap-2 rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
                      >
                        <p className="text-sm leading-relaxed">
                          <span className="mr-2 text-xs font-bold text-[var(--muted)]">
                            {i + 1}.
                          </span>
                          {h}
                        </p>
                        <CopyButton text={h} />
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                      About draft
                    </h3>
                    <CopyButton text={kit.about} label="Copy About" />
                  </div>
                  <pre className="whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-white/80 px-3 py-3 font-sans text-sm leading-relaxed">
                    {kit.about}
                  </pre>
                </article>

                <article className="space-y-2">
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    Experience polish tips
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
                    {kit.experienceTips.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </article>

                <article className="space-y-2">
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    Checklist
                  </h3>
                  <ul className="space-y-2">
                    {kit.checklist.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-sm"
                      >
                        <p className="font-semibold text-[var(--ink)]">
                          {c.ok ? "✓" : "○"} {c.label}
                        </p>
                        {!c.ok ? (
                          <p className="mt-0.5 text-[var(--muted)]">{c.tip}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </article>

                {(kit.keywords.missing.length > 0 ||
                  kit.keywords.present.length > 0) && (
                  <article className="space-y-2 pb-6">
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                      Keyword signals
                    </h3>
                    <p className="text-sm text-[var(--muted)]">
                      Present:{" "}
                      {kit.keywords.present.slice(0, 10).join(", ") || "—"}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      Consider adding (if true):{" "}
                      {kit.keywords.missing.slice(0, 10).join(", ") || "—"}
                    </p>
                  </article>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
