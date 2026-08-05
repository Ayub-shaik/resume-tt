# Compatible skill canon & combinations

Authority order (never reverse):

1. Global `.mdc` rules  
2. `requirements-manager` → `.cursor/REQUIREMENTS.md`  
3. `adaptive-workflow` (skipped on Tiny)  
4. Domain skills (implementation / debug / eng review)  
5. `acceptance-review` — **sole Pass/Fail authority**

Anything that claims a competing “done”, “always plan first”, or “spawn many agents” gate is demoted or removed.

---

## 1. Conflicts found → resolution

| Conflict | Why it fights us | Decision |
|----------|------------------|----------|
| `brainstorming` HARD-GATE (always design before any code) | Opposes Tiny path, skip-planning, cheap-first | **Exclude** from toolkit |
| `llm-council` default use | Opposes max-5 / cheap-first | **Exclude** unless user asks for architectural deadlock |
| `autoplan` as default planner | Heavy multi-review; duplicates `writing-plans` + `plan-eng-review` | **Massive only**; normal path = writing-plans |
| `verification-loop` as completion gate | Competes with `acceptance-review` | **Exclude** as Pass authority |
| gstack `qa` (auto-fix loop) during acceptance | Acceptance must not silently become another impl loop | Use **`qa-only`** for evidence; `qa` only in **impl / rework** before acceptance |
| gstack `design-review` as Pass | Same — it fixes code and can redefine “done” | Use in **impl polish** only; Pass stays acceptance |
| PM Butler Gatekeeper / full household | Second acceptance authority + persona token tax | **Exclude** Gatekeeper & full household |
| PM Butler Sculptor | Competes with `requirements-manager` | **Exclude**; RM is requirements authority |
| OpenCastle `validation-gates` always-on | 10 gates every delegation vs Tiny/minimal | **Exclude** always-on |
| OpenCastle `session-checkpoints` | Second persistence model vs `SESSION_HANDOFF` | **Exclude**; handoff + REQUIREMENTS only |
| fullstack-forge `forge-*` overlapping ECC patterns | Duplicate frontend/backend/security/testing guidance | **Exclude** forge suite; keep ECC/gstack picks |
| `systematic-debugging` vs `investigate` | Same job, two names | **Canon = investigate** |
| `test-driven-development` vs `tdd-workflow` | Same job | **Canon = tdd-workflow** (docs name maps here) |
| `security-review` vs `cso` vs forge-security | Triple security | **Routine = security-review**; **deep = cso** (Large/sensitive only) |
| `browse` vs `browser-qa` | Overlap if roles unclear | **browse** = automation/light check; **browser-qa** = QC protocol for acceptance evidence |
| `careful` + `freeze` + `guard` | Partial overlap | **careful** default safety; **guard** when max safety; freeze alone when scoping edits |
| `intent-driven-development` vs RM | Overlap on acceptance criteria | **Keep as helper inside RM** (not a parallel requirements owner) |
| `fable-workflow` / `office-hours` vs AW skip-planning | Explore-first tax | **One explore skill: fable-workflow**, Medium+ only when AW selects; drop office-hours from default |
| `spec` (gstack) vs RM | Parallel task definition | **Exclude**; RM + REQUIREMENTS.md own the contract |
| `document-release` vs PM Librarian | Docs after ship | **Keep document-release** after Pass; drop Librarian |
| `context-budget` / `strategic-compact` / `compact` / `token-budget-advisor` | Related cost tools | Keep with **roles** (below) — complementary |

---

## 2. Compatible canon (final employ set)

### A. Pipeline (create / own)
- `requirements-manager`
- `adaptive-workflow`
- `acceptance-review`

### B. Always available (invoke only when needed)
| Skill | Role |
|-------|------|
| frontend-patterns | FE implementation |
| backend-patterns | BE implementation |
| api-design | API shape |
| error-handling | Errors/retries/UX of failure |
| tdd-workflow | Tests when creating/changing tests |
| investigate | Debug root cause |
| security-review | Sensitive/auth/input/secrets work |
| careful | Destructive-command warnings |
| search-first | Before inventing utilities/libs |
| browse | Light browser / external page (not repo knowledge) |
| browser-qa | UI QC protocol → evidence for acceptance |
| compact | Refresh SESSION_HANDOFF near context limit |

### C. Conditional (adaptive-workflow or explicit need)
| Skill | When |
|-------|------|
| writing-plans → executing-plans | Medium+ planning |
| plan-eng-review | After a plan, before large impl |
| fable-workflow | Medium+ unknowns / multiple approaches |
| design-system | UI redesign / token consistency |
| frontend-a11y | Interactive UI / forms |
| e2e-testing | Critical user flows need Playwright |
| database-migrations | Schema/data migrations |
| postgres-patterns | Non-trivial SQL/schema work |
| deployment-patterns | Deploy/CI readiness |
| guard | Prod / high-risk edit sessions |
| freeze | Must not touch outside one directory |
| review | Pre-land eng review (not Pass) |
| caveman-review | Terse PR comment style after/with review |
| qa-only | Structured UI bug report → feeds acceptance |
| qa | Impl/rework only — find+fix before acceptance |
| design-review | UI polish during impl (not Pass) |
| cso | Large/deep security audit |
| ship | After **Passed** — PR/version/changelog |
| canary | After deploy |
| document-release | After ship — docs sync |
| context-save / restore | Long multi-session work |
| context-budget | Periodic toolkit bloat audit |
| strategic-compact | Phase-boundary compact (not instead of acceptance) |
| token-budget-advisor | User wants depth/budget control |
| skill-comply | Offline: measure rule/skill compliance |
| intent-driven-development | Helper technique under RM for vague asks |
| autoplan | **Massive only** |

### D. Explicitly not employed
brainstorming · llm-council (default) · verification-loop · PM Butler household/Gatekeeper/Sculptor · OpenCastle init/validation-gates/session-checkpoints · fullstack-forge suite · gstack spec · office-hours (default) · forge-all

---

## 3. Combinations (recipes)

Each recipe lists **order**. Later skills must not override earlier authorities.

### R1 — Tiny (FE or BE)
`inline REQUIREMENTS` → `frontend-patterns` **or** `backend-patterns` → [`careful`] → `acceptance-review`  
[+ `browser-qa` only if Tiny UI behaviour must be proven]

### R2 — Small feature (one domain)
`requirements-manager` → `adaptive-workflow` → domain patterns (+ `tdd-workflow` if tests) → `acceptance-review`  
[+ `browser-qa` if UI]

### R3 — Medium UI feature
`requirements-manager` (+ `intent-driven-development` if vague) → `adaptive-workflow` → [`fable-workflow` if approaches unclear] → `writing-plans` → [`plan-eng-review`] → `design-system?` + `frontend-patterns` + `frontend-a11y?` + `tdd-workflow?` → [`design-review` polish] → `browser-qa` → `acceptance-review`

### R4 — Medium API / backend
`requirements-manager` → `adaptive-workflow` → `writing-plans` → `api-design` + `backend-patterns` + `error-handling` + [`database-migrations` / `postgres-patterns`] + `tdd-workflow` → [`security-review` if sensitive] → `acceptance-review`

### R5 — Debug / regression
`requirements-manager` (bug as checklist rows) → `adaptive-workflow` → `investigate` → targeted patterns → `acceptance-review`  
[+ `browser-qa` / `qa-only` if UI symptom]

### R6 — Acceptance Failed → rework (≤2)
`acceptance-review` (Failed + remaining IDs) → `investigate` **or** targeted domain skill → re-implement → `acceptance-review`  
Stop after 2 fails; ask user. Do **not** start `adaptive-workflow` over from scratch unless user approves a new loop.

### R7 — Broad “premium / whole app” UI
`requirements-manager` (**expand** hidden UX to must-pass; notify discarded) → `adaptive-workflow` → `writing-plans` → `design-system` + `frontend-patterns` + `frontend-a11y` → `browser-qa` → `acceptance-review`  
(Expect more checklist rows; do not silently shrink scope.)

### R8 — Security-sensitive change
`requirements-manager` → `adaptive-workflow` → `security-review` + domain patterns + `tdd-workflow` → [`cso` if Large] → `acceptance-review` → [`ship`]

### R9 — Token / context pressure (any stage)
`context-budget` (optional audit) **or** `strategic-compact` (phase) → `/compact` → continue recipe  
Never use compact as a substitute for acceptance.

### R10 — After Passed (ship path)
`acceptance-review` = Passed | Passed with Follow-up → [`review`] → `ship` → [`canary`] → [`document-release`]

### R11 — Eng review only (not acceptance)
`review` → optional `caveman-review` for comment tone  
Findings may open **new** REQUIREMENTS rows only with user/follow-up; they do **not** override Pass.

### R12 — Meta (offline / maintenance)
`skill-comply` against `~/.cursor/rules` + pipeline skills  
`context-budget` to prune unused skills/MCP

---

## 4. How the 3 pipeline skills use the canon

### requirements-manager
- May use: `intent-driven-development` (vague), never invents impl skills  
- Writes: `.cursor/REQUIREMENTS.md`  
- Must not: plan, code, accept, spawn agents  

### adaptive-workflow
- Chooses **one recipe** (R1–R8) from classification Tiny→Massive  
- Selects subset of canon; lists skills **skipped**  
- Enforces: cheap-first, ≤5 agents + why-report, no full-prompt fanout  
- Must not: implement or declare Pass  

### acceptance-review
- Inputs: REQUIREMENTS.md + repo (+ optional `browser-qa` / `qa-only` evidence)  
- May read eng `review` output as informational only  
- Must not: modify code, rewrite requirements, treat summaries as proof  
- On Fail: emit remaining IDs for R6 (≤2), then escalate to user  

---

## 5. One-line compatibility rule

> If two skills both try to own requirements, planning defaults, or Pass/Fail, keep the pipeline skill and demote the other to a named helper inside a recipe — never run them as peer authorities.
