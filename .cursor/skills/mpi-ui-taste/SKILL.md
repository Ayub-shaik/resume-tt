---
name: mpi-ui-taste
description: MPI-specific notes when applying Leonxlnx design-taste-frontend to My Personal Interviewer. Use together with design-taste-frontend for studio/ATS/profile/landing polish.
---

# MPI + Leonxlnx taste-skill

Primary skill: **`design-taste-frontend`** from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)
(installed at `.cursor/skills/design-taste-frontend` and `~/.cursor/skills/design-taste-frontend`).

## Design read for MPI (declare before visual work)
**Reading this as:** B2B/self-use interview + ATS studio for a technical candidate, with a calm premium-tool language (not marketing chaos), leaning toward existing Fraunces + Manrope + soft teal glass panels — redesign should enrich atmosphere without turning `/studio` into a landing-page carnival.

## Dial overrides for MPI product surfaces
- Landing `/`: VARIANCE 7 / MOTION 6 / DENSITY 3
- Studio `/studio`, ATS `/ats`, Profile `/profile`: VARIANCE 4 / MOTION 3 / DENSITY 6  
  (tool UI — anti-slop still applies; avoid card spam and purple glow)

## Keep
- Fraunces (display) + Manrope (body)
- CSS variables in `globals.css`
- Sticky interview composer / safe-area behavior
- Topic interview sidebar density

## Hard avoid (taste-skill + user rules)
- Inter/Roboto defaults, purple-on-white AI gradients, cream+terracotta cliché, dashboard card grids in the hero

## How to invoke in Cursor
Ask: “Use design-taste-frontend (+ mpi-ui-taste) to enrich MPI UI” and name the surface (landing / studio / ATS / profile).
