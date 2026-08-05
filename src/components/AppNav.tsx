"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { MPI_URL } from "@/lib/productUrls";

export function AppNav({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const onApp = pathname?.startsWith("/app");
  const onProfile = pathname?.startsWith("/profile");

  return (
    <div className={`app-nav ${mobileOpen ? "app-nav--open" : ""}`}>
      <div className="app-nav__brand">
        <div className="flex items-start justify-between gap-2">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mpi-logo.svg" alt="" className="mb-2 h-8 w-8" />
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
              TomorrowTools
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl tracking-tight leading-tight text-[var(--ink)]">
              Resume Builder
            </h1>
            <p className="mt-1 text-[11px] font-medium tracking-[0.08em] text-[var(--accent)] uppercase">
              ATS · analyze · improve
            </p>
          </div>
          {onMobileClose && (
            <button
              type="button"
              className="md:hidden text-sm text-[var(--muted)]"
              onClick={onMobileClose}
            >
              Close
            </button>
          )}
        </div>
      </div>

      <nav className="app-nav__links" aria-label="Primary">
        <Link
          href="/app"
          className={`app-nav__btn ${onApp ? "app-nav__btn--active" : ""}`}
          onClick={onMobileClose}
        >
          <span className="app-nav__btn-label">Resume Studio</span>
          <span className="app-nav__btn-hint">Prepare · analyze · builder</span>
        </Link>
        <Link
          href="/profile"
          className={`app-nav__btn app-nav__btn--ghost ${onProfile ? "app-nav__btn--active" : ""}`}
          onClick={onMobileClose}
        >
          <span className="app-nav__btn-label">Profile</span>
          <span className="app-nav__btn-hint">Saved resumes · settings</span>
        </Link>
        <a
          href={MPI_URL}
          className="app-nav__btn app-nav__btn--ghost"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="app-nav__btn-label">Interview practice</span>
          <span className="app-nav__btn-hint">Mock interviews on MPI →</span>
        </a>
        <Link
          href="/profile#settings"
          className="app-nav__btn app-nav__btn--ghost"
          onClick={onMobileClose}
        >
          <span className="app-nav__btn-label">Settings</span>
          <span className="app-nav__btn-hint">Account · allowlist</span>
        </Link>
      </nav>

      <div className="mt-3 grid gap-2 px-0">
        <button
          type="button"
          className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-left text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
          onClick={() => void signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
