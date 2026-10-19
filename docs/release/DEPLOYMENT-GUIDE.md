# Deployment guide

## One-time setup (repository owner)
1. **Settings → Pages → Build and deployment → Source: GitHub Actions.** This is required; without it `deploy.yml` stops at `actions/configure-pages` with "Get Pages site failed … Not Found" (seen on the first deploy, run 39309079986). The workflow token cannot turn Pages on by itself.
2. Settings → Actions → General → Workflow permissions can stay at the default *Read repository contents*: each workflow asks for the extra scopes it needs (`contents: write` only for the collector job; `pages: write` and `id-token: write` only for the deploy job).
3. Optional: Settings → Secrets and variables → Actions → **Variables** → `SIGNAL_TRANSLATE` = `0` to turn off Persian translation on scheduled runs. No secrets are needed.

## How a deploy happens
- Push to `main` (for example merging a pull request) → `Deploy to GitHub Pages` builds and publishes.
- Hourly at minute 17 (best effort) → `Update news` collects; if `public/data/` changed it commits as `github-actions[bot]` and calls the same deploy workflow for that commit.
- By hand: Actions → *Update news* → *Run workflow* (always redeploys), or Actions → *Deploy to GitHub Pages* → *Run workflow*.

The build uses the base path reported by `actions/configure-pages` (the repository name, `/SIGNAL_AI/`), so assets and data resolve on the project site. Routes use `#/…` URLs, so deep links work without server rewrites.

## Verifying a deploy
1. The *deploy* job of the run shows the `github-pages` environment URL and writes "Published to <url>" in the run summary.
2. Open that URL: the header shows "Data last updated", the Sources page lists each feed's status, and there is no MOCK DATA banner.
3. `<url>data/meta.json` returns the latest `dataUpdatedAt`.

## Rollback
- Site code: revert the offending commit on `main` with a pull request; the push redeploys.
- Data: revert the `data: news update …` commit; the next hourly run continues from the restored files. Day files are never deleted by the collector.
- Stop automation temporarily: Actions → *Update news* → ⋯ → *Disable workflow*.

## Verified deployment
_Filled in only after a successful Pages deployment has been observed and the published URL opened._
