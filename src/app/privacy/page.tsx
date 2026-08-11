import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Resume Builder",
  description: "How TomorrowTools Resume Builder handles account and resume data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-[var(--ink,#111)]">
      <p className="text-sm text-[var(--muted,#666)]">
        <Link href="/" className="underline-offset-2 hover:underline">
          ← Resume Builder
        </Link>
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-[var(--muted,#666)]">Last updated: 11 August 2026</p>

      <div className="prose mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          TomorrowTools Resume Builder (“we”) is an invite-only product operated for
          authenticated users. This page describes what we store and how to delete it.
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
        <h2 className="text-lg font-semibold">Retention</h2>
        <p>
          Data remains until you delete it or an operator purges the host database.
          There is no separate marketing use of resume content.
        </p>
        <h2 className="text-lg font-semibold">Your deletion rights</h2>
        <p>
          Signed-in users can erase account-owned product data (including recovery
          jobs and memory snapshots) from Profile → Settings → Delete account, which
          calls <code>DELETE /api/account</code>. Browser drafts in local storage
          must be cleared in the browser separately.
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
