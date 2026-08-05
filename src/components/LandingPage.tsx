"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import { MPI_URL } from "@/lib/productUrls";

const FEATURES = [
  {
    title: "Prepare",
    body: "Upload or paste your resume and job description — import from Google Drive.",
  },
  {
    title: "Analyze",
    body: "ATS keyword coverage, gap highlights, and dual-view suggestions before you edit.",
  },
  {
    title: "Improve",
    body: "AI-assisted rewrites with compare view — you stay in control of every claim.",
  },
  {
    title: "Builder",
    body: "15 clean PDF templates, JSON Resume editor, preview and download.",
  },
  {
    title: "Sessions",
    body: "Save prepare → analyze → improve → builder progress and pick up later.",
  },
  {
    title: "Invite-only",
    body: "Google or email sign-in, restricted to emails your admin allowlists.",
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
      </div>

      <div className="landing__stage">
        <main className="landing__copy">
          <p className="landing__eyebrow">TomorrowTools</p>
          <div className="landing__brand-mark">
            <Image src="/mpi-logo.svg" alt="" width={48} height={48} priority />
            <div>
              <span>ATS-friendly</span>
              <strong>Resume Builder</strong>
            </div>
          </div>
          <p className="landing__quote">
            A sharp resume opens the door — make every line earn its place.
          </p>
          <h1 className="landing__headline">
            Prepare, analyze, improve — then <em>export</em>.
          </h1>
          <p className="landing__sub">
            Full ATS workflow: JD coverage, targeted improvements, and polished
            PDF templates. Practice interviews on{" "}
            <a href={MPI_URL} className="underline underline-offset-2">
              MPI
            </a>
            .
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
                Continue with Google
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
              Access is allowlisted. Prefer Google when OAuth is configured.
            </p>
          </div>
        </main>

        <aside className="landing__atmosphere" aria-label="Atmosphere">
          <div className="landing__atmosphere-inner">
            <h3>ATS-first, not generic.</h3>
            <p>
              Keyword coverage, honest gaps, and templates that parse cleanly —
              before you hit apply.
            </p>
            <div className="landing__chips">
              <span>Prepare</span>
              <span>Analyze</span>
              <span>Improve</span>
              <span>Builder</span>
            </div>
          </div>
        </aside>
      </div>

      <div className="landing__below">
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
            Ready to rehearse?{" "}
            <a href={MPI_URL} className="underline underline-offset-2">
              Mock interviews on MPI →
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
