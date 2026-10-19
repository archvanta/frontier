# Source register

The machine-readable registry is `pipeline/signal_pipeline/sources.yaml`. Live health (status, first verified day, last error) is published by every run in `public/data/sources.json` and shown on the site's **Sources** page.

## Verification policy
- **Candidate**: listed in the registry, URL taken from the publisher's own site or well-known feed path, not yet fetched by a real run.
- **Verified**: a real pipeline run fetched and parsed the feed (`verifiedOn` in `sources.json`). Only the pipeline sets this.
- The build container used during development could not reach these hosts (egress proxy), except the GitHub-hosted Anthropic mirror, which was fetched and parsed locally on 2026-10-19 (11 stories in the last 30 days). Every other feed is verified on GitHub's runners — see the table update below after the first Actions run.

## Tiers (reliability input to ranking, not a truth rating)
1 official/primary publisher or academic lab · 2 major reputable newsroom or a faithful mirror of an official source · 3 specialist outlet or preprint server · 4 community.

## Corroboration
`owner` groups sister outlets (e.g. WIRED and Ars Technica are both Condé Nast; Google, DeepMind and Google Research are all Google) so they count as one voice.

## Terms notes
Only headline, link, publication time, a ≤400-character feed excerpt and feed-supplied image URLs are stored; every card links to the original. og:image lookups are limited to hosts listed in `og_hosts` (currently anthropic.com and huggingface.co) and only for new items without a feed image. The Anthropic feed is a third-party open-source mirror (github.com/Olshansk/rss-feeds) because Anthropic does not publish RSS.

## Registry (initial)
| ID | Source | Kind | Tier | Owner | Filter | Feed | Status |
|---|---|---|---|---|---|---|---|
| `openai-news` | [OpenAI News](https://openai.com/news/) | official | 1 | openai | none | `https://openai.com/news/rss.xml` | candidate — not yet verified |
| `anthropic-news` | [Anthropic News (community mirror)](https://www.anthropic.com/news) | community | 2 | anthropic | none | `https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml` | candidate — not yet verified |
| `google-ai-blog` | [Google — The Keyword (AI)](https://blog.google/technology/ai/) | official | 1 | google | none | `https://blog.google/technology/ai/rss/` | candidate — not yet verified |
| `google-deepmind` | [Google DeepMind Blog](https://deepmind.google/discover/blog/) | official | 1 | google | none | `https://deepmind.google/blog/rss.xml` | candidate — not yet verified |
| `google-research` | [Google Research Blog](https://research.google/blog/) | research | 1 | google | none | `https://research.google/blog/rss/` | candidate — not yet verified |
| `microsoft-ai` | [Microsoft AI Blog](https://blogs.microsoft.com/ai/) | official | 1 | microsoft | none | `https://blogs.microsoft.com/ai/feed/` | candidate — not yet verified |
| `nvidia-blog` | [NVIDIA Blog](https://blogs.nvidia.com/) | official | 1 | nvidia | ai | `https://blogs.nvidia.com/feed/` | candidate — not yet verified |
| `aws-ml` | [AWS Machine Learning Blog](https://aws.amazon.com/blogs/machine-learning/) | official | 1 | amazon | none | `https://aws.amazon.com/blogs/machine-learning/feed/` | candidate — not yet verified |
| `huggingface-blog` | [Hugging Face Blog](https://huggingface.co/blog) | official | 1 | huggingface | none | `https://huggingface.co/blog/feed.xml` | candidate — not yet verified |
| `github-blog-ai` | [GitHub Blog — AI & ML](https://github.blog/ai-and-ml/) | official | 1 | microsoft | none | `https://github.blog/ai-and-ml/feed/` | candidate — not yet verified |
| `bair` | [Berkeley AI Research (BAIR) Blog](https://bair.berkeley.edu/blog/) | research | 1 | berkeley | none | `https://bair.berkeley.edu/blog/feed.xml` | candidate — not yet verified |
| `mit-news-ai` | [MIT News — Artificial intelligence](https://news.mit.edu/topic/artificial-intelligence2) | research | 1 | mit | none | `https://news.mit.edu/rss/topic/artificial-intelligence2` | candidate — not yet verified |
| `arxiv-cs-ai` | [arXiv cs.AI (new submissions)](https://arxiv.org/list/cs.AI/recent) | research | 3 | arxiv | none | `https://rss.arxiv.org/rss/cs.AI` | candidate — not yet verified |
| `techcrunch-ai` | [TechCrunch AI](https://techcrunch.com/category/artificial-intelligence/) | media | 2 | yahoo | none | `https://techcrunch.com/category/artificial-intelligence/feed/` | candidate — not yet verified |
| `verge-ai` | [The Verge — AI](https://www.theverge.com/ai-artificial-intelligence) | media | 2 | vox-media | none | `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml` | candidate — not yet verified |
| `ars-ai` | [Ars Technica — AI](https://arstechnica.com/ai/) | media | 2 | conde-nast | none | `https://arstechnica.com/ai/feed/` | candidate — not yet verified |
| `wired-ai` | [WIRED — AI](https://www.wired.com/tag/ai/) | media | 2 | conde-nast | none | `https://www.wired.com/feed/tag/ai/latest/rss` | candidate — not yet verified |
| `mit-tech-review-ai` | [MIT Technology Review — AI](https://www.technologyreview.com/topic/artificial-intelligence/) | media | 2 | mit-technology-review | none | `https://www.technologyreview.com/topic/artificial-intelligence/feed` | candidate — not yet verified |
| `venturebeat-ai` | [VentureBeat AI](https://venturebeat.com/category/ai/) | media | 3 | venturebeat | none | `https://venturebeat.com/category/ai/feed/` | candidate — not yet verified |
| `guardian-ai` | [The Guardian — Artificial intelligence](https://www.theguardian.com/technology/artificialintelligence) | media | 2 | guardian | none | `https://www.theguardian.com/technology/artificialintelligence/rss` | candidate — not yet verified |
| `the-decoder` | [The Decoder](https://the-decoder.com/) | media | 3 | the-decoder | none | `https://the-decoder.com/feed/` | candidate — not yet verified |
| `ai-news` | [AI News (TechForge)](https://www.artificialintelligence-news.com/) | media | 3 | techforge | none | `https://www.artificialintelligence-news.com/feed/` | candidate — not yet verified |
| `simon-willison` | [Simon Willison's Weblog](https://simonwillison.net/) | community | 3 | simon-willison | ai | `https://simonwillison.net/atom/entries/` | candidate — not yet verified |
