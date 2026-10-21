# Data schema (v3)

TypeScript source of truth: `src/lib/types.ts`. Python mirror: `pipeline/signal_pipeline/schema.py`. Bump `SCHEMA_VERSION` in both and record the change here.

## Files in `public/data/`
| File | Content |
|---|---|
| `meta.json` | `dataUpdatedAt` (last time stored data changed), counts, `latestDay`, source ok/failed counts, translation stats, `timezone: "UTC"` |
| `archive-index.json` | `days: [{day, count}]`, newest first |
| `days/YYYY-MM-DD.json` | `{day, articles: Article[]}` newest first |
| `picks.json` | `asOf`, `weights`, `windows.{daily,weekly,monthly}.{from,to,halfLifeHours,picks[{article,rank,sources,reason[]}]}`; each pick embeds the article with its `score` for that window |
| `sources.json` | registry + health (`status`, `verifiedOn`, `lastError`, `items`) |
| `search-index.json` | compact entries for the last `windowDays` (90) days |
| `sections/<id>.json` | v2. Topic sections `ai-games` and `data-centers` (and, since v3, `videos`: every story with a playable `video`, whatever its source): `{section, windowDays, total, articles: Article[]}`, newest first, at most `SECTION_MAX_STORIES` (60). A story joins when its source lists the section in `sources.yaml` (`sections:`), or its headline/summary matches the section rule in `pipeline/signal_pipeline/sections.py`. A story keeps its category; sections are not categories. |

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
| `video` | v3, optional. A video the site plays in the page: `{provider: "youtube", id, url}` (11-character YouTube id; played via `youtube-nocookie.com/embed/<id>` after a click) or `{provider: "file", url, type}` (https `video/mp4|webm|ogg` the feed offers). References only, nothing is downloaded. Absent when the item has no video. |
| `sourceImage` | genuine source image when brand art replaced the thumbnail (only while `BRAND_ART_ENABLED` is on) |
| `eventId`, `related` | cross-source event cluster |
| `score` | `{total, parts{reliability, corroboration, recency, topic, novelty}, asOf}` — only on articles inside `picks.json` (recency depends on the window); day files carry no score, so they do not churn as time passes |
| `tr.fa` | `{title, excerpt, engine, at}` offline machine translation; original fields are never overwritten |

## Evolution
- v1 (2026-10-19): initial schema.

**v2 (2026-10-20):** added `sections/<id>.json` and the optional `sections` field of a source in `sources.yaml`. Additive: existing files keep their shape; the version number moves on the next collector run.

**v3 (2026-10-21):** added the optional `video` field of an article, the `videos` section file and the optional `expect_title` field of a source in `sources.yaml`. Additive: stories without a video keep their shape; the version number moves on the next collector run.
