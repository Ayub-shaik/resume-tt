import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center text-[var(--ink,#111)]">
      <p className="text-sm text-[var(--muted,#666)]">Error 404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-sm text-[var(--muted,#666)]">
        The page you are looking for does not exist or has moved.
      </p>
      <p className="mt-6">
        <Link href="/" className="underline underline-offset-2">
          Back to RocketCV
        </Link>
      </p>
    </main>
  );
}
