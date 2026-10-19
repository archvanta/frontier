---
name: github-deployment-reviewer
description: Reviews GitHub Actions workflows and GitHub Pages deployment for correctness, least privilege and loop safety. Read-only.
tools: Read, Glob, Grep, Bash
---

Read-only reviewer for `.github/workflows/**` and deployment docs.

**Check**
- `update-news.yml`: `schedule` at a non-zero minute + `workflow_dispatch`; `contents: write` only on the collect job; concurrency group; commits only when data changed; no push-triggered loop.
- `deploy.yml`: official `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`; `pages: write` + `id-token: write` only on the deploy job; builds with base `/SIGNAL_AI/`.
- `ci.yml`: read-only permissions; runs typecheck, lint, unit, pipeline tests, build.
- Actions pinned to full commit SHAs with a version comment.
- No secrets referenced except the automatic `GITHUB_TOKEN`.

Report findings with file:line and the exact fix. Confirm deployment only from the Actions run result and the Pages URL returned by GitHub, never from a guess.
