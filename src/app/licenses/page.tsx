import type { Metadata } from "next";
import Link from "next/link";
import licenses from "@/lib/licenses.generated.json";

export const metadata: Metadata = {
  title: "Open-source licenses — RocketCV",
  description: "Open-source packages RocketCV is built with, and their licenses.",
};

export default function LicensesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-[var(--ink,#111)]">
      <p className="text-sm text-[var(--muted,#666)]">
        <Link href="/" className="underline-offset-2 hover:underline">
          ← RocketCV
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Open-source licenses</h1>
      <p className="mt-3 text-sm text-[var(--muted,#666)]">
        RocketCV is built with the following direct runtime dependencies. Each remains under its own license; their
        transitive dependencies are listed in the project lockfile.
      </p>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-4">Package</th>
            <th className="py-2 pr-4">Version</th>
            <th className="py-2">License</th>
          </tr>
        </thead>
        <tbody>
          {licenses.map((p) => (
            <tr key={p.name} className="border-b">
              <td className="py-2 pr-4">{p.name}</td>
              <td className="py-2 pr-4">{p.version}</td>
              <td className="py-2">{p.license}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
