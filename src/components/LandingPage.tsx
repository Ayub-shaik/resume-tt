"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { JOB_SEARCH_URL, MPI_URL } from "@/lib/productUrls";
import { ProductFooter } from "@/components/ProductFooter";

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
    <div className="landing landing--signal landing--signal-v2" data-landing="signal-v2">
      <header className="landing__bar">
        <a className="landing__bar-mark" href="/">
          RocketCV
        </a>
        <div className="landing__bar-links">
          <a className="landing__bar-link" href="/templates">
            Layouts
          </a>
          <a className="landing__bar-link" href={MPI_URL}>
            MPI
          </a>
          <a className="landing__bar-link" href={JOB_SEARCH_URL}>
            Job Search
          </a>
        </div>
      </header>

      <div className="landing__stage">
      <section className="landing__hero" aria-label="RocketCV">
        <p className="landing__signal-kicker">ATS-first resume tool</p>
        <h1 className="landing__wordmark">RocketCV</h1>
        <p className="landing__product-name">Match the JD. Clear the filter.</p>
        <p className="landing__line">
          Most resumes never reach a <em>human</em>.
        </p>
        <p className="landing__sub">
          Score ATS fit against a real job description, improve what matters,
          then export a parser-friendly PDF.
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
          <p className="landing__hint">Invite-only · Powered by Commander</p>
        </div>
      </section>

      <aside className="landing__visual" aria-hidden="true">
        <div className="landing__visual-card">
          <div className="landing__visual-top">
            <span className="landing__visual-dot" />
            <span>ATS score</span>
          </div>
          <p className="landing__visual-q">
            JD keywords covered — before you hit Apply.
          </p>
          <div className="landing__visual-meters">
            <div>
              <span>Keyword fit</span>
              <i style={{ width: "82%" }} />
            </div>
            <div>
              <span>Clarity</span>
              <i style={{ width: "74%" }} />
            </div>
            <div>
              <span>Export ready</span>
              <i style={{ width: "91%" }} />
            </div>
          </div>
          <p className="landing__visual-note">
            Improve ATS wording without inventing facts — then pick a clean template.
          </p>
        </div>
      </aside>
      </div>

      <section className="landing__strip" aria-label="How it works">
        <div>
          <strong>01</strong>
          <span>Paste resume + JD</span>
        </div>
        <div>
          <strong>02</strong>
          <span>Analyse & improve</span>
        </div>
        <div>
          <strong>03</strong>
          <span>Export clean PDF</span>
        </div>
      </section>

      <footer className="landing__footer">
        <div className="landing__footer-links">
          <a href={MPI_URL}>MPI interview practice →</a>
          <a href={JOB_SEARCH_URL}>Job Search →</a>
        </div>
        <ProductFooter product="RocketCV" />
        <p className="landing__legal">
          <a href="/privacy">Privacy</a>
          {" · "}
          <a href="/terms">Terms</a>
          {" · "}
          <a href="/support">Support</a>
          {" · "}
          <a href="/contact">Contact</a>
        </p>
      </footer>
    </div>
  );
}
