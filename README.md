# FRONTIER

(Repository and Pages address keep the original name, `SIGNAL_AI`.)

Bilingual (Persian / English) news from the frontier of technology (AI first, data centers and more to follow), published as a free static site on GitHub Pages.

- **Live site:** https://sadeghimohammadamin83-ship-it.github.io/SIGNAL_AI/ (address reported by the successful Pages deployments recorded in `docs/release/DEPLOYMENT-GUIDE.md`).
- **What it does:** about once an hour a GitHub Actions job reads a maintained list of public RSS/Atom feeds from AI labs, research groups and tech media (`pipeline/signal_pipeline/sources.yaml`), removes duplicates, groups stories about the same event, picks images, ranks Daily / Weekly / Monthly picks, optionally machine-translates new headlines into Persian offline, and commits JSON files to `public/data/`. The site reads those files; visiting it never triggers collection, translation or any AI call.
- **No paid services:** no Claude, OpenAI, Gemini, translation, image or search API, and no secrets are needed.

## Run it locally

```bash
npm ci
npm run dev:mock      # clearly labelled [MOCK] data, no network needed
npm run dev           # reads public/data/ (empty until the collector has run)
npm run check         # typecheck, lint, unit tests, production build
npm run build:mock && npm run test:e2e   # Playwright end-to-end tests
```

Collector (Python 3.12):

```bash
cd pipeline
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
pip install -r requirements-translate.txt        # optional: offline Persian translation
python -m pytest
python -m signal_pipeline collect --out ../public/data            # real feeds
python -m signal_pipeline collect --out ../public/data --no-translate --no-og
```

## Automation

| Workflow | Trigger | Permissions | What it does |
|---|---|---|---|
| `ci.yml` | push, pull request, manual | read only | typecheck, lint, unit tests, builds, Playwright e2e, pytest, workflow policy checks |
| `update-news.yml` | `17 * * * *` and `47 * * * *` schedule, manual | `contents: write` on the collect job only | collects, commits `public/data/` **only if it changed**, then calls the deploy |
| `deploy.yml` | push to `main`, manual, called by the update | build: read · deploy: `pages: write`, `id-token: write` | builds with the exact Pages base path and deploys with the official Pages actions |

- **Manual update:** Actions → *Update news* → *Run workflow* (untick *translate* to skip translation for that run).
- **Turn translation off for scheduled runs:** Settings → Secrets and variables → Actions → Variables → add `SIGNAL_TRANSLATE` = `0`.
- **Health:** each run writes a summary (new stories, data changed, failing sources with their error, translation status). On the site, the footer shows the last data update and the *Sources* page shows each feed's status.
- **No loops:** commits pushed with `GITHUB_TOKEN` don't start other workflows, the collector has no `push` trigger, and runs never overlap (`concurrency`). Pushes are retried with a rebase of the single data commit; nothing is ever force-pushed.
- All third-party actions are pinned to commit SHAs.

## Limits and assumptions

- **Hourly is best effort.** GitHub may delay or skip scheduled runs when it is busy (the collector has two slots per hour, at minutes 17 and 47, so one skipped run does not leave the site stale for long), and disables schedules in a repository with no activity for 60 days (re-enable from the Actions tab). This is not a real-time feed.
- **Free tier:** the repository is public, so Actions minutes for standard runners are free; one run usually takes a few minutes (longer the first time, when the translation model is downloaded and cached). GitHub Pages limits apply (published site up to 1 GB, soft bandwidth limit of 100 GB per month).
- **Public repository:** all source code and the collected data (headlines, links, short excerpts, image URLs) are public. Nothing private belongs here.
- **Retention:** day files are kept indefinitely; the collector only reads the last 90 days and never deletes older files. Expect the data folder to grow by roughly a few megabytes per month. The search index covers the last 90 days.
- **Sources:** feeds change or break; a failing source is recorded and skipped without stopping the run. Some publishers have no RSS (Anthropic is read through a community mirror, see `docs/SOURCE-REGISTER.md`).
- **Ranking** is a deterministic editorial signal (source tier, independent coverage, recency, topic, novelty), not a truth rating or popularity count. See `docs/ARCHITECTURE.md#ranking-phase-6`.
- **Translation** is offline machine translation (Argos Translate en→fa) and can be wrong; the original English and the source link are always shown.
- **Accounts are optional and off until set up.** Username/password sign-in, interests, a personal *For You* page and account bookmarks use Supabase Auth and Postgres; no reader email is collected. Until configured, everything else works as before. Steps: `docs/AUTH-SETUP.md`; design and security: `docs/ACCOUNTS.md`.
- **Images:** publisher images are linked, not copied; a story without one shows a category graphic. Fixed, unofficial character illustrations for Claude, OpenAI and Gemini stories are in `public/images/ai-brands/` but currently switched off (`BRAND_ART_ENABLED` in `pipeline/signal_pipeline/config.py`).

## Project docs

`docs/IMPLEMENTATION-STATUS.md` (phase gates and evidence) · `docs/ARCHITECTURE.md` · `docs/ACCOUNTS.md` · `docs/AUTH-SETUP.md` · `docs/DATA-SCHEMA.md` · `docs/SOURCE-REGISTER.md` · `docs/DESIGN-SYSTEM.md` · `docs/release/` (QA report, deployment guide, known limitations).

Licence: no LICENSE file has been added yet; the owner should choose one before inviting reuse. Third-party news content belongs to its publishers; every card links to the original.
