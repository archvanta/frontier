# Phase 5 — Article images and fixed brand character artwork

**Recommended model / effort:** Sonnet / High. —
Model names and effort levels must be checked in the running Claude Code installation (`/model`, `/effort`); this is a recommendation, not an automatic switch.

## Objective
Relevant images without image APIs and without passing synthetic art off as news photos.

## Dependencies
Phase 4.

## Tasks
- Feed image extraction (media:content/thumbnail, enclosure, first img)
- og:image from allowlisted article hosts (new items only, timeouts, size cap)
- Primary-subject brand detection → claude/openai/gemini character art, keep `sourceImage`
- Category fallback SVGs; client onerror fallback; lazy loading; fixed aspect ratio
- 'Unofficial editorial illustration' label

## Files / modules
`pipeline/signal_pipeline/images.py`, `brands.py`, `src/components/StoryImage.tsx`

## Tests
pytest for extraction + brand mapping (incl. incidental mentions not mapped); component test for onerror fallback.

## Acceptance criteria
- [x] Images shown when metadata valid
- [x] Broken images don't break grid
- [x] Brand mapping stable + tested
- [x] No image API
- [x] Attribution documented

## Asset dependencies
Character art (present).

## Hero video / image rules (where they apply)
- Hero clip `public/videos/signal-ai-intro.mp4` sits below the navigation and above Top Signals; muted, never blocks reading; poster fallback.
- Claude/OpenAI/Gemini primary-topic stories use the fixed character art; everything else uses genuine source images or a category fallback. No image generation.
- UI reference videos are never shown on the site or committed.

## Risk / rollback
Revert phase commit.

## Copy-paste prompt
> Read `CLAUDE.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/phases/MODEL-EFFORT-MATRIX.md` and this file. Verify the previous phase's gate evidence. Implement Phase 5 (Article images and fixed brand character artwork) only, run the tests listed above, record real evidence below, update the status file, commit and push. Do not claim anything you did not verify.

## Evidence
Run 2026-10-19:
- `python -m pytest` → **41 passed** (11 new in `tests/test_brands_images.py`): single-brand headlines map to claude/openai/gemini; excerpt-only or multi-brand headlines get no brand art; Jean-Claude / Claude Monet / Gemini exchange / Winklevoss / lowercase "gemini" are not brands; an official brand channel keeps its brand unless the headline is about another brand; tracker pixels, `data:` and `javascript:` URLs rejected; media:content preferred over thumbnails, largest width wins, video and <120px skipped; first real `<img>` in HTML; full run assigns feed, og:image (relative URL resolved, alt kept), brand art (with `sourceImage` kept) and category fallback; og:image fetched only for allowlisted sources/hosts, never when disabled, capped at 10 page fetches per source per run; private `_media`/`_html` fields never written.
- `vitest run` → **35 passed** (4 new in `src/components/StoryImage.test.tsx`): broken image swaps to the category SVG with empty alt, `loading=lazy`, `referrerpolicy=no-referrer`, brand art labelled "Unofficial editorial illustration", unsafe URL schemes rejected. `tsc -b` and `eslint .` clean.
- Real feed: `collect --only anthropic-news` stored 11 real stories, all mapped to the Claude artwork (official channel); the publisher's og:image was found for one and kept as `sourceImage`, linked from the story page as "Publisher's image".
- No image API or image generation is used; images are referenced by URL only. Attribution is described on the About page and in `public/images/ai-brands/README.md`.

Result: **PASS**
