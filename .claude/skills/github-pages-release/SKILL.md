---
name: github-pages-release
description: Ship SIGNAL AI to GitHub Pages and verify it for real. Use for deploy workflow changes, first-time Pages setup, or release verification.
---

# GitHub Pages release

1. Pages source must be **GitHub Actions** (Settings → Pages). If it is not enabled the deploy job fails at `configure-pages`; tell the user the exact setting.
2. `deploy.yml` builds with `npm ci && npm run build` (base `/SIGNAL_AI/`), uploads `dist/` with `actions/upload-pages-artifact`, deploys with `actions/deploy-pages`.
3. Verify: the Actions run concluded `success`, the `deploy` job output `page_url`, and fetching that URL returns the app shell and `data/meta.json`.
4. Report the URL only from the deployment output. Never infer it from the repo name.
5. Never force-push; integrate via PR into `main`.
