# Global skill set (machine-wide)

Location: `~/.cursor/skills/`  
Rules: `~/.cursor/rules/`  
Recipes: `~/.cursor/SKILL_COMPATIBILITY_AND_COMBOS.md`

Applies to every local project. Prefer these over inventing parallel workflows.

---

## Preloaded (always discoverable under ~/.cursor/skills)

### Pipeline (owned — created here)
| Skill | Role |
|-------|------|
| requirements-manager | Atomic checklist → `.cursor/REQUIREMENTS.md` |
| adaptive-workflow | Pick recipe R1–R12; skip on Tiny |
| acceptance-review | Sole Pass / Pass+follow-up / Fail |

### Vibe-coding essentials (symlinked — auto-usable)
| Skill | Role |
|-------|------|
| frontend-patterns | FE implementation |
| backend-patterns | BE implementation |
| api-design | API shape |
| error-handling | Errors / retries |
| tdd-workflow | Tests when needed |
| investigate | Root-cause debug |
| browser-qa | UI QC evidence for acceptance |
| browse | Light browser / external pages |
| qa-only | UI bug report (no silent Pass) |
| design-system | Tokens / visual consistency |
| frontend-a11y | Accessibility |
| security-review | Sensitive work |
| search-first | Don’t reinvent |
| intent-driven-development | Vague asks → criteria (under RM) |
| careful | Destructive-command warnings |
| review | Eng review (not Pass) |
| context-save / context-restore | Long sessions |
| context-budget | Toolkit bloat audit |
| skill-comply | Meta compliance |
| writing-plans / executing-plans | Medium+ planning |
| compact | Handoff refresh near context limit |
| design-taste-frontend / taste-skill | Existing taste |

---

## Accessible but not preloaded (invoke when recipe needs)

From ECC/gstack installs elsewhere — still allowed by recipes:
e2e-testing, database-migrations, postgres-patterns, deployment-patterns, guard, freeze, qa (impl only), design-review (impl only), cso, ship, canary, document-release, strategic-compact, token-budget-advisor, autoplan (Massive only), fable-workflow (if installed), plan-eng-review (gstack).

---

## Excluded (do not employ)

brainstorming · llm-council (default) · verification-loop-as-Pass · PM Butler household/Gatekeeper/Sculptor · OpenCastle always-on gates/checkpoints · fullstack-forge-all · gstack spec as requirements owner · office-hours default

---

## Vibe-coding default behaviour

User often gives unstructured asks. Agent must still:

1. Build/update `.cursor/REQUIREMENTS.md` (RM or Tiny inline)
2. Pick recipe via AW unless Tiny
3. Implement with preloaded domain skills
4. Run acceptance-review before claiming done
5. On Fail: ≤2 reworks, then ask user
