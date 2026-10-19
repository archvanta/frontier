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
- [x] Grouping/pagination test-covered on real JSON shape
- [x] Search/filters without backend
- [x] Deep links survive reload
- [x] Polished empty/no-result states
- [x] No duplicate cards across pages/filters

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
Run 2026-10-19:
- `npm run check`: typecheck + lint clean, **31/31 unit tests passed** (new: search tokens/Persian normalisation/filters/date range/dedup/pagination, URL-param sanitising, bookmarks toggle/corrupt storage/remove), build OK.
- `npx playwright test` on the mock build: **16/16 passed** (new: story deep link survives hard reload and shows Published vs Collected times and a `noopener noreferrer` source link; page 1 = Today+Yesterday and page 2 contains a disjoint set of stories, page survives reload; search + category filter live in the URL with a polished no-results state; bookmarks persist across reload with the local-only note; archive → day page; unknown route → not-found with a way home).
- Archive policy documented in `src/lib/archive.ts` and `docs/ARCHITECTURE.md` (UTC days; page 1 today+yesterday; 3 older days per page).

Result: **PASS**.
