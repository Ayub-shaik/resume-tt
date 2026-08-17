import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — RocketCV",
  description: "How RocketCV handles account and resume data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-[var(--ink,#111)]">
      <p className="text-sm text-[var(--muted,#666)]">
        <Link href="/" className="underline-offset-2 hover:underline">
          ← RocketCV
        </Link>
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-[var(--muted,#666)]">Last updated: 12 August 2026</p>

      <div className="prose mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          RocketCV (“we”) is an invite-only TomorrowTools product operated for
          authenticated users. This page describes what we store and how to export or
          delete it.
        </p>
        <h2 className="text-lg font-semibold">What we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account identity (email, name, auth tokens) for sign-in and allowlisting.</li>
          <li>
            Resume text, job descriptions, analysis outputs, tailored drafts, session
            history, and optional Google Drive tokens you connect.
          </li>
          <li>
            Durable recovery job records and bounded memory snapshots used to resume
            long AI operations.
          </li>
          <li>
            Content you submit may be sent to the configured AI provider (default:
            local OpenClaw; remote only if the operator enables it).
          </li>
        </ul>
        <h2 className="text-lg font-semibold">How we use it</h2>
        <p>
          To provide ATS analysis, tailoring, PDF export, and related coaching
          features. Scores are coaching heuristics, not validated hiring predictions.
        </p>
        <h2 className="text-lg font-semibold">Storage and encryption</h2>
        <p>
          Product data is stored in SQLite files encrypted at rest with an operator
          key (<code>DATA_AT_REST_KEY</code>, SQLCipher-class page encryption). The
          database file is not readable as plaintext SQLite without that key. Protect
          the key like a production secret; losing it means losing access to the data.
          Android session tokens use EncryptedSharedPreferences (Keystore-backed).
          Content sent to a remote AI provider is subject to that provider’s controls.
        </p>
        <h2 className="text-lg font-semibold">Retention</h2>
        <p>
          Default: data remains until you export/delete it or an operator purges the
          host database. There is no separate marketing use of resume content. Operators
          may later configure automatic expiry of recovery snapshots; until then,
          deletion is user- or operator-driven.
        </p>
        <h2 className="text-lg font-semibold">Export and deletion</h2>
        <p>
          Signed-in users can download a ZIP of account-owned product data from Profile →
          Settings → Export (<code>GET /api/account/export</code>). Password hashes and
          Drive refresh tokens are omitted from exports. Erasure is available from
          Profile → Settings → Delete account (<code>DELETE /api/account</code>), which
          removes resumes, ATS sessions, recovery jobs, and memory snapshots. Browser
          drafts in local storage must be cleared in the browser separately.
        </p>
        <h2 className="text-lg font-semibold">Self-host / zero-egress</h2>
        <p>
          When self-hosting, set a local AI base URL and keep{" "}
          <code>AI_ALLOW_REMOTE=false</code> so prompts stay on your network. Use your
          own <code>AUTH_SECRET</code> and provider keys (BYOK). See the project README.
        </p>
        <h2 className="text-lg font-semibold">Contact</h2>
        <p>
          Support:{" "}
          <a className="underline underline-offset-2" href="mailto:support@aysentra.com">
            support@aysentra.com
          </a>
          . Admin:{" "}
          <a className="underline underline-offset-2" href="mailto:admin@aysentra.com">
            admin@aysentra.com
          </a>
          . Info:{" "}
          <a className="underline underline-offset-2" href="mailto:info@aysentra.com">
            info@aysentra.com
          </a>
          . Pages:{" "}
          <Link href="/support" className="underline underline-offset-2">
            Support
          </Link>
          {" · "}
          <Link href="/contact" className="underline underline-offset-2">
            Contact
          </Link>
          .
        </p>
        <p>
          See also <Link href="/terms" className="underline underline-offset-2">Terms</Link>.
        </p>
      </div>
    </main>
  );
}
