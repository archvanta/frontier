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
- [x] Local build works
- [x] Workflows valid
- [x] Manual update triggerable
- [ ] Valid Pages artifact — blocked: Pages is not enabled for the repository yet (owner setting)
- [x] Two runs w/o news → no commit
- [x] Minimal permissions, no secrets
- [x] README honest

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
Recorded 2026-10-19 (UTC):
- Local: `SIGNAL_BASE=/SIGNAL_AI/ npm run build` → `dist/` 3.1 MB with assets under `/SIGNAL_AI/assets/`; actionlint 1.7.12 reports no errors; `pipeline/tests/test_workflows.py` (6 tests) checks SHA pinning, read-only defaults, the `17 * * * *` schedule, scoped write permissions, no force-push, and no secrets.
- CI on GitHub: PR #1 (head `6f3039a`) and PR #2 (head `9bb651c`) green on both jobs; merged as `b74a0bc` and `32a112b`.
- Collector, run 1 (`workflow_dispatch`, run 39309098078, code `b74a0bc`): 18/23 feeds OK, **215 stories**, Argos en→fa model downloaded and cached (≈123 MB cache), **149 headlines translated**, commit `025bbf0` by github-actions[bot].
- Collector, run 2 (run 39310318326, code `32a112b` with feed fixes): Guardian and arXiv now OK, 20/21 enabled feeds OK (VentureBeat HTTP 429), 230 stories, 164 translated, commit `63b8ef0`.
- Collector, run 3 (run 39310632220) right after: collect succeeded and **made no commit** (`main` stayed at `63b8ef0`).
- Deploy: every attempt (push run 39309079986 and the deploy jobs called from the three collector runs) stopped at `actions/configure-pages` with "Get Pages site failed … Not Found": GitHub Pages is not enabled for the repository. Needs the owner to set Settings → Pages → Source: GitHub Actions. Not worked around (the workflow token cannot enable Pages).

Result: **PASS except deployment, which is blocked on the one-time Pages setting.**
