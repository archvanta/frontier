# Model / effort matrix

Recommendations for the human operator. Check what your Claude Code installation actually offers (`/model`, `/effort`) before each phase — model names and effort levels change between versions. Claude cannot switch its own session model or effort; when a switch is recommended, type the command yourself.

| Phase | Recommended | Why | Escalate when | Commands |
|---|---|---|---|---|
| 1 Foundation | Sonnet / High | Routine scaffolding with some judgement on structure | Repo has tangled pre-existing code | `/model sonnet` `/effort high` |
| 2 UI & design system | Sonnet / High | Large but well-specified UI work | Genuine design-system/architecture dispute → Opus / High | `/model sonnet` `/effort high` |
| 3 Feed, search, archives | Sonnet / High | Deterministic app logic with tests | — | `/model sonnet` `/effort high` |
| 4 Ingestion & dedup | Sonnet / High | Parser + data integrity | Persistent parser/data-integrity failures → Opus / High or Xhigh | `/model opus` `/effort high` when escalating |
| 5 Images & brand art | Sonnet / High | Rules + fallbacks | — | `/model sonnet` `/effort high` |
| 6 Scoring & picks | Sonnet / High | Algorithmic but well-defined | — | `/model sonnet` `/effort high` |
| 7 i18n & translation | Sonnet / High | Strings, RTL, optional offline MT | Complex translation runtime issues | `/model sonnet` `/effort high` |
| 8 Actions & Pages | Sonnet / High | Workflow YAML, permissions | Persistent deploy/security failures → Opus / High | `/model sonnet` `/effort high` |
| 9 QA & release | Sonnet / High | Systematic testing | Independent second review of unresolved high-risk defects → Opus / Xhigh | `/model opus` `/effort xhigh` for the second pass only |

Use Haiku or low effort only for mechanical edits (renames, format conversions). Do not run everything at maximum effort.

## What was actually used
The initial build (all nine phases, 2026-10-19) ran in a single Claude Code cloud session configured for an Opus-family model. The session could not change its own model mid-run, so the per-phase recommendations above were not applied as switches; they remain the guidance for future maintenance sessions.
