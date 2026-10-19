# Phase 9 — Systematic QA, security, performance and release

**Recommended model / effort:** Sonnet / High. Opus / Xhigh only as a second reviewer for unresolved high-risk defects.
Model names and effort levels must be checked in the running Claude Code installation (`/model`, `/effort`); this is a recommendation, not an automatic switch.

## Objective
Verify the whole product before calling it done.

## Dependencies
Phases 1–8.

## Tasks
- Run every gate; e2e on mock build
- Security review: XSS, URLs, workflow perms, secrets, SSRF limits
- Accessibility + performance review
- Live-site checks on the verified Pages URL
- QA-REPORT, DEPLOYMENT-GUIDE, KNOWN-LIMITATIONS

## Files / modules
`docs/release/*`

## Tests
All gates + live checks; results recorded truthfully.

## Acceptance criteria
- [x] Build and tests pass or failures documented
- [x] Core flows work on real + fixture data
- [x] No paid APIs
- [x] Publication vs update time distinct
- [x] Readable desktop/mobile, fa/en
- [x] Truthful release report

## Asset dependencies
Live deployment.

## Hero video / image rules (where they apply)
- Hero clip `public/videos/signal-ai-intro.mp4` sits below the navigation and above Top Signals; muted, never blocks reading; poster fallback.
- Claude/OpenAI/Gemini primary-topic stories use the fixed character art; everything else uses genuine source images or a category fallback. No image generation.
- UI reference videos are never shown on the site or committed.

## Risk / rollback
—

## Copy-paste prompt
> Read `CLAUDE.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/phases/MODEL-EFFORT-MATRIX.md` and this file. Verify the previous phase's gate evidence. Implement Phase 9 (Systematic QA, security, performance and release) only, run the tests listed above, record real evidence below, update the status file, commit and push. Do not claim anything you did not verify.

## Evidence
Recorded 2026-10-19 (UTC):
- Gates: pytest 77 passed, vitest 40 passed, Playwright 30 passed (mock build), `tsc -b` and `eslint .` clean, actionlint clean; CI green on GitHub for PRs #1–#3 and on `main`.
- Real data: three collector runs on Actions (see Phase 8); the production build with that data viewed locally at 1440 px (en) and 390 px (fa): Today, picks and Sources render, no mock banner. Fixture data covered by the e2e suite.
- No paid APIs: the only network calls are the RSS/Atom feeds in `sources.yaml`, og:image pages for listed hosts, and the one-time open-source Argos model download. No API keys or secrets exist in the repository or workflows.
- Publication vs update time: cards and story pages show the publisher's time; the footer shows the last data update from `meta.json`; undated items are labelled as estimated.
- Security, accessibility (axe WCAG 2.1 A/AA, 10 route/language checks) and performance: `docs/release/QA-REPORT.md`.
- Deployment: Pages deploy run 39311450758 and collector run 39311850418 (collect → commit `bdc3f25` → deploy) succeeded at https://sadeghimohammadamin83-ship-it.github.io/SIGNAL_AI/ (`docs/release/DEPLOYMENT-GUIDE.md#verified-deployment`). The page was not opened from the build container (network policy refuses `github.io`).
- Release docs: `docs/release/QA-REPORT.md`, `DEPLOYMENT-GUIDE.md`, `KNOWN-LIMITATIONS.md`.

Result: **PASS**, with the live page left for the owner to open once in a browser.
