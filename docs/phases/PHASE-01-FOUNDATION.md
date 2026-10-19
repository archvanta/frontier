# Phase 1 — Foundation, repository and application skeleton

**Recommended model / effort:** Sonnet / High. Escalate only if the repo had complicated pre-existing structure (it was empty).
Model names and effort levels must be checked in the running Claude Code installation (`/model`, `/effort`); this is a recommendation, not an automatic switch.

## Objective
Buildable base: Vite + React + TS, hash routing that works under `/SIGNAL_AI/`, typed data contracts, labelled mock fixtures, Claude Code workspace (agents, skills, commands) and docs skeleton.

## Dependencies
None (repo was empty; `main` seeded with a bootstrap commit).

## Tasks
- Scaffold Vite/React/TS with strict TS, ESLint, Vitest
- Base path `/SIGNAL_AI/` (override `SIGNAL_BASE`)
- Hash router with typed routes
- Data contracts in `src/lib/types.ts`
- Mock dataset generated relative to now, `[MOCK]` titles, mock banner, lazy-loaded only in `--mode mock`
- CLAUDE.md, `.claude/` agents/skills/commands, docs

## Files / modules
`package.json`, `vite.config.ts`, `src/lib/*`, `src/fixtures/mockData.ts`, `.claude/**`, `docs/**`

## Tests
`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run build:mock`; check `dist/index.html` asset URLs start with `/SIGNAL_AI/`; check `[MOCK]` absent from live bundle.

## Acceptance criteria
- [x] Clean install works
- [x] Typecheck + build pass
- [x] Fixtures render in a minimal page
- [x] Works under a Pages project subpath
- [x] No secret required

## Asset dependencies
Hero video, character art: not needed yet.

## Hero video / image rules (where they apply)
- Hero clip `public/videos/signal-ai-intro.mp4` sits below the navigation and above Top Signals; muted, never blocks reading; poster fallback.
- Claude/OpenAI/Gemini primary-topic stories use the fixed character art; everything else uses genuine source images or a category fallback. No image generation.
- UI reference videos are never shown on the site or committed.

## Risk / rollback
Low risk; revert the phase commit.

## Copy-paste prompt
> Read `CLAUDE.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/phases/MODEL-EFFORT-MATRIX.md` and this file. Verify the previous phase's gate evidence. Implement Phase 1 (Foundation, repository and application skeleton) only, run the tests listed above, record real evidence below, update the status file, commit and push. Do not claim anything you did not verify.

## Evidence
Run 2026-10-19 in the build container (Node 22.22.0):
- `npm ci` → 0 vulnerabilities, clean install.
- `npm run check` → typecheck OK, lint OK, **17/17 unit tests passed** (archive paging incl. UTC/DST/leap-year boundaries, router deep links, dates, App renders mock today/yesterday + banner), `vite build` OK.
- `npm run build:mock` OK; mock data emitted as a separate lazy chunk.
- `dist/index.html` script src = `/SIGNAL_AI/assets/…` (Pages subpath); `grep -c "MOCK]" dist/assets/*.js` = 0 (fixtures not in live bundle).
- No env vars or secrets needed.

Result: **PASS**.
