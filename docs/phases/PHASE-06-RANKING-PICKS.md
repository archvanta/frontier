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
- [x] Unit tests cover the listed cases
- [x] Picks only real stories in window
- [x] Empty windows handled
- [x] Explainable, no LLM

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
Run 2026-10-19:
- `python -m pytest` → **52 passed** (11 new in `tests/test_scoring_picks.py`): every factor normalised to 0–100 and weights sum to 1; recency half-life (100 → 50 → 25) and monotonic decay as `asOf` advances; a republished press release and sister outlets of one owner count as one voice; follow-up reports of an event score half the novelty; window bounds (a story exactly 24 h old is out of Daily, 40-day-old story out of Monthly); one pick per event with its voice count; diversity caps hold for every window when one brand floods the pool; empty pool and empty windows return empty lists; `asOf` ignores future-dated stories and still advances on the 6-hour clock when feeds go quiet; output identical regardless of input order; full pipeline run puts only stored stories in picks, keeps scores out of day files, and a rerun one hour later writes nothing (`changed=False`, byte-identical files).
- Real feed (`collect --only anthropic-news`): 11 Anthropic stories → Weekly 2 picks, Monthly 3 picks (per-subject cap of 3 holds although all 11 are Anthropic stories), Daily empty because no story is under 24 h old.
- No model or API calls; the method is described in `docs/ARCHITECTURE.md#ranking-phase-6` and on the About page, and picks are labelled as algorithmic editorial signals, not truth or popularity.

Result: **PASS**
