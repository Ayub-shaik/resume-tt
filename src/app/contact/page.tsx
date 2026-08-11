import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact — Resume Builder",
  description: "Admin, support, and info contacts for TomorrowTools Resume Builder.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-[var(--ink,#111)]">
      <p className="text-sm text-[var(--muted,#666)]">
        <Link href="/" className="underline-offset-2 hover:underline">
          ← Resume Builder
        </Link>
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Contact
      </h1>
      <ul className="mt-6 space-y-3 text-sm leading-relaxed">
        <li>
          <strong>Support</strong> —{" "}
          <a className="underline underline-offset-2" href="mailto:support@tomorrowtools.dev">
            support@tomorrowtools.dev
          </a>
        </li>
        <li>
          <strong>Admin</strong> —{" "}
          <a className="underline underline-offset-2" href="mailto:admin@tomorrowtools.dev">
            admin@tomorrowtools.dev
          </a>
        </li>
        <li>
          <strong>Info</strong> —{" "}
          <a className="underline underline-offset-2" href="mailto:info@tomorrowtools.dev">
            info@tomorrowtools.dev
          </a>
        </li>
      </ul>
      <p className="mt-6 text-sm text-[var(--muted,#666)]">
        These addresses use Cloudflare Email Routing catch-all on tomorrowtools.dev.
        Prefer{" "}
        <Link href="/support" className="underline underline-offset-2">
          Support
        </Link>{" "}
        for user issues.
      </p>
    </main>
  );
}
