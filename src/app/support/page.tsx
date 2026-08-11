import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support — Resume Builder",
  description: "Contact TomorrowTools support for Resume Builder.",
};

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-[var(--ink,#111)]">
      <p className="text-sm text-[var(--muted,#666)]">
        <Link href="/" className="underline-offset-2 hover:underline">
          ← Resume Builder
        </Link>
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Support
      </h1>
      <p className="mt-4 text-sm leading-relaxed">
        For product help, account deletion help, or Play Store listing issues,
        email{" "}
        <a className="underline underline-offset-2" href="mailto:support@tomorrowtools.dev">
          support@tomorrowtools.dev
        </a>
        .
      </p>
      <p className="mt-3 text-sm leading-relaxed">
        General questions:{" "}
        <a className="underline underline-offset-2" href="mailto:info@tomorrowtools.dev">
          info@tomorrowtools.dev
        </a>
        .
      </p>
      <p className="mt-3 text-sm leading-relaxed">
        Admin / operator / security:{" "}
        <a className="underline underline-offset-2" href="mailto:admin@tomorrowtools.dev">
          admin@tomorrowtools.dev
        </a>
        .
      </p>
      <p className="mt-6 text-sm text-[var(--muted,#666)]">
        Also see{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="underline underline-offset-2">
          Terms
        </Link>
        {" · "}
        <Link href="/contact" className="underline underline-offset-2">
          Contact
        </Link>
        .
      </p>
    </main>
  );
}
