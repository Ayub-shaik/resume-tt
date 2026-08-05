# LLM Council Transcript — 2026-08-04 22:30 IST

## Original question
Audio continues when switching interview → ATS during analysis; session should save and continue on return. Also implement the saved 10+ todo backlog (reopened ATS dual-page/improve/persist + new audio bug). Use llm-council + using-superpowers.

## Framed question
MPI Next.js app: `/studio` (interview+voice) and `/ats` (resume builder) are separate routes. New bug: after answer submit, user navigates to `/ats` during analyzing; when API returns, `InterviewCenter.send()` still calls `voice.speak()` → audio on wrong page. Unmount cleanup cancels TTS but race after await. Also reopen false-complete ATS items A–E (true dual-page Analyze, Improve hide templates, draft persist, mobile templates, prod verify). Decide order, stop-only vs background+silent restore, architecture.

## Advisor responses

### The Contrarian (anonymized as B in peer review)
P0 is the audio leak. `send()` awaits then speaks after unmount — need generation token. Do NOT background+silent restore this session. Cancel audio on leave; analysis finishes server-side; return reloads turns silently (Play to hear). Do NOT touch A–E until audio ships with acceptance criteria. Order: audio → smoke → A with tests → C draft → E.

### The First Principles Thinker (E)
Three problems: never act off owning page; long work persists; return = resume not replay. Fix async lifecycle ownership. Route-scoped generation token; background analysis yes, TTS on /ats no. Substrate session stores then re-verify A–E.

### The Expansionist (A)
TTS leak proves two products. P0 stop-on-leave today; tomorrow AppSession/SessionOrchestrator. Background+silent restore is the expansion bet. Don't touch A–E until continuity layer exists.

### The Outsider (C)
App must not talk when not on Interview. Hard mute on route leave. Restore = UI+session state, not replay. Deploy verify then one repro per bug. Checklist: leave → silent; return → same screen, no auto-talk.

### The Executor (D)
(1) mountedRef guard in InterviewCenter ~20min (2) E smoke (3) C draftStore (4) D if needed (5) A/B verify. Stop-only. Files: InterviewCenter, draftStore, AtsStudio TemplatePicker on improve.

## Anonymization mapping
- A = Expansionist
- B = Contrarian
- C = Outsider
- D = Executor
- E = First Principles

## Peer reviews (summary)
- Strongest variously B / E / D — consensus on P0 race + stop TTS on leave
- Blind spot: A (architecture before leak) or under-specified ATS persist
- All missed: dual TTS owners (AppShell finalize + voice hook); no layout-level kill; acceptance test for navigate-mid-send; Strict Mode / visibility

## Chairman synthesis
See council-report HTML / verdict below.

## Where the Council Agrees
- P0 = TTS race after navigate during `onAnswer` await
- Leaving interview must hard-cancel speechSynthesis + mic
- Analysis may finish server-side; returning loads turns from DB
- No auto-speak on return (Play optional)
- Do not build SessionOrchestrator before the leak is fixed

## Where the Council Clashes
- Scope this session: audio-only (B/C) vs audio + draftStore (D) vs substrate then A–E (E) vs full continuity (A)
- Background analysis: yes-but-silent (E) vs avoid third state machine (B)

## Blind Spots Caught
- Dual TTS paths in AppShell + useInterviewVoice
- Need route-leave cancel outside component unmount alone
- False-complete culture without acceptance tests

## The Recommendation
Ship **stop-only P0** first (mountedRef + global cancel on leave studio + no speak from AppShell finalize when unmounted). Then continue reopen backlog in order: **A dual-page → B hide templates on Improve → C draftStore → D mobile parity → E prod smoke**. Analysis continues server-side; return reloads silently.

## The One Thing to Do First
Add `mountedRef` (or generation token) in `InterviewCenter` so post-await `voice.speak` never runs after leave, plus `speechSynthesis.cancel()` when pathname leaves `/studio`.
