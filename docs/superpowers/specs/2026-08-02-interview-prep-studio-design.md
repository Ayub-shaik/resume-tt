# Interview Prep Studio — Design Spec

**Date:** 2026-08-02  
**Status:** Ready for user review (self-reviewed)  
**Approach:** Shell unlock + adaptive live interview (Approach 1), refined by user and LLM Council

---

## 1. Problem

The current app ships APIs and components that smoke-test, but the UI feels dead:

- Studio (banner / center / right) only mounts after an interview is selected.
- Right coaching panel uses `hidden xl:block`, so it often never appears.
- Create can appear dead when using `http://127.0.0.1:3456` while Next binds `localhost` (dev cross-origin / HMR block).
- Original brief asked for an always-on 3-pane interview studio, not a wizard.

## 2. Product intent

A **generic mock-interview studio**:

- Any JD / role / seniority.
- Interviewer behavior is decided **on-the-fly from JD + resume + live transcript**.
- Azure DevOps (and similar) content is an example of how the **interviewer brain** should reason — **not** a preloaded script, scenario bank, or 100 fixed sessions.
- **A → B:** During the interview = live interviewer brain. After finalize = review pack built **only from that interview’s transcript**.

### Non-goals (this phase)

- Fake / demo data
- Preloaded scenario libraries or scripted question graphs
- PDF polish, Whisper, paid STT
- Always-on Study browser of topics (beyond post-interview review pack)

## 3. Layout (always on)

```
┌──────────┬────────────────────────────────────────────┬─────────────┐
│ Left     │ Banner: Resume | JD + URL  (spans center+right)          │
│ Create   ├────────────────────────────────────────────┤ Right       │
│ History  │ Interviewer role (from JD)                 │ Coaching    │
│ editable │ Start / Question → answer under question   │ eval detail │
│ names    │ EVALUATION (blue) → recommended next       │ / follow-up │
│          │ + other follow-ups; code pane when needed  │ answers     │
└──────────┴────────────────────────────────────────────┴─────────────┘
```

### Rules

1. On first load: always render all panes; auto-create or select a **draft** interview so banner works immediately.
2. Left “Create a new interview” always creates a fresh session and selects it.
3. Right column always visible; placeholder until score/follow-up clicked.
4. Banner covers center+right only (not left).
5. Fix Next `allowedDevOrigins` so `127.0.0.1` client JS works.

## 4. Interview behavior

### Role generation

On Start (resume + JD required):

- Backend generates `interviewerRole` from JD (+ resume seniority cues).
- Display on screen, e.g. “Interviewer role: As a senior DevOps engineer, you will interview the candidate for …”
- Role is not a fixed template list; it is derived per interview.

### Adaptive questioning

- No fixed script (“tell me about yourself → salary → …”).
- First and subsequent questions come from the model given: role + JD + resume + **full transcript so far**.
- After each answer:
  - Score /10 + rating
  - Coaching fields (what went wrong, improve, resume/JD framing, senior answer, traps)
  - **`recommendedNext`** — becomes the next asked question
  - **`otherFollowUps[]`** — listed under EVALUATION; click opens right panel with a good answer to *tell* (coaching). Default: auto-continue with recommended next (optional later: “Ask this next”).

### Voice

- Browser Web Speech TTS + STT (free).
- Auto-listen after question TTS.
- Typing suppresses voice.
- Voice transcripts stream into the answer box word-by-word; **Send is manual**.
- Script/coding questions: code pane beside answer.

### Finalize → B

- Final score + summary shown in center.
- Persist `review_packs` from this interview’s turns only (gaps, strong answers, follow-up bank).
- Surface B in-app: after finalize, center shows the review summary; selecting a completed interview reloads that pack into the right panel (no separate Study app in this phase).

## 5. Data model

| Table | Purpose |
|-------|---------|
| `resumes` | Reusable uploaded/pasted resumes |
| `interviews` | Session: name, resume/JD/url, status, `interviewer_role`, final score/summary, runtime |
| `turns` | Q/A, evaluation JSON, `recommended_next`, `other_followups` JSON, optional code |
| `review_packs` | Post-interview B artifact keyed by `interview_id` |

Statuses: `setup` → `ready` → `active` → `completed`.

## 6. APIs

| Method | Path | Behavior |
|--------|------|----------|
| GET/POST | `/api/interviews` | List / create |
| GET/PATCH | `/api/interviews/:id` | Load / update context |
| POST | `/api/interviews/:id/start` | Role + first question |
| POST | `/api/interviews/:id/answer` | Evaluate + next recommended + others |
| POST | `/api/interviews/:id/finalize` | Final score + review pack |
| GET/POST | `/api/resumes` | List / save |
| GET | `/api/runtime` | Preferred runtime status |

**Runtime:** Cursor SDK primary (`CURSOR_API_KEY`); OpenClaw local fallback. Every call includes role + JD + resume + transcript. No scenario fetch.

## 7. Error handling

- Cursor failure → OpenClaw; show runtime badge.
- Invalid model JSON → one “JSON only” retry; then header error; keep draft answer.
- Start blocked if resume or JD empty.
- Create/Save failures visible in header (never silent).

## 8. Acceptance tests

1. Open app → left + banner + center + right with **zero clicks**.
2. Create works on `http://127.0.0.1:3456`.
3. Save resume/JD → Start → interviewer role visible → first question spoken.
4. Answer → blue EVALUATION → click opens right coaching → recommended next asked; other follow-ups listed.
5. End → final score + review pack from **this** transcript only.
6. New interview does not reuse prior Q&A as a script.

## 9. Implementation priority

1. Ungate `AppShell`; always show `RightPanel`; auto-draft on load.
2. `allowedDevOrigins` for `127.0.0.1`.
3. Persist/display `interviewerRole`; adaptive answer payload (`recommendedNext` / `otherFollowUps`).
4. Review pack on finalize.
5. Manual Chrome pass for voice suppress + Create/Start loop.

## 10. Decisions log

| Decision | Choice |
|----------|--------|
| Recovery approach | Shell unlock + live adaptive interview |
| ADO / curriculum dump | Interviewer brain style only — not a question bank |
| A vs B | A during interview; B = review pack after each interview |
| Preloaded sessions | None |
| Question source | Live transcript + JD + resume only |
| Voice | Browser Web Speech; Whisper later if needed |
| Council | Ungate shell first; avoid Study library until mock loop alive |
