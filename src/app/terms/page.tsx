import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — Resume Builder",
  description: "Terms for using TomorrowTools Resume Builder.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-[var(--ink,#111)]">
      <p className="text-sm text-[var(--muted,#666)]">
        <Link href="/" className="underline-offset-2 hover:underline">
          ← Resume Builder
        </Link>
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Terms of Use
      </h1>
      <p className="mt-2 text-sm text-[var(--muted,#666)]">Last updated: 11 August 2026</p>

      <div className="mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          Access is invite-only. You must provide accurate account information and
          not upload content you do not have rights to process.
        </p>
        <p>
          The service provides workflow tooling and coaching heuristics. It does not
          guarantee ATS passage, interviews, or employment outcomes. AI outputs can
          be wrong; you remain responsible for what you submit to employers.
        </p>
        <p>
          Long-running AI requests may be journaled and polled. After a server
          restart, incomplete jobs may become “uncertain” and are not guaranteed to
          auto-complete.
        </p>
        <p>
          We may suspend access for abuse, security risk, or allowlist removal. You
          may delete your account data as described in the{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          The software is provided as-is for the pilot. Licensing for redistribution
          is separate and not granted by these terms alone.
        </p>
      </div>
    </main>
  );
}
