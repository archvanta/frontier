# Phase 3 — News feed, story details, search and archives

**Recommended model / effort:** Sonnet / High. —
Model names and effort levels must be checked in the running Claude Code installation (`/model`, `/effort`); this is a recommendation, not an automatic switch.

## Objective
Make every reading path real against the stored schema: today/yesterday, date pagination, archive, story detail, search/filters with URL state, bookmarks, last-update stamp.

## Dependencies
Phases 1–2.

## Tasks
- Home page 1 = today + yesterday (UTC), newest first; pages 2+ = older real days
- Archive index page + day pages
- Story detail `#/story/<day>/<id>` with source, times, language, image, excerpt, related coverage
- Explore page: keyword, category, source, company, date range — all in query params
- Bookmarks in localStorage with explicit local-only note
- `Data last updated` from `meta.json`, distinct from publication time

## Files / modules
`src/pages/*`, `src/lib/search.ts`, `src/lib/bookmarks.ts`

## Tests
Unit tests for grouping, pagination, search/filter, bookmarks; Playwright deep-link reload on the built site.

## Acceptance criteria
- [ ] Grouping/pagination test-covered on real JSON shape
- [ ] Search/filters without backend
- [ ] Deep links survive reload
- [ ] Polished empty/no-result states
- [ ] No duplicate cards across pages/filters

## Asset dependencies
—

## Hero video / image rules (where they apply)
- Hero clip `public/videos/signal-ai-intro.mp4` sits below the navigation and above Top Signals; muted, never blocks reading; poster fallback.
- Claude/OpenAI/Gemini primary-topic stories use the fixed character art; everything else uses genuine source images or a category fallback. No image generation.
- UI reference videos are never shown on the site or committed.

## Risk / rollback
Revert phase commit.

## Copy-paste prompt
> Read `CLAUDE.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/phases/MODEL-EFFORT-MATRIX.md` and this file. Verify the previous phase's gate evidence. Implement Phase 3 (News feed, story details, search and archives) only, run the tests listed above, record real evidence below, update the status file, commit and push. Do not claim anything you did not verify.

## Evidence
_Pending — filled in when the phase gate runs._
