# Phase 7 — Persian/English localisation and optional offline translation

**Recommended model / effort:** Sonnet / High. Escalate only for complex translation runtime issues.
Model names and effort levels must be checked in the running Claude Code installation (`/model`, `/effort`); this is a recommendation, not an automatic switch.

## Objective
Genuinely bilingual UI that works with or without machine translation.

## Dependencies
Phases 2–3.

## Tasks
- Complete en/fa strings, `<html lang dir>`, logical CSS, Persian dates/digits
- Original text and `tr.fa` stored separately
- Offline Argos en→fa model through CTranslate2 + SentencePiece; translate new items only; cap per run; `SIGNAL_TRANSLATE=0` kill switch
- Machine-translation label; original one click away

## Files / modules
`src/lib/i18n.tsx`, `pipeline/signal_pipeline/translate.py`

## Tests
Unit: every key translated; pytest: translation success, model missing, engine exception → pipeline still succeeds.

## Acceptance criteria
- [ ] Toggle works everywhere + persists
- [ ] RTL correct incl. mixed Latin names
- [ ] Translation success/failure tested
- [ ] No paid key
- [ ] Failed translation can't block publishing

## Asset dependencies
Argos en→fa 1.5 model (downloaded on runner; verified there).

## Hero video / image rules (where they apply)
- Hero clip `public/videos/signal-ai-intro.mp4` sits below the navigation and above Top Signals; muted, never blocks reading; poster fallback.
- Claude/OpenAI/Gemini primary-topic stories use the fixed character art; everything else uses genuine source images or a category fallback. No image generation.
- UI reference videos are never shown on the site or committed.

## Risk / rollback
Disable via env switch.

## Copy-paste prompt
> Read `CLAUDE.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/phases/MODEL-EFFORT-MATRIX.md` and this file. Verify the previous phase's gate evidence. Implement Phase 7 (Persian/English localisation and optional offline translation) only, run the tests listed above, record real evidence below, update the status file, commit and push. Do not claim anything you did not verify.

## Evidence
_Pending — filled in when the phase gate runs._
