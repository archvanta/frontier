# Phase 4 — Source registry, RSS ingestion and deduplication

**Recommended model / effort:** Sonnet / High. Opus / High or Xhigh for persistent parser/data-integrity failures.
Model names and effort levels must be checked in the running Claude Code installation (`/model`, `/effort`); this is a recommendation, not an automatic switch.

## Objective
Collect public AI news without paid APIs; normalise, deduplicate and store idempotently.

## Dependencies
Phase 1 schema.

## Tasks
- `pipeline/sources.yaml` registry (official, research, media, community) with tier, terms notes, enabled flag
- Fetcher: allowlisted hosts, 15 s timeout, 3 MB cap, UA, 2 retries with backoff, per-host delay
- feedparser RSS/Atom; plain-text excerpts ≤ 400 chars; canonical URLs; stable ids
- Dedup by URL then same-source title similarity; event clustering across sources
- Per-source health; one failure never fails the run
- Idempotent writes (byte-identical when nothing changed)

## Files / modules
`pipeline/**`, `public/data/**` (generated)

## Tests
`python -m pytest -q` with fixture feeds: malformed XML, bad/missing dates, UTC offsets, duplicate items, failing source, rerun no-diff.

## Acceptance criteria
- [ ] Local run produces normalised articles
- [ ] Rerun → no diff
- [ ] Failed sources isolated
- [ ] Attribution + canonical links preserved
- [ ] Date parsing tests
- [ ] Verified vs candidate sources separated

## Asset dependencies
Network access to feeds (available on GitHub runners; blocked in the build container).

## Hero video / image rules (where they apply)
- Hero clip `public/videos/signal-ai-intro.mp4` sits below the navigation and above Top Signals; muted, never blocks reading; poster fallback.
- Claude/OpenAI/Gemini primary-topic stories use the fixed character art; everything else uses genuine source images or a category fallback. No image generation.
- UI reference videos are never shown on the site or committed.

## Risk / rollback
Generated data can be reverted by reverting the data commit.

## Copy-paste prompt
> Read `CLAUDE.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/phases/MODEL-EFFORT-MATRIX.md` and this file. Verify the previous phase's gate evidence. Implement Phase 4 (Source registry, RSS ingestion and deduplication) only, run the tests listed above, record real evidence below, update the status file, commit and push. Do not claim anything you did not verify.

## Evidence
_Pending — filled in when the phase gate runs._
