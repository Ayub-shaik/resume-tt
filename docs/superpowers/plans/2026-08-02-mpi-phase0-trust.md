# MPI Phase 0 Trust Slice Implementation Plan

> **For agentic workers:** Implement task-by-task in this process (no subagents — user subscription limit).

**Goal:** Fix stale Start/branch, Ask-on-improve, experience notes, warm-up, voice/model/layout.

**Architecture:** Fingerprint context on save; Start forks child when fingerprint drifts; prompts carry warm-up + experience; UI gets Ask, voice, resize, model picker.

**Tech Stack:** Next.js App Router, SQLite better-sqlite3, existing Cursor/OpenClaw runtime.

## Global Constraints

- No auth/deploy/Drive/dashboard UI
- Branch = fresh child, no turn copy
- Ask only on howToImprove + enterpriseImprovements items
- Auto-pick recommendations; no clarifying quizzes

## Tasks

1. DB: parent_interview_id, fingerprint, experience_notes, runtime_preference, coach_asks, resume display naming helpers, title derive, fingerprint hash
2. Prompts + runtime preference + eval.v1 dims
3. Start route branch algorithm; context PATCH save; coach-ask API; resume upload naming
4. UI: banner experience+model, sidebar tree, voice controls, RightPanel Ask, AppShell resize+mobile, error surfacing
5. Smoke-check / fix lints
