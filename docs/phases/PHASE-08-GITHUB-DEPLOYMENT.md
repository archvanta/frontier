# Phase 8 — Hourly automation, data persistence and GitHub Pages deployment

**Recommended model / effort:** Sonnet / High. Opus / High for persistent workflow/deploy failures.
Model names and effort levels must be checked in the running Claude Code installation (`/model`, `/effort`); this is a recommendation, not an automatic switch.

## Objective
Publish the static site and automate updates within free limits.

## Dependencies
Phases 1–7.

## Tasks
- `update-news.yml`: cron `17 * * * *` + dispatch; contents:write only there; concurrency; commit only on change; then calls deploy
- `deploy.yml`: official Pages actions; pages:write + id-token:write only on deploy job; push to main + workflow_call + dispatch
- `ci.yml`: read-only, runs all gates
- Pinned action SHAs; pip/npm/model caches
- README: limits, delays, public-repo visibility

## Files / modules
`.github/workflows/*`, `README.md`, `docs/release/DEPLOYMENT-GUIDE.md`

## Tests
YAML parse/actionlint; real Actions runs: CI green, collector run, second collector run with no commit, deploy success + page_url.

## Acceptance criteria
- [ ] Local build works
- [ ] Workflows valid
- [ ] Manual update triggerable
- [ ] Valid Pages artifact
- [ ] Two runs w/o news → no commit
- [ ] Minimal permissions, no secrets
- [ ] README honest

## Asset dependencies
Pages source = GitHub Actions (repo setting, user action if not auto-enabled).

## Hero video / image rules (where they apply)
- Hero clip `public/videos/signal-ai-intro.mp4` sits below the navigation and above Top Signals; muted, never blocks reading; poster fallback.
- Claude/OpenAI/Gemini primary-topic stories use the fixed character art; everything else uses genuine source images or a category fallback. No image generation.
- UI reference videos are never shown on the site or committed.

## Risk / rollback
Disable workflows from the Actions tab; revert.

## Copy-paste prompt
> Read `CLAUDE.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/phases/MODEL-EFFORT-MATRIX.md` and this file. Verify the previous phase's gate evidence. Implement Phase 8 (Hourly automation, data persistence and GitHub Pages deployment) only, run the tests listed above, record real evidence below, update the status file, commit and push. Do not claim anything you did not verify.

## Evidence
_Pending — filled in when the phase gate runs._
