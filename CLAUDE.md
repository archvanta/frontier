# SIGNAL AI — project contract

Bilingual (Persian RTL / English LTR) AI-news intelligence site. Python collector on GitHub Actions (~hourly) → versioned JSON in `public/data/` → static Vite/React site on GitHub Pages (`/SIGNAL_AI/`, hash routing).

## Non-negotiables
- **No paid APIs.** No LLM, translation, image or search API calls anywhere. Translation is optional, offline (Argos en→fa model via CTranslate2), cached per article.
- **No secrets** in the repo or bundle. Only the automatic `GITHUB_TOKEN` in workflows. Optional accounts (Supabase) use only the public URL + publishable key from Actions **variables**; a secret/service_role key fails the build (`vite.config.ts`, `scripts/check-bundle-secrets.mjs`). Never commit user data, SMTP or OAuth credentials.
- **Never fabricate** news, sources, dates, images, translations, verification or test results. Mock data is generated only in `--mode mock`, titles start with `[MOCK]`, and the UI shows a mock banner.
- **Attribution:** keep original title, source name, publication time, canonical URL; store short excerpts only, never full articles.
- **Images:** every story uses the genuine feed/og image, else a category fallback. The fixed Claude/OpenAI/Gemini character art in `public/images/ai-brands/` (unofficial editorial illustrations) is **switched off** at the owner's request (`BRAND_ART_ENABLED = False` in `pipeline/signal_pipeline/config.py`); keep the files, and turn it back on only when the owner asks. Never generate images.
- **Reference media** (`references/`, the two UI videos, extracted frames) is never committed. The hero clip `public/videos/signal-ai-intro.mp4` is a shipped asset.
- The external master prompt TXT is never committed.
- Git: work on a branch, PR into `main`, no force-push or history rewrite.

## Commands
```bash
npm ci                     # install
npm run dev                # site with live data from public/data
npm run dev:mock           # site with labelled mock fixtures
npm run check              # typecheck + lint + unit tests + build
npm run build:mock && npx playwright test   # e2e on the mock build
cd pipeline && pip install -r requirements.txt -r requirements-dev.txt && python -m pytest -q
python -m signal_pipeline collect --out ../public/data     # real collection (needs network)
```

## Layout
- `src/` React app — `lib/` (types, data, router, archive, search, i18n, bookmarks, `account/`), `components/`, `pages/`, `styles/`.
- `supabase/` account database migration (RLS) and the sign-in code email template; tested in `src/lib/account/rls.test.ts`.
- `pipeline/signal_pipeline/` collector — `sources.yaml`, fetch, parse, normalize, dedup, brands, images, scoring, picks, translate, store.
- `public/data/` generated JSON (do not hand-edit). `public/images/`, `public/videos/` static assets.
- `.github/workflows/` `ci.yml`, `update-news.yml` (hourly collector), `deploy.yml` (Pages).
- `docs/` charter, architecture, schema, sources, design system, accounts (`ACCOUNTS.md`, `AUTH-SETUP.md`), phases, QA/release.

## Workflow
Nine phases (`docs/phases/`). Each phase: read spec → implement → run gate (`docs/QUALITY-GATES.md`) → record evidence → update `docs/IMPLEMENTATION-STATUS.md` → commit → push. Model/effort guidance: `docs/phases/MODEL-EFFORT-MATRIX.md`.

## Conventions
- TypeScript strict; feed text rendered as plain text only (no `dangerouslySetInnerHTML`); external links `rel="noopener noreferrer"`.
- CSS: tokens in `src/styles/tokens.css`, logical properties for RTL.
- Python: stdlib + `feedparser`, `requests`, `PyYAML`; optional `ctranslate2` + `sentencepiece` for translation. Tests never hit the network.
- Schema changes: bump `SCHEMA_VERSION` in both `src/lib/types.ts` and `pipeline/signal_pipeline/schema.py`; update `docs/DATA-SCHEMA.md`.
