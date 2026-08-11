"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import { JOB_SEARCH_URL, MPI_URL } from "@/lib/productUrls";

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
        <span className="landing__bar-mark">Private · Invite-only</span>
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
          <p className="landing__eyebrow">TomorrowTools</p>
          <div className="landing__brand-mark">
            <Image
              src="/resume-mark.svg"
              alt=""
              width={48}
              height={48}
              priority
            />
            <div>
              <span>ATS-first</span>
              <strong>Resume Builder</strong>
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
                className="btn-primary btn-primary--pill px-6 py-3.5 text-sm"
                onClick={() =>
                  void signIn(
                    "google",
                    { callbackUrl: "/app" },
                    { prompt: "select_account" },
                  )
                }
              >
                Analyse my resume
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
                className="btn-primary btn-primary--pill px-5 py-3 text-sm"
                onClick={() =>
                  void signIn(
                    "google",
                    { callbackUrl: "/app" },
                    { prompt: "select_account" },
                  )
                }
              >
                Raise my ATS odds
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

        <footer className="landing__footer">
          <p>
            Resume → call → close the loop with{" "}
            <a href={MPI_URL} className="underline underline-offset-2">
              Personal Interviewer →
            </a>
          </p>
          <p className="mt-2 text-sm">
            <a href="/privacy" className="underline underline-offset-2">
              Privacy
            </a>
            {" · "}
            <a href="/terms" className="underline underline-offset-2">
              Terms
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
