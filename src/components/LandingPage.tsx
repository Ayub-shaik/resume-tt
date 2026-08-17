"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import { JOB_SEARCH_URL, MPI_URL } from "@/lib/productUrls";
import { ProductFooter } from "@/components/ProductFooter";

const COLD_FACTS = [
  {
    figure: "75–80%",
    label: "of resumes never clear the ATS filter",
    detail: "Before a recruiter ever opens the file.",
  },
  {
    figure: "250+",
    label: "applications per corporate role, on average",
    detail: "High-demand posts can hit hundreds in minutes.",
  },
  {
    figure: "<2%",
    label: "typical interview callback rate",
    detail: "You apply everywhere — silence is the default.",
  },
  {
    figure: "0 eyes",
    label: "on most first-pass screening",
    detail: "In the AI era, parsers and rankers decide who exists.",
  },
];

const FEATURES = [
  {
    title: "Match the JD",
    body: "Paste the role you’re targeting. We score keyword coverage, gaps, and fit — so your resume speaks that job’s language.",
  },
  {
    title: "Analyse & improve",
    body: "ATS readiness, missing skills, and targeted rewrites. Raise your odds before you hit Apply.",
  },
  {
    title: "Export clean PDFs",
    body: "30+ parser-friendly layouts. Looks sharp to humans — and readable to the bots in between.",
  },
  {
    title: "Interview analyser",
    body: "Once you get the call, MPI scores how you sound — structure, depth, ownership — not just a practice script.",
  },
];

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 37.3 44 32.5 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

function signInWithGoogle() {
  return signIn(
    "google",
    { callbackUrl: "/app" },
    { prompt: "select_account" },
  );
}

export function LandingPage({
  googleEnabled,
  error,
}: {
  googleEnabled: boolean;
  error?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(!googleEnabled);

  async function continueEmail() {
    setBusy(true);
    setLocalError(null);
    try {
      const res = await signIn("allowlist-dev", {
        email,
        password,
        callbackUrl: "/app",
        redirect: false,
      });
      if (res?.error) {
        setLocalError(
          "Sign-in failed. Use an allowlisted email and password.",
        );
        return;
      }
      window.location.href = "/app";
    } catch {
      setLocalError("Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="landing">
      <div className="landing__bar">
        <a className="landing__bar-mark" href="/">
          RocketCV
        </a>
        <div className="landing__bar-links">
          <a className="landing__bar-link" href={MPI_URL}>
            Personal Interviewer
          </a>
          <a className="landing__bar-link" href={JOB_SEARCH_URL}>
            Job Search
          </a>
        </div>
      </div>

      <div className="landing__stage">
        <main className="landing__copy">
          <div className="landing__brand-mark">
            <Image
              src="/rocketcv-mark.svg"
              alt=""
              width={48}
              height={48}
              priority
            />
            <div>
              <span>ATS-first</span>
              <strong>RocketCV</strong>
            </div>
          </div>
          <h1 className="landing__headline">
            Most resumes never reach a <em>human</em>.
          </h1>
          <p className="landing__sub">
            You apply. Silence. Again. The filter already decided — unless your
            resume matches the job you&apos;re actually targeting.
          </p>

          <div className="landing__auth">
            {googleEnabled && (
              <button
                type="button"
                className="landing__btn-google"
                aria-label="Sign in with Google"
                onClick={() => void signInWithGoogle()}
              >
                <GoogleMark />
                <span>Sign in with Google</span>
              </button>
            )}
            {googleEnabled && !showEmail && (
              <button
                type="button"
                className="landing__email-secondary"
                onClick={() => setShowEmail(true)}
              >
                Email sign-in
              </button>
            )}
            {googleEnabled && showEmail && (
              <div className="landing__auth-divider" role="separator">
                or
              </div>
            )}
            {showEmail && (
              <div className="landing__email">
                <input
                  type="email"
                  placeholder="Allowlisted email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void continueEmail();
                  }}
                />
                <button
                  type="button"
                  disabled={busy || !email.includes("@") || !password}
                  className="landing__email-secondary"
                  onClick={() => void continueEmail()}
                >
                  {busy ? "…" : "Sign in with email"}
                </button>
              </div>
            )}
            {!googleEnabled && !showEmail && (
              <button
                type="button"
                className="btn-primary btn-primary--pill px-6 py-3.5 text-sm"
                onClick={() => setShowEmail(true)}
              >
                Analyse my resume
              </button>
            )}
            {(error || localError) && (
              <p className="landing__error">{error || localError}</p>
            )}
            <p className="landing__hint">
              Invite-only. Sign in to score ATS fit against a real JD — then
              raise your odds before you apply.
            </p>
          </div>
        </main>

        <aside className="landing__atmosphere" aria-label="The quiet pipeline">
          <div className="landing__atmosphere-inner">
            <p className="landing__atmosphere-kicker">The quiet pipeline</p>
            <h3>Hundreds apply. Almost nobody gets through.</h3>
            <p>
              When a high-demand role goes live, applications stack in minutes.
              Nearly all of them claim to be “ATS-ready.” Almost none are tuned
              to <em>that</em> job description.
            </p>
          </div>
          <p className="landing__powered">
            Powered by{" "}
            <a
              href="https://commander.tomorrowtools.dev"
              rel="noopener noreferrer"
            >
              Commander
            </a>
            . The AI harness for Ask, code, and control — model-agnostic, so the
            loop stays inspectable.
          </p>
        </aside>
      </div>

      <div className="landing__below">
        <section className="landing__cold" aria-label="Why applications go dark">
          <p className="landing__section-kicker">The cold numbers</p>
          <h2 className="landing__section-title">
            This is why your inbox stays empty.
          </h2>
          <p className="landing__section-lead">
            HR teams are not reading 300 PDFs with their eyes. Rankers do the
            first cut. If you miss the keywords, your chance of a reply collapses
            toward zero — no matter how strong you are in person.
          </p>
          <ul className="landing__facts">
            {COLD_FACTS.map((f) => (
              <li key={f.figure}>
                <span className="landing__fact-figure">{f.figure}</span>
                <span className="landing__fact-label">{f.label}</span>
                <span className="landing__fact-detail">{f.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing__hope" aria-label="How to stand out">
          <p className="landing__section-kicker landing__section-kicker--hope">
            The turn
          </p>
          <h2 className="landing__section-title">
            Stand out by matching the JD you&apos;re targeting.
          </h2>
          <p className="landing__section-lead">
            Generic “ATS resumes” still look identical to a parser. Specificity
            wins. Align your summary, skills, and bullets to the role — and your
            odds of clearing the filter can jump from near-zero into the
            interview stack. Candidates who tailor per JD often see{" "}
            <strong>2–3× higher response rates</strong> than spray-and-pray.
          </p>
          <ol className="landing__steps">
            <li>
              <strong>Paste the JD</strong>
              <span> — the exact role you want.</span>
            </li>
            <li>
              <strong>See the gaps</strong>
              <span> — what’s missing vs what already lands.</span>
            </li>
            <li>
              <strong>Tailor &amp; export</strong>
              <span> — then apply with a resume built for that posting.</span>
            </li>
          </ol>
          <div className="landing__hope-ctas">
            {googleEnabled ? (
              <button
                type="button"
                className="landing__btn-google landing__btn-google--compact"
                aria-label="Sign in with Google"
                onClick={() => void signInWithGoogle()}
              >
                <GoogleMark />
                <span>Sign in with Google</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary btn-primary--pill px-5 py-3 text-sm"
                onClick={() => setShowEmail(true)}
              >
                Raise my ATS odds
              </button>
            )}
            <a className="landing__text-link" href={JOB_SEARCH_URL}>
              Pair with Job Search →
            </a>
          </div>
        </section>

        <section className="landing__jobs" aria-label="Personal Interviewer">
          <p className="landing__section-kicker">Also from TomorrowTools</p>
          <h2 className="landing__section-title">
            Clearing ATS is only half the war.
          </h2>
          <p className="landing__section-lead">
            <strong>My Personal Interviewer (MPI)</strong> is not a quiz bank —
            it&apos;s an <strong>interview analyser</strong>. Rehearse against
            your JD and resume, then get scored on structure, ownership,
            trade-offs, and clarity. See where you ramble, where you go shallow,
            and what to tighten before the real panel.
          </p>
          <p className="landing__jobs-stat">
            Roughly <strong>1 in 5–6</strong> interviewed candidates get an
            offer in many tech loops. MPI helps you spend practice hours on the
            gaps that actually cost offers — not generic “tell me about
            yourself” loops.
          </p>
          <a className="landing__text-link" href={MPI_URL}>
            Open Personal Interviewer →
          </a>
        </section>

        <section className="landing__jobs" aria-label="Job Search">
          <h2 className="landing__section-title">
            Finding roles is half the fight.
          </h2>
          <p className="landing__section-lead">
            <strong>TomorrowTools Job Search</strong> runs an automation
            pipeline that discovers openings and delivers matched roles to your{" "}
            <strong>mobile</strong> — so you can tailor here and apply while the
            queue is still thin.
          </p>
          <p className="landing__jobs-stat">
            High-demand posts fill ATS queues in{" "}
            <strong>~15–60 minutes</strong>. Being early with a matched resume
            beats being 200th with a perfect generic one.
          </p>
          <a className="landing__text-link" href={JOB_SEARCH_URL}>
            Explore Job Search →
          </a>
        </section>

        <section className="landing__features" aria-label="What you get">
          {FEATURES.map((f) => (
            <article key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </section>

        <section className="landing__hope" aria-label="What, why, and how to use RocketCV">
          <p className="landing__section-kicker">Guide</p>
          <h2 className="landing__section-title">What, why, and how-to</h2>
          <div className="landing__features" style={{ marginTop: 16 }}>
            <article>
              <h3>What it is</h3>
              <p>
                RocketCV helps you paste or upload a resume, optionally add a job
                description, analyse ATS-oriented readiness, improve ATS wording without inventing
                facts, preview parser-friendly templates, and export a clean PDF. From a logged-in
                session you can open MPI with context for mock interviews.
              </p>
            </article>
            <article>
              <h3>Why it exists</h3>
              <p>
                Most applications die in first-pass parsers and keyword screens. The product focuses
                on coaching heuristics you can act on — coverage, clarity, and export layouts —
                while keeping your published API contracts stable across Play builds.
              </p>
            </article>
            <article>
              <h3>How to use</h3>
              <p>
                1) Sign in (invite-only). 2) Prepare: paste/upload resume; add JD text or URL when
                targeting a role. 3) Analyze &amp; improve: read meters/dimensions, apply rewrites,
                Improve ATS even without a JD. 4) Templates: pick a layout, generate structured
                preview, export PDF. 5) Continue to MPI when ready for interview practice.
              </p>
            </article>
          </div>
          <p className="landing__section-lead" style={{ marginTop: 20 }}>
            <strong>Shipped capabilities:</strong> JD-aware scoring when a role is present; hide
            missing-keywords / Improve JD / JD &amp; Overall meters when no JD; cover-letter vs
            resume detection; 60s wait messaging; scrollable UI while jobs run; template gallery
            with visual cards; session handoff into MPI; fact-safe improve via brain passes;
            recovery journaling for long AI jobs.
          </p>
        </section>

        <footer className="landing__footer">
          <p>
            Resume → call → close the loop with{" "}
            <a href={MPI_URL} className="underline underline-offset-2">
              Personal Interviewer →
            </a>
          </p>
          <ProductFooter product="RocketCV" />
          <p className="mt-2 text-sm">
            <a href="/privacy" className="underline underline-offset-2">
              Privacy
            </a>
            {" · "}
            <a href="/terms" className="underline underline-offset-2">
              Terms
            </a>
            {" · "}
            <a href="/support" className="underline underline-offset-2">
              Support
            </a>
            {" · "}
            <a href="/contact" className="underline underline-offset-2">
              Contact
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
