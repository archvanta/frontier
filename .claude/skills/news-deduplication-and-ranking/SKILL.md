---
name: news-deduplication-and-ranking
description: Rules for canonical URLs, duplicate detection, event clustering, deterministic scoring and Daily/Weekly/Monthly picks. Use when touching dedup.py, scoring.py or picks.py.
---

# Dedup and ranking

- **Identity:** `id = sha1(canonical_url)[:16]`. Canonicalisation strips tracking params (`utm_*`, `fbclid`, `gclid`, `ref`…), fragments, default ports, trailing slashes; lowercases host.
- **Duplicates:** same canonical URL → same article. Same source + title similarity ≥ 0.85 within 72 h → duplicate (dropped).
- **Events:** different sources, title-token Jaccard ≥ 0.5 (after stopword removal) within 72 h and sharing at least one significant token beyond brand names → same `eventId`. Brand overlap alone never merges.
- **Corroboration:** count distinct `owner` groups in an event; near-identical titles (≥ 0.85) across sources count once (syndicated press release).
- **Score (0–100):** reliability 30, corroboration 25, recency 20, topic 15, novelty 10 — weights in `pipeline/signal_pipeline/config.py`.
- **Recency** measured against `asOf` = newest stored publication time (not wall clock) so reruns are idempotent.
- **Picks:** one article per event; caps per source/brand/category for diversity; windows daily 24 h, weekly 7 d, monthly 30 d with window-scaled half-life so old stories age out.
- Always add/adjust unit tests in `pipeline/tests/test_scoring.py` / `test_dedup.py`.
