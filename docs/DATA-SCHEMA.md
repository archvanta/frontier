# Data schema (v1)

TypeScript source of truth: `src/lib/types.ts`. Python mirror: `pipeline/signal_pipeline/schema.py`. Bump `SCHEMA_VERSION` in both and record the change here.

## Files in `public/data/`
| File | Content |
|---|---|
| `meta.json` | `dataUpdatedAt` (last time stored data changed), counts, `latestDay`, source ok/failed counts, translation stats, `timezone: "UTC"` |
| `archive-index.json` | `days: [{day, count}]`, newest first |
| `days/YYYY-MM-DD.json` | `{day, articles: Article[]}` newest first |
| `picks.json` | `asOf`, `weights`, `windows.{daily,weekly,monthly}.{from,to,picks[]}` |
| `sources.json` | registry + health (`status`, `verifiedOn`, `lastError`, `items`) |
| `search-index.json` | compact entries for the last `windowDays` (90) days |

## Article
| Field | Notes |
|---|---|
| `id` | `sha1(canonicalUrl)[:16]` — stable |
| `url` | canonical source URL (tracking params removed) |
| `sourceId`, `sourceName` | from the registry |
| `title`, `excerpt` | plain text; excerpt ≤ 400 chars from the feed summary — never full article text |
| `lang` | source language |
| `publishedAt` | ISO UTC; if missing/invalid/future → `fetchedAt` and `dateEstimated: true` |
| `fetchedAt` | first time the pipeline saw the item; never changes |
| `day` | UTC date of `publishedAt` |
| `category`, `tags`, `entities` | keyword rules; `entities` lists companies detected (`openai`, `anthropic`, `google`, …) |
| `brand` | `claude` / `openai` / `gemini` / `null` — primary-subject rule |
| `image` | `{url, kind: feed|og|brand|fallback, alt, credit, sourceUrl}` |
| `sourceImage` | genuine source image when brand art replaced the thumbnail |
| `eventId`, `related` | cross-source event cluster |
| `score` | `{total, parts{reliability, corroboration, recency, topic, novelty}, asOf}` |
| `tr.fa` | `{title, excerpt, engine, at}` offline machine translation; original fields are never overwritten |

## Evolution
- v1 (2026-10-19): initial schema.
