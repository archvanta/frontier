"""Tunable constants. Weights and windows are documented in docs/ARCHITECTURE.md and the Method page."""
from __future__ import annotations

USER_AGENT = (
    "SIGNAL-AI-NewsBot/1.0 (+https://github.com/sadeghimohammadamin83-ship-it/SIGNAL_AI; "
    "static AI news digest; respects robots and source terms)"
)

# Fetching
FETCH_TIMEOUT_S = 15
FETCH_MAX_BYTES = 3_000_000
FETCH_RETRIES = 2
FETCH_BACKOFF_S = 1.5
FETCH_HOST_SPACING_S = 1.0
MAX_REDIRECTS = 5

# Ingestion
MAX_ITEMS_PER_SOURCE = 30
MAX_AGE_DAYS = 30           # ignore feed items older than this when first seen
FUTURE_TOLERANCE_S = 3600   # publication dates further in the future are treated as invalid
EXCERPT_MAX_CHARS = 400
TITLE_MAX_CHARS = 300

# Dedup / events
DUP_TITLE_SIMILARITY = 0.85
EVENT_TITLE_SIMILARITY = 0.5
EVENT_WINDOW_HOURS = 72

# Output
SEARCH_WINDOW_DAYS = 90
WORKING_WINDOW_DAYS = 90    # day files loaded into memory each run (older files are left untouched)

# Scoring (Phase 6)
WEIGHTS = {
    "reliability": 0.30,
    "corroboration": 0.25,
    "recency": 0.20,
    "topic": 0.15,
    "novelty": 0.10,
}
