# Phase 2 — Visual system and UX/UI implementation

**Recommended model / effort:** Sonnet / High. Opus / High only for a genuine design-system dispute.
Model names and effort levels must be checked in the running Claude Code installation (`/model`, `/effort`); this is a recommendation, not an automatic switch.

## Objective
Implement the SIGNAL AI look (near-black layers, acid-lime accents, editorial type, modular grid) and the compact hero video panel, with accessible, responsive components.

## Dependencies
Phase 1.

## Tasks
- Design tokens, type scale, spacing, focus styles
- Header/nav with Top Signals, picks, categories, archive, search, saved, language toggle
- Hero video panel: 16:9, ~300–420 px tall on desktop, muted/inline/loop, IntersectionObserver pause, reduced-motion/save-data → poster, pause button
- Story card, picks panel with Daily/Weekly/Monthly tabs, day sections, pagination shell, empty/error/loading/skeleton states
- Prepare hero clip (audio stripped) + poster, convert character art to WebP, category fallback SVGs
- Playwright screenshots + overflow checks at 375/768/1440

## Files / modules
`src/components/*`, `src/pages/*`, `src/styles/*`, `public/videos/*`, `public/images/**`, `e2e/*`

## Tests
Unit/component tests; Playwright: no horizontal overflow at 375/768/1440 px in en and fa; hero has `muted` and pauses; reduced-motion shows poster.

## Acceptance criteria
- [ ] Polished, consistent UI
- [ ] Reading flow obvious
- [ ] Keyboard + contrast OK
- [ ] RTL/LTR intact
- [ ] No horizontal overflow
- [ ] Motion non-blocking, reduced motion honoured

## Asset dependencies
Hero clip (present), character art (present), reference videos (present, not shipped).

## Hero video / image rules (where they apply)
- Hero clip `public/videos/signal-ai-intro.mp4` sits below the navigation and above Top Signals; muted, never blocks reading; poster fallback.
- Claude/OpenAI/Gemini primary-topic stories use the fixed character art; everything else uses genuine source images or a category fallback. No image generation.
- UI reference videos are never shown on the site or committed.

## Risk / rollback
Visual regressions only; revert phase commit.

## Copy-paste prompt
> Read `CLAUDE.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/phases/MODEL-EFFORT-MATRIX.md` and this file. Verify the previous phase's gate evidence. Implement Phase 2 (Visual system and UX/UI implementation) only, run the tests listed above, record real evidence below, update the status file, commit and push. Do not claim anything you did not verify.

## Evidence
_Pending — filled in when the phase gate runs._
