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
| `scoring.py`, `picks.py` | Deterministic score, pick lists (see “Ranking” below) |
| `store.py` | Read/write day files, indexes; idempotent writes |
| `cli.py` | `python -m signal_pipeline collect` |

## Data (`public/data/`)
See `DATA-SCHEMA.md`. Day-partitioned files keep diffs small; indexes are derived each run.

## Time policy
Publication times stored as ISO-8601 UTC. Archive days are UTC dates. The UI displays times in the viewer's local timezone and labels that days are grouped in UTC. Recency is measured against the newest stored publication time so reruns don't churn files.

## Security
No secrets; `GITHUB_TOKEN` only. Fetches limited to allowlisted hosts with size/time caps. All feed text is converted to plain text in the pipeline and rendered as text by React. Only `http(s)` URLs are kept for links/images.

## Ranking (Phase 6)
All constants live in `pipeline/signal_pipeline/config.py` and are editable.

| Factor (0–100) | Weight | How it is measured |
|---|---|---|
| Source reliability | 30% | Tier in `sources.yaml`: 1 → 100, 2 → 80, 3 → 60, 4 → 40. An editorial prior, not a truth rating. |
| Independent corroboration | 25% | Independent voices covering the event: distinct `owner`s, and near-identical headlines (a republished press release) count once. 1 → 0, 2 → 50, 3 → 75, 4 → 87.5 … |
| Recency | 20% | `100 × 0.5^(age / half-life)`; half-life 12 h (daily), 72 h (weekly), 240 h (monthly), measured against `asOf`. |
| Topic importance | 15% | Category weight: models 100, safety 90, policy 85, research 80, open-source 75, hardware 70, products 65, business 55. |
| Event novelty | 10% | `100 × (1 − highest headline similarity to other events of the previous 7 days)`, halved for later reports of an event someone else broke. |

Picks: windows of 24 h / 7 d / 30 d ending at `asOf` (newest stored story, but at least the run time rounded down to 6 h, so stories age out even when feeds go quiet); one story per event; 6 / 8 / 10 picks; caps per source (2/2/3), per subject — brand or first named company — (2/3/3) and per category (3/3/4). If the list is short, only the category cap is relaxed. Ties break on newer publication time, then id, so the output is deterministic.
