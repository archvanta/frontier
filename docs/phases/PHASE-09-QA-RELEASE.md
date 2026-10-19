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
- [ ] Build and tests pass or failures documented
- [ ] Core flows work on real + fixture data
- [ ] No paid APIs
- [ ] Publication vs update time distinct
- [ ] Readable desktop/mobile, fa/en
- [ ] Truthful release report

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
_Pending — filled in when the phase gate runs._
