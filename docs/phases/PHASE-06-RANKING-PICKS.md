# Phase 6 — Deterministic importance scoring and Daily/Weekly/Monthly Picks

**Recommended model / effort:** Sonnet / High. —
Model names and effort levels must be checked in the running Claude Code installation (`/model`, `/effort`); this is a recommendation, not an automatic switch.

## Objective
Transparent, deterministic ranking and pick lists stored in JSON.

## Dependencies
Phases 4–5.

## Tasks
- Features normalised 0–100; weights 30/25/20/15/10 in config
- Independent corroboration (owner groups, syndicated titles count once)
- Recency vs data `asOf` (idempotent); window-scaled half-life
- One article per event; diversity caps per source/brand/category
- Explanations stored and shown in UI

## Files / modules
`pipeline/signal_pipeline/scoring.py`, `picks.py`, `src/components/ScoreExplain.tsx`

## Tests
pytest: normalisation, decay, duplicates, window boundaries, diversity, empty windows.

## Acceptance criteria
- [ ] Unit tests cover the listed cases
- [ ] Picks only real stories in window
- [ ] Empty windows handled
- [ ] Explainable, no LLM

## Asset dependencies
—

## Hero video / image rules (where they apply)
- Hero clip `public/videos/signal-ai-intro.mp4` sits below the navigation and above Top Signals; muted, never blocks reading; poster fallback.
- Claude/OpenAI/Gemini primary-topic stories use the fixed character art; everything else uses genuine source images or a category fallback. No image generation.
- UI reference videos are never shown on the site or committed.

## Risk / rollback
Revert phase commit.

## Copy-paste prompt
> Read `CLAUDE.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/phases/MODEL-EFFORT-MATRIX.md` and this file. Verify the previous phase's gate evidence. Implement Phase 6 (Deterministic importance scoring and Daily/Weekly/Monthly Picks) only, run the tests listed above, record real evidence below, update the status file, commit and push. Do not claim anything you did not verify.

## Evidence
_Pending — filled in when the phase gate runs._
