"""Duplicate detection and cross-source event clustering.

Rules (conservative on purpose):
- Same canonical URL → same article (by id).
- Same source + title similarity ≥ DUP_TITLE_SIMILARITY within the event window → duplicate, dropped.
- Different sources + title similarity ≥ EVENT_TITLE_SIMILARITY within the window, sharing at least one
  significant token that is not a company/brand name → same event. Brand overlap alone never merges.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import datetime
from typing import Any, Iterable

from . import config

STOPWORDS = set(
    """a an the and or but of for to in on at by with from into over under about after before as is are was were be been
    being it its this that these those new now how why what who when where which will can could may might says said say
    just more most than then up down out off via vs versus amid also not no yes you your we our they their he she his her
    using use uses used get gets got make makes made first launches launch launched announces announced introduces
    introducing update updates today week year years day ai""".split()
)

# Names that must not, by themselves, link two stories into one event.
BRAND_TOKENS = {
    "openai", "anthropic", "claude", "google", "gemini", "deepmind", "microsoft", "meta", "nvidia", "apple", "amazon",
    "aws", "mistral", "xai", "grok", "deepseek", "chatgpt", "gpt", "llama", "copilot", "hugging", "face", "huggingface",
}

_TOKEN = re.compile(r"[a-z0-9][a-z0-9.+-]*")


def tokens(title: str) -> set[str]:
    t = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode().lower()
    out = set()
    for tok in _TOKEN.findall(t):
        tok = tok.strip(".-+")
        if len(tok) > 1 and tok not in STOPWORDS:
            out.add(tok)
    return out


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _hours_apart(a: str, b: str) -> float:
    da = datetime.fromisoformat(a.replace("Z", "+00:00"))
    db = datetime.fromisoformat(b.replace("Z", "+00:00"))
    return abs((da - db).total_seconds()) / 3600


def is_same_source_duplicate(new: dict[str, Any], existing: Iterable[dict[str, Any]]) -> bool:
    nt = tokens(new["title"])
    for old in existing:
        if old["sourceId"] != new["sourceId"]:
            continue
        if _hours_apart(old["publishedAt"], new["publishedAt"]) > config.EVENT_WINDOW_HOURS:
            continue
        if jaccard(nt, tokens(old["title"])) >= config.DUP_TITLE_SIMILARITY:
            return True
    return False


def find_event(new: dict[str, Any], existing: Iterable[dict[str, Any]]) -> str | None:
    """Returns the eventId of the best matching story from another source, if any."""
    nt = tokens(new["title"])
    best: tuple[float, str, str] | None = None  # (similarity, publishedAt, eventId)
    for old in existing:
        if old["sourceId"] == new["sourceId"]:
            continue
        if _hours_apart(old["publishedAt"], new["publishedAt"]) > config.EVENT_WINDOW_HOURS:
            continue
        ot = tokens(old["title"])
        shared = (nt & ot) - BRAND_TOKENS
        if not shared:
            continue
        sim = jaccard(nt, ot)
        if sim >= config.EVENT_TITLE_SIMILARITY:
            key = (sim, old["publishedAt"], old["eventId"])
            # Highest similarity wins; ties go to the earliest story, then lowest id, so results are stable.
            if best is None or key[0] > best[0] or (key[0] == best[0] and (key[1], key[2]) < (best[1], best[2])):
                best = key
    return best[2] if best else None


def refresh_related(articles: list[dict[str, Any]]) -> None:
    """Sets `related` to the other members of each article's event, sorted by id."""
    groups: dict[str, list[str]] = {}
    for a in articles:
        groups.setdefault(a["eventId"], []).append(a["id"])
    for a in articles:
        a["related"] = sorted(i for i in groups[a["eventId"]] if i != a["id"])


def syndicated(a: dict[str, Any], b: dict[str, Any]) -> bool:
    """Near-identical headlines across outlets usually mean one press release republished."""
    return jaccard(tokens(a["title"]), tokens(b["title"])) >= config.DUP_TITLE_SIMILARITY
