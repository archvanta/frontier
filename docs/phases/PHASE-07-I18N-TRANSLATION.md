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
- [x] Toggle works everywhere + persists
- [x] RTL correct incl. mixed Latin names
- [x] Translation success/failure tested
- [x] No paid key
- [x] Failed translation can't block publishing

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
Run 2026-10-19:
- Engine choice: the Argos Translate package index (raw.githubusercontent.com/argosopentech/argospm-index) lists `translate-en_fa` 1.5 at `https://argos-net.com/v1/translate-en_fa-1_5.argosmodel`. Instead of installing `argostranslate` (which pulls PyTorch/stanza), `translate.py` runs the package directly with the same steps Argos uses (SentencePiece pieces → CTranslate2 beam search, beam 4, length penalty 0.2 → decode), needing only `ctranslate2==4.8.3` and `sentencepiece==0.2.2`. The model host is not reachable from the build container, so the download, licence text and real translation quality are checked on the first GitHub Actions run (Phase 8); the run summary prints the package SHA-256.
- `python -m pytest` → **70 passed** (18 new in `tests/test_translate.py`): new stories get `tr.fa` with engine and time while the English original is untouched; cached translations are never redone; Persian-language stories skipped; a 3-day backfill only; per-run cap takes the newest; outputs that are empty, unchanged, non-Persian or runaway are rejected; no model load when nothing needs translating; `SIGNAL_TRANSLATE=0` / `--no-translate` switch; load failure (missing dependency, HTTP 503 download, broken model) and a crash mid-run keep English and still publish; search index gets `tf`; rerun translates nothing and writes nothing; model package download happens once then comes from cache, and checksum mismatch, wrong layout, zip path traversal and an HTML error page are refused. One test builds a tiny random CTranslate2 Transformer + SentencePiece model and runs the real `ArgosEngine` code path end to end (plumbing only, not quality).
- `vitest run` → **40 passed** (5 new in `src/lib/i18n.test.ts`: identical key sets with matching `{placeholders}`, stored-then-browser locale choice, translated text only in Persian with English fallback and its `lang`).
- `playwright test` → **18 passed** (2 new in `e2e/i18n.spec.ts`: Persian choice keeps `lang=fa dir=rtl` on home, picks, explore, archive, saved, sources and about with no horizontal overflow, survives reload, switches back; Persian story page shows the machine-translation label, the original title and the source link, and an untranslated story says it is shown in English).
- No paid API or key anywhere; translation is optional and off-switchable.

Result: **PASS** (real en→fa model download and output to be confirmed on the first Actions run).
