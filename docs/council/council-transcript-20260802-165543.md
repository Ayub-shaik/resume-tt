# LLM Council Transcript — MPI roadmap sequencing

## Updated
2026-08-02T16:55:43Z

## Original question
Through the interview, uploaded new resume + save context + start still shows old data. Also: resizable panes; smart history names; voice pause/play; resume name keep original + datetime; branch mid-flow like subfolder; model picker (Cursor/OpenClaw) + errors; Google Sign-In allowlist (admin ayubshaik642@gmail.com); per-user data; deploy mpi.tomorrowtools.dev; MPI branding/logo; profile + performance graph; Google Drive + resume improve/score; GitHub repo mypersonalinterviewer; mobile-friendly; landing-as-login page.

## Framed question
How should we sequence building MPI (My Personal Interviewer) from a working local mock-interview app into a private hosted product, given this wishlist and known bugs?

Wishlist: fix stale Start/context bug; branch interviews on mid-flow context change; smart history names; resume filename+datetime; voice pause/play; model picker + errors; resizable panes; mobile; Google Sign-In with email allowlist (admin ayubshaik642@gmail.com); per-user data; landing page; MPI branding; deploy mpi.tomorrowtools.dev; profile (resumes, interviews, performance graph); Google Drive + resume improve/score; GitHub repo push.

Current: local Next.js studio, SQLite, no auth, Cursor/OpenClaw AI, known Start bug returns old turns when turns.length > 0. OpenClaw is localhost-only. Rate limits are in-memory.

What's at stake: shipping auth/deploy/Drive on a broken Start multiplies multi-tenant ghosts; delaying trust fixes makes the product feel broken no matter the logo.

## Anonymization mapping (peer review)
- Response A = The Executor
- Response B = The Contrarian
- Response C = The Expansionist
- Response D = The First Principles Thinker
- Response E = The Outsider

---

## Advisor responses

### The Contrarian
You're trying to ship a private SaaS, a resume platform, Drive sync, multi-tenant auth, custom domain deploy, and performance analytics on top of an app that still returns the wrong interview when you click Start. That is the fatal flaw.

Until Start respects new resume/context—and mid-flow edits branch instead of silently replaying old turns—every other feature is theater. Auth on a buggy core multiplies support pain. Drive and resume scoring are a second product. Allowlist + admin is fine for private circle but becomes ops surface. mpi.tomorrowtools.dev before auth is a public footgun.

Do this order only: (1) Fix Start + branch-on-alter + naming + resume filename + voice controls + model errors + resizable/mobile. (2) Branding/landing. (3) Google allowlist auth + per-user isolation. (4) Deploy behind auth. (5) Profile/graph. (6) Drive/resume score last or never in v1. Push GitHub early for backup—not a product milestone.

If you build auth+Drive+deploy before the context bug is dead, you will debug multi-tenant ghosts of the same stale-Start bug. Kill the ghost first.

### The First Principles Thinker
Strip the wishlist to jobs-to-be-done.

Job 1 — Practice with correct context (broken today). Needs: Start uses latest saved resume/JD; mid-alter branches; titles human-readable; resume names stable; voice controllable; model choice + errors visible; layout usable on laptop/phone.

Job 2 — Private multi-user access. Needs: Google Sign-In, allowlist, admin email, row-level user ownership. Without this, deploy is reckless.

Job 3 — Hosted product presence. Needs: MPI brand, landing-as-login, mpi.tomorrowtools.dev, GitHub repo.

Job 4 — Long-term improvement loop. Needs: profile lists, performance graph, Drive, resume score/improve. These are a second product surface.

Recommended sequence: Job1 → Job2 → Job3 (brand+deploy together) → Job4. Do not interleave Drive/resume scoring into Job1. Branch-on-alter is part of Job1's correctness model, not a sidebar nicety.

One decision: treat "interview lineage/branching" as a first-class data model now (parent_interview_id), or you'll fake folders in the UI and regret it at auth migration.

### The Expansionist
The real product isn't "mock interview tool"—it's a private interview OS for a trusted circle: prepare → practice → improve resume → track performance over time. Drive + resume scoring + performance graph turn one-off sessions into a career loop. Landing + MPI branding make it feel like TomorrowTools product, not local experiment. Allowlist Google auth is perfect scarcity: invite-only creates seriousness without public chaos.

Sequence for upside: Fix Start/branch/naming/voice/model/resizable (trust). Brand + landing. Auth allowlist + isolation. Deploy mpi.tomorrowtools.dev. Profile + performance graph (the sticky loop). Drive + resume improve/score as expansion that makes MPI a platform. GitHub as distribution for future collaborators.

Don't stop at local bugfix forever—the performance graph and resume loop are the moat. Ship core reliability first, then race to the career-loop features once auth+hosting exist. Undervalued: company+role naming + graph together become "your interview story"—that's the screenshot people share.

### The Outsider
I don't know your stack. Reading the ask as a normal person: you have a practice tool that sometimes ignores the resume you just uploaded. That's broken trust. Before Google login, Drive, graphs, or a fancy domain, fix "I uploaded a new resume and it still interviewed the old me."

"Branch like a subfolder" means: when I change something mid-interview, keep the old attempt and start a new one underneath it so I can see both. History names like random codes are useless—show company and the main skill from the job post. Voice talking with no pause is stressful—give play/pause. Let me pick which AI brain if one fails. Make side panels drag-resizable. Phone shouldn't overlap.

Login page as landing with quotes is fine after the tool works. Only invited emails can join; you are admin. Profile with graph and Drive resume magic sounds like a later chapter. Put it online at mpi.tomorrowtools.dev only after login works so strangers can't wander in.

If you do the shiny hosted stuff first while Start is wrong, people will correctly say the product is broken—no logo fixes that.

### The Executor
Ship in brutal slices. Slice 0 this week: Fix Start/context bug—if resume/JD changed after turns exist, create child interview branch, regenerate opener from new context. Smart titles (company + Azure/DevOps/AWS focus). Resume displayName = originalFilename + upload datetime. Voice pause/play/stop on TTS. Model picker Cursor|OpenClaw|auto + surface runtime errors. Resizable panes + basic mobile stack. Do NOT touch auth/Drive/deploy/profile graphs yet.

Then: Branding + landing. Then Google Sign-In + allowlist + admin. Then user_id on every row + migrate SQLite. Then deploy mpi.tomorrowtools.dev. Then profile + performance graph. Then Drive + resume score. GitHub repo anytime after Slice 0.

Monday: reproduce Start bug, write failing test, implement branch-on-context-change, ship titles/voice/model picker/resizable in same PR. Auth later.

---

## Peer reviews

### Reviewer 1
1. Strongest: D — JTBD + parent_interview_id.
2. Blind spot: C — races to moat, skips DB/ops.
3. All missed: OpenClaw localhost-only on deploy; SQLite→hosted DB; in-memory rate limits; observability.

### Reviewer 2
1. Strongest: D.
2. Blind spot: C — ops path thin.
3. All missed: production runtime for OpenClaw; regression suite; DB/hosting choice.

### Reviewer 3
1. Strongest: D.
2. Blind spot: E — plain language, no build specifics.
3. All missed: prod DB, infra, TTS state, allowlist admin UX, observability.

### Reviewer 4
1. Strongest: D.
2. Blind spot: C — underweights deploy-before-auth.
3. All missed: DB migration, data backfill, deploy ops, PII retention, rate limits, E2E for branch-on-alter.

### Reviewer 5
1. Strongest: D.
2. Blind spot: C — Drive/graph as early moat.
3. All missed: SQLite cutover, AI quotas, allowlist admin UX, observability, fork semantics, E2E post-auth.

---

## Chairman synthesis

### Where the Council Agrees
- Start/context bug first; auth/deploy/Drive before fix = multi-tenant ghosts.
- Branch-on-alter is core correctness.
- Auth before public URL.
- Drive + resume score = v2; graph after host.
- Slice 0 UX bundle: titles, resume naming, voice controls, model picker, resizable/mobile.
- GitHub early for backup.
- Sequence: trust → private access → branded host → improvement loop.

### Where the Council Clashes
- Moat timing (graph/Drive race vs defer).
- Brand then auth vs brand+deploy together after auth.
- Schema now (`parent_interview_id`) vs vague "branch" UI.
- How fast to hosted career loop after gates pass.

### Blind Spots the Council Caught
OpenClaw localhost-only; SQLite→hosted DB; in-memory rate limits; observability; PII retention; allowlist admin UX; branch fork semantics (copy vs reference). Slice 0.5 infra between auth and deploy.

### The Recommendation
Six phases: Phase 0 kill ghost + lineage schema; Phase 1 branding/landing shell; Phase 2 Google allowlist auth + user_id; Phase 2.5 deploy prereqs (AI/DB/rate limits/obs/PII); Phase 3 go live behind auth; Phase 4 profile+graph; Phase 5 Drive+resume score. No Drive in core fix. No naked deploy.

### The One Thing to Do First
Reproduce Start bug, failing test, implement branch-on-context-change with `parent_interview_id` fork — opener from new resume/JD, old attempt preserved.
