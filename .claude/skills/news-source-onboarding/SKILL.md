---
name: news-source-onboarding
description: Add or change a news source in pipeline/sources.yaml safely and honestly mark verification. Use when adding feeds or when a feed starts failing.
---

# News source onboarding

1. Prefer official RSS/Atom feeds. Check the publisher's terms/robots for feed reuse; note them in `notes`.
2. Add an entry to `pipeline/sources.yaml`: `id, name, homepage, feed, kind, tier (1–4), lang, category, enabled, filter (ai|none), max_items, og_image (bool), notes`.
3. The feed host is automatically added to the fetch allowlist; article hosts for og:image must be listed in `og_hosts`.
4. Add a fixture feed under `pipeline/tests/fixtures/` if the format is unusual, plus a parser test.
5. Do NOT set the source as verified by hand. It becomes verified (`verifiedOn`) only when a real pipeline run fetched and parsed it.
6. Update `docs/SOURCE-REGISTER.md` from `public/data/sources.json` after the next real run.
