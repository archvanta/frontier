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
- [x] Local run produces normalised articles
- [x] Rerun → no diff
- [x] Failed sources isolated
- [x] Attribution + canonical links preserved
- [x] Date parsing tests
- [x] Verified vs candidate sources separated

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
Run 2026-10-19 (Python 3.13 venv, feedparser 6.0.14, requests 2.34.2, PyYAML 6.0.3):
- `python -m pytest` → **30 passed**: HTML→text (scripts/styles dropped, entities decoded), excerpt boilerplate + truncation, canonical URLs (tracking params, fragments, ports, slashes), stable ids across http/https, dates (+03:30 and −07:00 offsets → UTC, naive → UTC, missing → fetch time flagged `dateEstimated`, malformed, far-future), AI filter, categories/entities; fetcher allowlist incl. redirect to 169.254.169.254 blocked, size caps (streamed + Content-Length), retries on 5xx, no retry on 404, timeouts, per-host spacing; RSS media/enclosure + Atom parsing; malformed XML and HTML-instead-of-feed raise `FeedError`; full run with 2 failing sources isolated (`HTTP 503`, parse error) and one disabled; same-source repost dropped keeping the original; cross-source event clustering; brand names alone never merge; **rerun 1 h later → 0 added, `changed=False`, byte-identical files incl. `meta.dataUpdatedAt`**; history kept when a source later fails; `verifiedOn` keeps the first success day.
- Real-network check from the build container: only the GitHub-hosted Anthropic mirror is reachable here; `python -m signal_pipeline collect --only anthropic-news,openai-news` stored 11 real stories and recorded OpenAI as `network error: ProxyError` without failing the run. Remaining feeds are verified on GitHub's runners in Phase 8.

Result: **PASS** (feed verification of the other sources deferred to the first Actions run, recorded in `docs/SOURCE-REGISTER.md`).
