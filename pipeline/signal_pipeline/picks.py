"""Daily / Weekly / Monthly picks, computed once per collection run and stored in picks.json.

- Windows end at `asOf`: the newest stored publication time, but never earlier than the run time
  rounded down to config.PICKS_CLOCK_STEP_HOURS. Reruns inside one step with no new data produce
  byte-identical output, and when feeds go quiet, stories still age out of their windows instead of
  staying top picks indefinitely. Recency decays with a half-life scaled to each window.
- One story per event (the best-scoring report); the event's independent-voice count is shown.
- Greedy diversity caps per source, per subject (brand or first named company) and per category.
  If the strict pass leaves the list short, only the category cap is relaxed — never the source or
  subject caps, so one company cannot fill a list.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from . import config
from .schema import SCHEMA_VERSION, ordered_article
from .scoring import Scorer, parse_iso
from .sources import Source


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def as_of_time(pool: list[dict[str, Any]], now: datetime) -> datetime:
    step = config.PICKS_CLOCK_STEP_HOURS
    floor = now.replace(hour=now.hour - now.hour % step, minute=0, second=0, microsecond=0)
    times = [t for t in (parse_iso(a["publishedAt"]) for a in pool) if t <= now]
    return max([floor, *times])


def subject_of(a: dict[str, Any]) -> str | None:
    if a.get("brand"):
        return f"brand:{a['brand']}"
    ents = a.get("entities") or []
    return f"entity:{ents[0]}" if ents else None


def reasons(a: dict[str, Any], score: dict[str, Any], voices: int, tier: int, first: bool) -> list[str]:
    out = [f"tier-{tier}"]
    if voices > 1:
        out.append(f"voices-{voices}")
    if first:
        out.append("first-report")
    top = max(score["parts"], key=lambda k: config.WEIGHTS[k] * score["parts"][k])
    out.append(f"top-factor-{top}")
    return out


def select(
    candidates: list[tuple[dict[str, Any], dict[str, Any]]],
    size: int,
    per_source: int,
    per_subject: int,
    per_category: int,
) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    chosen: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for relax_category in (False, True):
        for a, sc in candidates:
            if len(chosen) >= size:
                return chosen
            if any(a["id"] == c["id"] for c, _ in chosen):
                continue
            if sum(c["sourceId"] == a["sourceId"] for c, _ in chosen) >= per_source:
                continue
            subj = subject_of(a)
            if subj and sum(subject_of(c) == subj for c, _ in chosen) >= per_subject:
                continue
            if not relax_category and sum(c["category"] == a["category"] for c, _ in chosen) >= per_category:
                continue
            chosen.append((a, sc))
    return chosen


def build_picks(pool: list[dict[str, Any]], now: datetime, sources: dict[str, Source]) -> dict[str, Any]:
    as_of = as_of_time(pool, now)
    scorer = Scorer(pool, sources)
    windows: dict[str, Any] = {}
    for name, w in config.PICK_WINDOWS.items():
        start = as_of - timedelta(hours=w["hours"])
        in_window = [a for a in pool if start < parse_iso(a["publishedAt"]) <= as_of]
        scored = [(a, scorer.score(a, as_of, w["half_life_hours"])) for a in in_window]
        # Best report per event.
        best: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {}
        for a, sc in scored:
            ev = a["eventId"] or a["id"]
            cur = best.get(ev)
            if cur is None or (sc["total"], a["publishedAt"], _rev(a["id"])) > (cur[1]["total"], cur[0]["publishedAt"], _rev(cur[0]["id"])):
                best[ev] = (a, sc)
        ranked = sorted(best.values(), key=lambda p: (-p[1]["total"], _neg_time(p[0]["publishedAt"]), p[0]["id"]))
        chosen = select(ranked, w["size"], w["per_source"], w["per_subject"], w["per_category"])
        picks = []
        for rank, (a, sc) in enumerate(chosen, start=1):
            ev = a["eventId"] or a["id"]
            voices = scorer.voices(a)
            article = ordered_article({**a, "score": sc})
            picks.append({
                "article": article,
                "rank": rank,
                "sources": voices,
                "reason": reasons(a, sc, voices, scorer.tier(a), scorer.events[ev].first_id == a["id"]),
            })
        windows[name] = {"from": _iso(start), "to": _iso(as_of), "halfLifeHours": w["half_life_hours"], "picks": picks}
    return {"schemaVersion": SCHEMA_VERSION, "asOf": _iso(as_of), "weights": dict(config.WEIGHTS), "windows": windows}


def _rev(s: str) -> str:
    # Lower id wins ties when comparing with ">".
    return "".join(chr(0x10FFFF - ord(c)) for c in s)


def _neg_time(iso: str) -> float:
    return -parse_iso(iso).timestamp()


class PicksStep:
    def __init__(self, sources: list[Source]) -> None:
        self.sources = {s.id: s for s in sources}

    def __call__(self, pool: list[dict[str, Any]], now: datetime) -> dict[str, Any]:
        return build_picks(pool, now, self.sources)
