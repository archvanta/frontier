# Source register

The machine-readable registry is `pipeline/signal_pipeline/sources.yaml`. Live health (status, first verified day, last error) is published by every run in `public/data/sources.json` and shown on the site's **Sources** page.

## Verification policy
- **Candidate**: listed in the registry, URL taken from the publisher's own site or well-known feed path, not yet fetched by a real run.
- **Verified**: a real pipeline run fetched and parsed the feed (`verifiedOn` in `sources.json`). Only the pipeline sets this.
- The build container used during development could not reach these hosts (egress proxy), except the GitHub-hosted Anthropic mirror, which was fetched and parsed locally on 2026-10-19 (11 stories in the last 30 days). Every other feed was checked on GitHub's runners in the first Actions run (table below).

## Tiers (reliability input to ranking, not a truth rating)
1 official/primary publisher or academic lab · 2 major reputable newsroom or a faithful mirror of an official source · 3 specialist outlet or preprint server · 4 community.

## Corroboration
`owner` groups sister outlets (e.g. WIRED and Ars Technica are both Condé Nast; Google, DeepMind and Google Research are all Google) so they count as one voice.

## Terms notes
Only headline, link, publication time, a ≤400-character feed excerpt and feed-supplied image URLs are stored; every card links to the original. og:image lookups are limited to hosts listed in `og_hosts` (currently anthropic.com and huggingface.co) and only for new items without a feed image. The Anthropic feed is a third-party open-source mirror (github.com/Olshansk/rss-feeds) because Anthropic does not publish RSS.

## Registry and first live run
First GitHub Actions run (2026-10-19 19:13 UTC): 18 of 23 feeds OK, 215 stories stored, 149 headlines translated to Persian. Status below is from that run's `sources.json`, with the action taken for each failure.

| ID | Source | Kind | Tier | Owner | Filter | Feed | Status |
|---|---|---|---|---|---|---|---|
| `openai-news` | [OpenAI News](https://openai.com/news/) | official | 1 | openai | none | `https://openai.com/news/rss.xml` | verified 2026-10-19 |
| `anthropic-news` | [Anthropic News (community mirror)](https://www.anthropic.com/news) | community | 2 | anthropic | none | `https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml` | verified 2026-10-19 |
| `google-ai-blog` | [Google — The Keyword (AI)](https://blog.google/technology/ai/) | official | 1 | google | none | `https://blog.google/technology/ai/rss/` | verified 2026-10-19 |
| `google-deepmind` | [Google DeepMind Blog](https://deepmind.google/discover/blog/) | official | 1 | google | none | `https://deepmind.google/blog/rss.xml` | verified 2026-10-19 |
| `google-research` | [Google Research Blog](https://research.google/blog/) | research | 1 | google | none | `https://research.google/blog/rss/` | verified 2026-10-19 |
| `microsoft-ai` | [Microsoft AI Blog](https://blogs.microsoft.com/ai/) | official | 1 | microsoft | none | `https://blogs.microsoft.com/ai/feed/` | failed: HTTP 410 — feed gone (HTTP 410); disabled |
| `nvidia-blog` | [NVIDIA Blog](https://blogs.nvidia.com/) | official | 1 | nvidia | ai | `https://blogs.nvidia.com/feed/` | verified 2026-10-19 |
| `aws-ml` | [AWS Machine Learning Blog](https://aws.amazon.com/blogs/machine-learning/) | official | 1 | amazon | none | `https://aws.amazon.com/blogs/machine-learning/feed/` | verified 2026-10-19 |
| `huggingface-blog` | [Hugging Face Blog](https://huggingface.co/blog) | official | 1 | huggingface | none | `https://huggingface.co/blog/feed.xml` | verified 2026-10-19 |
| `github-blog-ai` | [GitHub Blog — AI & ML](https://github.blog/ai-and-ml/) | official | 1 | microsoft | none | `https://github.blog/ai-and-ml/feed/` | verified 2026-10-19 |
| `bair` | [Berkeley AI Research (BAIR) Blog](https://bair.berkeley.edu/blog/) | research | 1 | berkeley | none | `https://bair.berkeley.edu/blog/feed.xml` | verified 2026-10-19 |
| `mit-news-ai` | [MIT News — Artificial intelligence](https://news.mit.edu/topic/artificial-intelligence2) | research | 1 | mit | none | `https://news.mit.edu/rss/topic/artificial-intelligence2` | verified 2026-10-19 |
| `arxiv-cs-ai` | [arXiv cs.AI (new submissions)](https://arxiv.org/list/cs.AI/recent) | research | 3 | arxiv | none | `https://rss.arxiv.org/rss/cs.AI` | failed: parse error: no entries (empty feed) — valid feed with no items that day; empty feeds are now treated as healthy |
| `techcrunch-ai` | [TechCrunch AI](https://techcrunch.com/category/artificial-intelligence/) | media | 2 | yahoo | none | `https://techcrunch.com/category/artificial-intelligence/feed/` | verified 2026-10-19 |
| `verge-ai` | [The Verge — AI](https://www.theverge.com/ai-artificial-intelligence) | media | 2 | vox-media | none | `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml` | verified 2026-10-19 |
| `ars-ai` | [Ars Technica — AI](https://arstechnica.com/ai/) | media | 2 | conde-nast | none | `https://arstechnica.com/ai/feed/` | verified 2026-10-19 |
| `wired-ai` | [WIRED — AI](https://www.wired.com/tag/ai/) | media | 2 | conde-nast | none | `https://www.wired.com/feed/tag/ai/latest/rss` | verified 2026-10-19 |
| `mit-tech-review-ai` | [MIT Technology Review — AI](https://www.technologyreview.com/topic/artificial-intelligence/) | media | 2 | mit-technology-review | none | `https://www.technologyreview.com/topic/artificial-intelligence/feed` | verified 2026-10-19 |
| `venturebeat-ai` | [VentureBeat AI](https://venturebeat.com/category/ai/) | media | 3 | venturebeat | none | `https://venturebeat.com/category/ai/feed/` | failed: HTTP 429 — rate limited (HTTP 429); kept and retried each run |
| `guardian-ai` | [The Guardian — Artificial intelligence](https://www.theguardian.com/technology/artificialintelligenceai) | media | 2 | guardian | none | `https://www.theguardian.com/technology/artificialintelligenceai/rss` | failed: HTTP 404 — feed URL corrected to the `artificialintelligenceai` tag; re-checked on the next run |
| `the-decoder` | [The Decoder](https://the-decoder.com/) | media | 3 | the-decoder | none | `https://the-decoder.com/feed/` | verified 2026-10-19 |
| `ai-news` | [AI News (TechForge)](https://www.artificialintelligence-news.com/) | media | 3 | techforge | none | `https://www.artificialintelligence-news.com/feed/` | failed: HTTP 403 — blocks the collector (HTTP 403); disabled |
| `simon-willison` | [Simon Willison's Weblog](https://simonwillison.net/) | community | 3 | simon-willison | ai | `https://simonwillison.net/atom/entries/` | verified 2026-10-19 |

### Section sources (added 2026-10-20)
Feeds for the AI Games and Data Centers sections. All use `filter: ai`, so the main AI news feed stays AI-only, and none is marked verified until a real collector run fetches it (the first run on Actions sets `verifiedOn`; a failing feed is reported on the Sources page like any other). The build container could not reach these hosts, so the URLs come from each publisher's own feed advertisement or a public feed directory and still need that first run.

| ID | Source | Tier | Section | Feed | Status |
|---|---|---|---|---|---|
| `game-developer` | [Game Developer](https://www.gamedeveloper.com/) | 3 | ai-games | `https://www.gamedeveloper.com/rss.xml` | not yet run |
| `gamesindustry-biz` | [GamesIndustry.biz](https://www.gamesindustry.biz/) | 3 | ai-games | `https://www.gamesindustry.biz/feed/news` | not yet run |
| `verge-games` | [The Verge — Gaming](https://www.theverge.com/games) | 2 | ai-games | `https://www.theverge.com/rss/games/index.xml` | not yet run |
| `pc-gamer` | [PC Gamer](https://www.pcgamer.com/) | 3 | by keyword | `https://www.pcgamer.com/rss/` | not yet run |
| `rock-paper-shotgun` | [Rock Paper Shotgun](https://www.rockpapershotgun.com/) | 3 | by keyword | `https://www.rockpapershotgun.com/feed` | not yet run |
| `datacenter-dynamics` | [DatacenterDynamics](https://www.datacenterdynamics.com/en/) | 3 | data-centers | `https://www.datacenterdynamics.com/en/rss/` | not yet run |
| `datacenter-knowledge` | [Data Center Knowledge](https://www.datacenterknowledge.com/) | 3 | data-centers | `https://www.datacenterknowledge.com/rss.xml` | not yet run |
| `register-datacentre` | [The Register — Data Centre](https://www.theregister.com/data_centre/) | 2 | data-centers | `https://www.theregister.com/data_centre/headlines.atom` | not yet run |

