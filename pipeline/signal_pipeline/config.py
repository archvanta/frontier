"""Tunable constants. Weights and windows are documented in docs/ARCHITECTURE.md and the Method page."""
from __future__ import annotations

USER_AGENT = (
    "SIGNAL-AI-NewsBot/1.0 (+https://github.com/sadeghimohammadamin83-ship-it/frontier; "
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
SECTION_WINDOW_DAYS = 90    # topic sections (data/sections/*.json) cover this many days
SECTION_MAX_STORIES = 60    # newest stories written per section file
WORKING_WINDOW_DAYS = 90    # day files loaded into memory each run (older files are left untouched)

# Scoring (Phase 6). Every factor is normalised to 0–100; the total is the weighted sum.
WEIGHTS = {
    "reliability": 0.30,
    "corroboration": 0.25,
    "recency": 0.20,
    "topic": 0.15,
    "novelty": 0.10,
}
# Source tier (sources.yaml) → reliability factor. An editorial prior, not a truth rating.
TIER_RELIABILITY = {1: 100, 2: 80, 3: 60, 4: 40}
# Topic importance per category (editable editorial weights).
TOPIC_WEIGHTS = {
    "models": 100,
    "safety": 90,
    "policy": 85,
    "research": 80,
    "open-source": 75,
    "hardware": 70,
    "products": 65,
    "business": 55,
}
NOVELTY_LOOKBACK_DAYS = 7     # a story is compared with other events from this many days before it
NOVELTY_FOLLOW_UP = 0.5       # multiplier for later reports of an event that was already covered

# Card art for Claude/OpenAI/Gemini primary-topic stories (public/images/ai-brands/). Off by the
# owner's request (2026-10-19): those stories show their own source image like every other story.
# The artwork files stay in the repository; set True to bring them back (stored stories follow).
BRAND_ART_ENABLED = False

PICKS_CLOCK_STEP_HOURS = 6     # picks advance at least this often even when no new stories arrive

# Pick windows: length, recency half-life (scaled to the window), list size and diversity caps.
PICK_WINDOWS = {
    "daily": {"hours": 24, "half_life_hours": 12, "size": 6, "per_source": 2, "per_subject": 2, "per_category": 3},
    "weekly": {"hours": 24 * 7, "half_life_hours": 72, "size": 8, "per_source": 2, "per_subject": 3, "per_category": 3},
    "monthly": {"hours": 24 * 30, "half_life_hours": 240, "size": 10, "per_source": 3, "per_subject": 3, "per_category": 4},
}
