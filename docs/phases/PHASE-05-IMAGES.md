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
- [ ] Images shown when metadata valid
- [ ] Broken images don't break grid
- [ ] Brand mapping stable + tested
- [ ] No image API
- [ ] Attribution documented

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
_Pending — filled in when the phase gate runs._
