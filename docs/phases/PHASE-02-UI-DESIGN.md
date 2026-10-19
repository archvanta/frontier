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
- [x] Polished, consistent UI
- [x] Reading flow obvious
- [x] Keyboard + contrast OK
- [x] RTL/LTR intact
- [x] No horizontal overflow
- [x] Motion non-blocking, reduced motion honoured

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
Run 2026-10-19:
- Hero clip: `public/videos/signal-ai-intro.mp4` produced from the user's `gemini_generated_video_11fc5a59.mp4` (ffprobe: 1280×720, 10.0 s, video stream only — audio removed), 1.05 MB; VP9 WebM 0.87 MB; poster frame from the real clip.
- Character art converted from the user's three finished images to `public/images/ai-brands/{claude,openai,gemini}-character.webp` (800², 76–91 KB).
- `npm run typecheck`, `npm run lint` clean; `npm test` **20/20 passed** (adds App tests: hero h1 text, Today before Yesterday, newest-first ordering, Persian → `dir=rtl`, hero video muted/inline).
- `npx playwright test` against the mock build (Chromium 1194): **10/10 passed** — no horizontal overflow at 375/768/1440 px in en and fa; hero below header and above Top Signals, height 300–420 px at 1440; video muted + playsInline + loop, plays when visible and pauses after scrolling away; reduced-motion shows poster and Play button starts the video; skip button first in tab order; picks tabs switch with arrow keys.
- Screenshots reviewed at 1440/768/375 in both locales; fixes applied for status-panel density on tablet/mobile and an LTR overflow from a decorative glow.

Result: **PASS**.
