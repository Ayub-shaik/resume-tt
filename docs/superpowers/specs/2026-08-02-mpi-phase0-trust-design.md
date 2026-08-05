# MPI Phase 0 — Studio Trust Slice Design

**Date:** 2026-08-02  
**Status:** Approved in chat; written for implementation planning  
**Product:** My Personal Interviewer (MPI)  
**Approach:** Trust slice (Approach 1) — single coherent pass

---

## 1. Problem

Local mock-interview studio works, but trust is broken:

1. **Stale Start:** After turns exist, Start returns old turns even when resume/JD was saved anew (`listTurns.length > 0` short-circuit).
2. Mid-flow context change has no **branch lineage** in the left sidebar.
3. History titles feel random; resume display name gets overwritten by session name.
4. Voice TTS has no pause/play/stop.
5. No explicit **model picker** (Cursor vs OpenClaw); failures are opaque.
6. Panes not resizable; mobile layout awkward.
7. Coaching “improvements” are one-way — no way to Ask follow-ups on a suggestion.
8. Optional **lived experience** not on resume cannot inform improvisation.
9. Interviews often **open too hard** (deep enterprise CI/CD) instead of warming up like a real interviewer.

Auth, deploy, Drive, profile graphs, and full evaluation dashboard are **out of scope** for Phase 0 (later phases / separate specs).

---

## 2. Goals / non-goals

### Goals

- Start always respects latest saved context; context change mid-flow forks a child interview.
- Human-readable history titles; stable resume names with upload datetime.
- Voice transport controls; runtime model choice + visible errors.
- Resizable desktop panes; usable mobile stacking.
- Ask-under-improvement (not a chat window).
- Optional “Additional experience” context field for the interviewer brain.
- Opening arc: build context before deep technical drills.

### Non-goals

- Google Sign-In, allowlist, `mpi.tomorrowtools.dev`
- Performance dashboard, heatmaps, hiring probability, knowledge graph UI
- Interviewer persona picker UI (may later reuse role generation)
- Google Drive / resume score automation
- Full multi-dimension score matrix UI (prompt can start biasing ownership; schema UI later)

---

## 3. Locked decisions

| Topic | Decision |
|-------|----------|
| Approach | Trust slice — one Phase 0 implementation plan |
| Branch | Fresh child under parent; **no turn copy**; parent keeps old transcript |
| Lineage | `parent_interview_id` first-class column |
| Ask UX | Expand under item; multi-turn Q&A |
| Ask scope | “What to improve” block + each Enterprise improvements bullet only |
| Experience box | Optional banner field below resume/JD |
| Opening difficulty | Soft warm-up first; deepen from answers |
| Model picker | `auto \| cursor \| openclaw` with surfaced errors |

---

## 4. Architecture

### 4.1 Data model (SQLite)

**`interviews` additions:**

- `parent_interview_id TEXT NULL` — FK-ish to parent interview id
- `context_fingerprint TEXT` — hash of resume identity + jd text/url + experience notes
- `experience_notes TEXT NOT NULL DEFAULT ''` — optional lived experience not on resume
- `runtime_preference TEXT NOT NULL DEFAULT 'auto'` — `auto|cursor|openclaw`
- `title` generation rules (see §5)

**`resumes`:**

- Persist `original_filename` (or equivalent)
- `display_name` = `{original_filename} · {YYYY-MM-DD HH:mm}` at upload; never overwrite with interview title

**`coach_asks` (new) or JSON on turn:**

- Prefer table: `id`, `turn_id`, `interview_id`, `field` (`howToImprove` \| `enterpriseImprovements`), `item_index` (nullable for block-level), `messages_json`, `created_at`
- Messages: `[{role:'user'|'assistant', content}]`

### 4.2 Context fingerprint

```
fingerprint = sha256(
  resumeId or resumeText + "\n" +
  jdText + "\n" +
  jdUrl + "\n" +
  experienceNotes
)
```

Stored on interview when context is saved. Compared on Start.

### 4.3 Start algorithm

```
on POST /api/interviews/:id/start:
  require resumeText + jdText
  existing = listTurns(id)
  fp = computeFingerprint(interview)

  if existing.length > 0 AND fp == interview.context_fingerprint:
    return existing turns (resume in progress)  // intentional

  if existing.length > 0 AND fp != interview.context_fingerprint:
    child = createInterview({
      parent_interview_id: id,
      copy banner fields from parent (resume, jd, experience_notes, runtime_pref),
      context_fingerprint: fp,
      title: deriveTitle(...),
      status: active/draft
    })
    generate opener on child (warm-up rules)
    return { interview: child, turns: [opener], branchedFrom: id }

  // no turns: generate opener on this id, set fingerprint, set title
```

UI after branch: select child; left sidebar shows parent with indented child.

### 4.4 Runtime

- `runInterviewModel` accepts `runtimePreference` from interview or request override.
- On failure: return `{ error, runtimeTried }` — UI toast + inline banner. No silent hide.
- OpenClaw still localhost-only in Phase 0 (deploy redesign later).

### 4.5 Coach Ask API

`POST /api/interviews/[id]/coach-ask`

Body: `{ turnId, field, itemIndex?, question, priorMessages? }`

System context: JD, resume, experience_notes, the evaluation field/item text, prior Ask thread.

Response: `{ answer, messages }` — append to thread; persist.

Rate-limit like answer route. Neutralize prompt injection.

---

## 5. Product behavior

### 5.1 Banner: Additional experience (optional)

Below resume + JD: textarea **“Additional experience (optional)”**.

Helper: not on resume — projects, ownership, current stack, constraints.

Saved with context; included in interviewer system prompt and evaluate/Ask prompts as `EXPERIENCE_NOTES`.

### 5.2 Warm-up opening (prompt rules)

Interviewer brain **must not** open with deep “most complex enterprise…” style questions.

Required progression (adaptive, not a fixed script):

1. Tell me about yourself / background  
2. Current role & responsibilities  
3. Current project / team / stack  
4. Then deepen into JD/resume tech (Terraform, CI/CD, Azure, etc.) grounded in what the candidate just said  

`recommendedNext` and opener generation prompts enforce: early turns = context-building; depth increases after evidence in transcript. Still **adaptive** — not a 100-item bank.

### 5.2b Same-session realism seeds (prompt-only in Phase 0)

In the same interview only (no cross-session memory engine yet):

- Follow-ups must **reference** something the candidate said earlier when useful.
- Strong answers → deepen same topic; shallow/tool-list answers → challenge for design/ownership/trade-offs.
- Evaluation bias: ownership, decisions, trade-offs, production problems — not buzzword count.
- On finalize: **text debrief** with 3–5 dimension scores (e.g. Technical Depth, Ownership, Communication, Architecture, Enterprise Readiness) plus one clear next practice target — rendered as text in review pack, **not** a dashboard chart.

### 5.2c `eval.v1` contract (instrumentation)

Persist structured eval JSON on each scored turn / finalize (version field `v1`) including dimension scores and evidence snippets so Phase 1+ dashboards do not reinvent the schema. No heatmap UI in Phase 0.

### 5.3 Titles

On save context / start: derive `Company · Focus` where Focus ∈ {Azure, DevOps, AWS, Kubernetes, Terraform, …} from JD keywords; else company or role snippet; else short JD hash label.

### 5.4 Voice

Center: **Pause / Play / Stop** for TTS.

- Pause: cancel current utterance; pause auto-listen  
- Play: resume or re-speak current question text  
- Stop: cancel TTS + stop mic  

Typing still suppresses mic.

### 5.5 Layout

- Desktop: drag resize left and right widths; persist `localStorage`.
- Mobile: history drawer; center full width; coaching bottom sheet / route — no overlapping fixed columns.

### 5.6 Ask on improvements

- Under **What to improve**: Ask → compact input → thread under block.  
- Under **each** Enterprise improvements item: same.  
- Not chat-bubble chrome. No Ask on other blocks in Phase 0.

### 5.7 Sidebar branching

Tree:

```
Acme · Azure DevOps          (parent)
  └ Acme · Azure DevOps (2)  (child after context change)
```

Child selected after branch; parent remains openable.

---

## 6. Components (touch list)

| Unit | Responsibility |
|------|----------------|
| `start/route.ts` | Fingerprint + branch + warm opener |
| `db.ts` | Columns, coach_asks, list tree |
| `prompts.ts` | Experience notes + warm-up + ownership bias in eval |
| `ContextBanner.tsx` | Experience textarea; model picker |
| `Sidebar.tsx` | Nested history by parent |
| `InterviewCenter.tsx` | Voice controls; surface runtime errors |
| `RightPanel.tsx` | AskUnderImprovement UI |
| `AppShell.tsx` | Resize handles; mobile stack; branch select |
| `runtime/index.ts` | Honor preference; structured errors |
| New `coach-ask/route.ts` | Scoped coaching chat |

---

## 7. Error handling

- Start without resume/JD: 400 (existing).  
- Branch create failure: 500 with public message; parent unchanged.  
- Runtime failure: 502/503 with `runtime` + message; UI shows retry + switch model.  
- Coach-ask: 400 bad field; 404 turn; 429 rate limit; inline error under Ask.  
- Speech API missing: hide Play controls gracefully; text still works.

---

## 8. Testing

1. Start → answer → upload new resume → Save → Start → **child** created; new warm opener; parent turns intact.  
2. Start twice with unchanged context → same turns (no spurious branch).  
3. Resume display name keeps filename + datetime after session rename/title update.  
4. Title contains company or focus keyword from sample JD.  
5. Coach-ask on enterprise item returns answer referencing that item.  
6. Model forced to broken runtime → error visible.  
7. Mobile viewport: panes don’t overlap.

---

## 9. Explicit deferrals (feedback backlog)

User feedback items (long-term memory callbacks, contradiction detection, drill-down difficulty, architecture mode, multi-dimension scores, heatmaps, hiring verdict, dashboard matrices, timelines, knowledge graph, study plans, replay, growth vs consistency, interviewer personas) are **not** Phase 0 UI/schema unless listed above.

Phase 0 **does** seed prompt behavior for: warm-up arc, transcript-grounded follow-ups (already adaptive), and eval bias toward ownership/trade-offs (lightweight prompt text only).

Sequencing of the full feedback list is handled by a separate council session / later specs.

---

## 10. Success criteria

- User can change resume mid-flow and get a **new** interview under the old one without losing history.  
- Improvisation uses optional experience notes.  
- First questions feel like a real warm-up.  
- Ask works on improvement suggestions.  
- Voice and model controls are usable; layout resizable/mobile-safe.
