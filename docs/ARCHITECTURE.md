# Architecture

```
            ┌──────────────── GitHub Actions (hourly, :17) ────────────────┐
 RSS/Atom → │ fetch (allowlist, timeouts, caps) → parse (feedparser)       │
 feeds      │ → normalise (canonical URL, id, UTC dates, plain text)       │
            │ → dedup + event clusters → brand + image resolution          │
            │ → offline translation (optional, new items only)             │
            │ → scoring + picks → write JSON only if changed → git commit  │
            └───────────────┬──────────────────────────────────────────────┘
                            │ workflow_call
                            ▼
            ┌──── deploy.yml ────┐        ┌──────── Browser ────────┐
            │ npm ci, vite build │ ──────▶│ GitHub Pages /SIGNAL_AI/ │
            │ upload + deploy    │        │ static JSON via fetch    │
            └────────────────────┘        └──────────────────────────┘
```

## Frontend (`src/`)
- Vite + React 19 + TypeScript strict. No UI framework; plain CSS with tokens.
- **Routing:** hash routes (`#/`, `#/picks/weekly`, `#/explore?q=`, `#/archive`, `#/day/<d>`, `#/story/<d>/<id>`, `#/saved`, `#/sources`, `#/about`) so deep links survive reloads on Pages (no server rewrites).
- **Data layer** (`lib/data.ts`): fetches `data/*.json` relative to `import.meta.env.BASE_URL`, caches per path, 404 → `null` (empty day). `--mode mock` swaps in a generated, labelled dataset that is never in the live bundle.
- **State:** URL query for filters; `localStorage` for language and bookmarks only.

## Pipeline (`pipeline/signal_pipeline/`)
| Module | Job |
|---|---|
| `config.py` | Weights, windows, limits, paths |
| `sources.py` + `sources.yaml` | Registry and host allowlist |
| `fetch.py` | HTTP with UA, timeout, size cap, retries, per-host spacing, allowlist |
| `parse.py` | feedparser → raw items; HTML → plain text |
| `normalize.py` | Canonical URL, id, dates (UTC), category, entities |
| `dedup.py` | URL + title-similarity dedup, event clustering |
| `brands.py` | Primary-subject detection for Claude/OpenAI/Gemini |
| `images.py` | Feed images, og:image (allowlisted), fallbacks |
| `translate.py` | Optional Argos en→fa via CTranslate2 |
| `scoring.py`, `picks.py` | Deterministic score, pick lists |
| `store.py` | Read/write day files, indexes; idempotent writes |
| `cli.py` | `python -m signal_pipeline collect` |

## Data (`public/data/`)
See `DATA-SCHEMA.md`. Day-partitioned files keep diffs small; indexes are derived each run.

## Time policy
Publication times stored as ISO-8601 UTC. Archive days are UTC dates. The UI displays times in the viewer's local timezone and labels that days are grouped in UTC. Recency is measured against the newest stored publication time so reruns don't churn files.

## Security
No secrets; `GITHUB_TOKEN` only. Fetches limited to allowlisted hosts with size/time caps. All feed text is converted to plain text in the pipeline and rendered as text by React. Only `http(s)` URLs are kept for links/images.
