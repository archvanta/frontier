"""Deterministic, explainable importance score. No model calls, no popularity data.

Each factor is normalised to 0–100 and combined with config.WEIGHTS:
- reliability   — source tier from the editable registry (an editorial prior, not a truth rating)
- corroboration — independent voices covering the same event: distinct owners, with near-identical
                  syndicated headlines (one press release republished) counted once; 1 voice → 0,
                  2 → 50, 3 → 75, 4 → 87.5 …
- recency       — exponential decay with a half-life chosen per pick window, measured against `as_of`
- topic         — editable category weight
- novelty       — how different the headline is from other events of the previous days, halved for
                  follow-up reports of an event that another story already broke
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from . import config
from .dedup import jaccard, syndicated, tokens
from .sources import Source


def parse_iso(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def reliability(tier: int) -> float:
    return float(config.TIER_RELIABILITY.get(tier, min(config.TIER_RELIABILITY.values())))


def corroboration(voices: int) -> float:
    return 0.0 if voices <= 1 else 100.0 * (1 - 0.5 ** (voices - 1))


def recency(age_hours: float, half_life_hours: float) -> float:
    return 100.0 * 0.5 ** (max(age_hours, 0.0) / half_life_hours)


def topic(category: str) -> float:
    return float(config.TOPIC_WEIGHTS.get(category, min(config.TOPIC_WEIGHTS.values())))


def total(parts: dict[str, float], weights: dict[str, float] | None = None) -> float:
    w = weights or config.WEIGHTS
    return round(sum(w[k] * parts[k] for k in w), 1)


def independent_voices(members: list[dict[str, Any]], owners: dict[str, str]) -> int:
    """Counts distinct owners; a story whose headline is a near-copy of an already counted one adds nothing."""
    counted: list[dict[str, Any]] = []
    seen_owners: set[str] = set()
    for a in sorted(members, key=lambda x: (x["publishedAt"], x["id"])):
        owner = owners.get(a["sourceId"], a["sourceId"])
        if owner in seen_owners or any(syndicated(a, c) for c in counted):
            continue
        seen_owners.add(owner)
        counted.append(a)
    return max(len(counted), 1)


@dataclass
class EventFacts:
    voices: int
    first_id: str


class Scorer:
    """Precomputes the time-independent factors for a pool of stored articles."""

    def __init__(self, pool: list[dict[str, Any]], sources: dict[str, Source]) -> None:
        self.sources = sources
        owners = {sid: s.owner for sid, s in sources.items()}
        events: dict[str, list[dict[str, Any]]] = {}
        for a in pool:
            events.setdefault(a["eventId"] or a["id"], []).append(a)
        self.events = {
            eid: EventFacts(independent_voices(members, owners), min(members, key=lambda x: (x["publishedAt"], x["id"]))["id"])
            for eid, members in events.items()
        }
        # Novelty is computed lazily: only stories that fall inside a pick window need it.
        self._ordered = sorted(pool, key=lambda x: (x["publishedAt"], x["id"]))
        self._index = {a["id"]: i for i, a in enumerate(self._ordered)}
        self._times = [parse_iso(a["publishedAt"]) for a in self._ordered]
        self._tokens: dict[str, set[str]] = {}
        self._novelty: dict[str, float] = {}

    def _toks(self, a: dict[str, Any]) -> set[str]:
        if a["id"] not in self._tokens:
            self._tokens[a["id"]] = tokens(a["title"])
        return self._tokens[a["id"]]

    def novelty(self, a: dict[str, Any]) -> float:
        if a["id"] in self._novelty:
            return self._novelty[a["id"]]
        i = self._index[a["id"]]
        start = self._times[i] - timedelta(days=config.NOVELTY_LOOKBACK_DAYS)
        ev = a["eventId"] or a["id"]
        sim = 0.0
        for j in range(i - 1, -1, -1):
            if self._times[j] < start:
                break
            b = self._ordered[j]
            if (b["eventId"] or b["id"]) != ev:
                sim = max(sim, jaccard(self._toks(a), self._toks(b)))
        value = 100.0 * (1 - sim)
        if self.events[ev].first_id != a["id"]:
            value *= config.NOVELTY_FOLLOW_UP
        self._novelty[a["id"]] = value
        return value

    def tier(self, a: dict[str, Any]) -> int:
        src = self.sources.get(a["sourceId"])
        return src.tier if src else max(config.TIER_RELIABILITY)

    def voices(self, a: dict[str, Any]) -> int:
        return self.events[a["eventId"] or a["id"]].voices

    def score(self, a: dict[str, Any], as_of: datetime, half_life_hours: float) -> dict[str, Any]:
        age = (as_of - parse_iso(a["publishedAt"])).total_seconds() / 3600
        parts = {
            "reliability": reliability(self.tier(a)),
            "corroboration": corroboration(self.voices(a)),
            "recency": recency(age, half_life_hours),
            "topic": topic(a["category"]),
            "novelty": self.novelty(a),
        }
        parts = {k: round(v, 1) for k, v in parts.items()}
        return {"total": total(parts), "parts": parts, "asOf": as_of.strftime("%Y-%m-%dT%H:%M:%SZ")}
