"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { MPI_URL } from "@/lib/productUrls";
import { ProductFooter } from "@/components/ProductFooter";

type ProfileData = {
  user: { email: string; name: string; role: string };
  resumes: Array<{
    id: string;
    name: string;
    createdAt: string;
    score?: { overall: number; jdCoveragePct: number } | null;
  }>;
  interviews: Array<{
    id: string;
    name: string;
    status: string;
    finalScore: number | null;
  }>;
  performance: {
    history: Array<{ id: string; name: string; score: number; at: string }>;
    recurringWeaknesses: Array<{ text: string; count: number }>;
    competencyTrends: Array<{
      name: string;
      latest: number;
      avg: number;
      series: number[];
      improving: number;
    }>;
    readinessPct: number | null;
    growthVsConsistency: Array<{
      name: string;
      delta: number;
      label: string;
    }>;
  };
  allowlist?: Array<{ email: string; createdAt: string }>;
};

export function ProfileClient() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{
    id: string;
    name: string;
    content: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  async function load() {
    const res = await fetch("/api/profile");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed");
    setData(json);
  }

  useEffect(() => {
    void load().catch((e) => setError(String(e.message || e)));
  }, []);

  async function openPreview(id: string, name: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/resumes/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load resume");
      setPreview({
        id,
        name: json.resume?.name || name,
        content: String(json.resume?.content || ""),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeResume(id: string, name: string) {
    if (
      !window.confirm(
        `Delete resume “${name}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Delete failed");
      if (preview?.id === id) setPreview(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function exportAccount() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          (json as { error?: string }).error || "Export failed",
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tomorrowtools-resume-export.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "Permanently delete your account and all stored resume/session data on this service? This cannot be undone.",
      )
    ) {
      return;
    }
    const typed = window.prompt('Type DELETE to confirm account erasure:');
    if (typed !== "DELETE") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Delete failed");
      await signOut({ callbackUrl: "/" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (
      !window.confirm(
        `Delete ${ids.length} resume${ids.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/resumes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Delete failed");
      if (preview && selectedIds.has(preview.id)) setPreview(null);
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function addEmail() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeEmail(target: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/allowlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="p-8 text-sm text-[var(--muted)]">
        {error || "Loading profile…"}
      </div>
    );
  }

  return (
    <div className="profile-shell mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-6">
        <div className="flex items-center gap-3">
          <Image src="/rocketcv-mark.svg" alt="RocketCV" width={48} height={48} />
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[var(--accent)] uppercase">
              RocketCV · Profile
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
              {data.user.name}
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {data.user.email}
              {data.user.role === "admin" ? " · Admin" : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app"
            className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.72)] px-3 py-2 text-sm font-semibold"
          >
            Studio
          </Link>
          <a
            href={MPI_URL}
            className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.72)] px-3 py-2 text-sm font-semibold"
            target="_blank"
            rel="noopener noreferrer"
          >
            MPI Interviews
          </a>
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}

      <section className="glass-panel mb-8 rounded-[var(--radius)] p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              Your resumes
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Uploads and ATS saves ({data.resumes.length}). Preview or delete
              ones you no longer need.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.resumes.length > 0 && (
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={
                    data.resumes.length > 0 &&
                    selectedIds.size === data.resumes.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(data.resumes.map((r) => r.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                />
                Select all
              </label>
            )}
            <button
              type="button"
              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-800 disabled:opacity-40"
              disabled={busy || selectedIds.size === 0}
              onClick={() => void removeSelected()}
            >
              Delete selected ({selectedIds.size})
            </button>
          </div>
        </div>
        <ul className="space-y-2 text-sm">
          {data.resumes.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-3"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedIds.has(r.id)}
                  onChange={(e) => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(r.id);
                      else next.delete(r.id);
                      return next;
                    });
                  }}
                  aria-label={`Select ${r.name}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-[var(--muted)]">
                    {new Date(r.createdAt).toLocaleString()}
                    {r.score
                      ? ` · Score ${r.score.overall}/10 · JD ${r.score.jdCoveragePct}%`
                      : " · Not scored"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40"
                  disabled={busy}
                  onClick={() => void openPreview(r.id, r.name)}
                >
                  Preview
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-800 disabled:opacity-40"
                  disabled={busy}
                  onClick={() => void removeResume(r.id, r.name)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {!data.resumes.length && (
            <li className="text-[var(--muted)]">
              No resumes yet — upload in Studio or save from ATS.
            </li>
          )}
        </ul>
      </section>

      <section className="glass-panel mb-8 rounded-[var(--radius)] p-5">
        <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
          Mock interviews
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Practice adaptive mock interviews, coaching, and performance tracking
          on MPI — separate from resume building.
        </p>
        <a
          href={MPI_URL}
          className="mt-3 inline-flex text-sm font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open MPI Interview Studio →
        </a>
      </section>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resume-preview-title"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-[var(--radius)] border border-[var(--line)] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
              <div className="min-w-0">
                <p
                  id="resume-preview-title"
                  className="truncate font-semibold"
                >
                  {preview.name}
                </p>
                <p className="text-xs text-[var(--muted)]">Resume preview</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-sm"
                onClick={() => setPreview(null)}
              >
                Close
              </button>
            </header>
            <pre className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-[13px] leading-relaxed text-[var(--ink)]">
              {preview.content || "(empty)"}
            </pre>
            <footer className="flex justify-end gap-2 border-t border-[var(--line)] px-4 py-3">
              <button
                type="button"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-800 disabled:opacity-40"
                disabled={busy}
                onClick={() => {
                  const id = preview.id;
                  const name = preview.name;
                  setPreview(null);
                  void removeResume(id, name);
                }}
              >
                Delete this resume
              </button>
              <button
                type="button"
                className="btn-primary px-3 py-1.5 text-sm"
                onClick={() => setPreview(null)}
              >
                Done
              </button>
            </footer>
          </div>
        </div>
      )}

      <section
        id="settings"
        className="mt-6 scroll-mt-8 glass-panel rounded-[var(--radius)] p-5"
      >
        <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">Account</h2>
        <p className="mb-3 text-sm text-[var(--muted)]">
          Signed in as {data.user.email}.
        </p>
        <button
          type="button"
          className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold"
          onClick={() => void signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
        <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-4">
          <h3 className="text-sm font-semibold">Studio</h3>
          <p className="text-sm text-[var(--muted)]">
            Edit layouts, preview PDFs, and download — in RocketCV Studio.
          </p>
          <Link
            href="/app"
            className="inline-flex text-sm font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Open RocketCV Studio
          </Link>
        </div>
        <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-4">
          <h3 className="text-sm font-semibold">Export my data</h3>
          <p className="text-sm text-[var(--muted)]">
            Download a ZIP of resumes, ATS sessions, recovery job metadata, and
            memory snapshots. Password hashes and Drive refresh tokens are not
            included. See{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              Privacy
            </Link>
            .
          </p>
          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold"
            onClick={() => void exportAccount()}
          >
            Download export ZIP
          </button>
        </div>
        <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-4">
          <h3 className="text-sm font-semibold text-[var(--danger)]">Delete account</h3>
          <p className="text-sm text-[var(--muted)]">
            Permanently erase resumes, ATS sessions, recovery jobs, memory snapshots,
            and your account on this service. See{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              Privacy
            </Link>
            .
          </p>
          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-[var(--danger)] px-3 py-2 text-sm font-semibold text-[var(--danger)]"
            onClick={() => void deleteAccount()}
          >
            Delete my data
          </button>
        </div>
      </section>

      {data.allowlist && (
        <section
          id="allowlist"
          className="mt-6 scroll-mt-8 glass-panel rounded-[var(--radius)] p-5"
        >
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">Allowlist (admin)</h2>
          <p className="mb-3 text-sm text-[var(--muted)]">
            Shared with My Personal Interviewer and Commander. An email added
            here can sign in on resume.tomorrowtools.dev, MPI, and
            commander.tomorrowtools.dev.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              className="min-w-[220px] flex-1 rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || !email.includes("@")}
              className="btn-primary px-4 py-2 text-sm"
              onClick={() => void addEmail()}
            >
              Add email
            </button>
          </div>
          <ul className="space-y-1 text-sm">
            {data.allowlist.map((a) => (
              <li key={a.email} className="flex items-center justify-between gap-2">
                <span>{a.email}</span>
                {a.email !== "ayubshaik642@gmail.com" && (
                  <button
                    type="button"
                    className="text-xs text-[var(--danger)]"
                    onClick={() => void removeEmail(a.email)}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-10">
        <ProductFooter product="RocketCV" />
      </div>
    </div>
  );
}
