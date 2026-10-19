"""Reads and writes the static JSON dataset in public/data/.

Writes are idempotent: a file is rewritten only when its content changes, and meta.dataUpdatedAt
moves only when some other file actually changed. Day files outside the working window are never
touched or deleted.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from . import config
from .normalize import to_iso
from .schema import SCHEMA_VERSION, ordered_article


def dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=1, separators=(",", ": ")) + "\n"


def write_if_changed(path: Path, text: str) -> bool:
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)
    return True


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def sort_newest_first(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(articles, key=lambda a: (a["publishedAt"], _neg(a["id"])), reverse=True)


def _neg(s: str) -> str:
    # Reverse-sortable id so that, after reverse=True, ties are ordered by ascending id.
    return "".join(chr(0x10FFFF - ord(c)) for c in s)


@dataclass
class Loaded:
    articles: dict[str, dict[str, Any]] = field(default_factory=dict)
    source_state: dict[str, dict[str, Any]] = field(default_factory=dict)
    meta: dict[str, Any] | None = None


class Store:
    def __init__(self, out_dir: Path) -> None:
        self.out = out_dir
        self.days_dir = out_dir / "days"

    def window_start(self, now: datetime) -> str:
        return (now - timedelta(days=config.WORKING_WINDOW_DAYS)).strftime("%Y-%m-%d")

    def load(self, now: datetime) -> Loaded:
        loaded = Loaded()
        start = self.window_start(now)
        if self.days_dir.exists():
            for f in sorted(self.days_dir.glob("*.json")):
                if f.stem < start:
                    continue
                data = read_json(f) or {}
                for a in data.get("articles", []):
                    loaded.articles[a["id"]] = a
        sources = read_json(self.out / "sources.json") or {}
        for s in sources.get("sources", []):
            loaded.source_state[s["id"]] = s
        loaded.meta = read_json(self.out / "meta.json")
        return loaded

    def _archive_index(self, window_counts: dict[str, int], start: str) -> list[dict[str, Any]]:
        previous = {d["day"]: d["count"] for d in (read_json(self.out / "archive-index.json") or {}).get("days", [])}
        counts = dict(window_counts)
        if self.days_dir.exists():
            for f in self.days_dir.glob("*.json"):
                day = f.stem
                if day in counts or day >= start:
                    continue
                counts[day] = previous.get(day) if day in previous else len((read_json(f) or {}).get("articles", []))
        return [{"day": d, "count": c} for d, c in sorted(counts.items(), reverse=True) if c > 0]

    def write(
        self,
        articles: list[dict[str, Any]],
        now: datetime,
        sources: list[dict[str, Any]],
        picks: dict[str, Any] | None,
        translation: dict[str, Any],
    ) -> bool:
        start = self.window_start(now)
        by_day: dict[str, list[dict[str, Any]]] = {}
        for a in articles:
            if a["day"] >= start:
                by_day.setdefault(a["day"], []).append(a)

        changed = False
        for day, items in by_day.items():
            body = {"schemaVersion": SCHEMA_VERSION, "day": day, "articles": [ordered_article(a) for a in sort_newest_first(items)]}
            changed |= write_if_changed(self.days_dir / f"{day}.json", dumps(body))

        index = self._archive_index({d: len(v) for d, v in by_day.items()}, start)
        changed |= write_if_changed(self.out / "archive-index.json", dumps({"schemaVersion": SCHEMA_VERSION, "timezone": "UTC", "days": index}))

        search_start = (now - timedelta(days=config.SEARCH_WINDOW_DAYS)).strftime("%Y-%m-%d")
        entries = []
        for a in sort_newest_first([a for a in articles if a["day"] >= search_start]):
            e = {
                "id": a["id"],
                "d": a["day"],
                "t": a["title"],
                "s": a["sourceId"],
                "sn": a["sourceName"],
                "c": a["category"],
                "b": a.get("brand"),
                "e": a.get("entities", []),
                "x": a.get("excerpt", "")[:160],
                "p": a["publishedAt"],
            }
            fa = (a.get("tr") or {}).get("fa")
            if fa and fa.get("title"):
                e["tf"] = fa["title"]
            entries.append(e)
        changed |= write_if_changed(
            self.out / "search-index.json",
            dumps({"schemaVersion": SCHEMA_VERSION, "windowDays": config.SEARCH_WINDOW_DAYS, "entries": entries}),
        )

        changed |= write_if_changed(self.out / "sources.json", dumps({"schemaVersion": SCHEMA_VERSION, "sources": sources}))
        if picks is not None:
            changed |= write_if_changed(self.out / "picks.json", dumps(picks))

        ok = sum(1 for s in sources if s["status"] == "ok")
        failed = sum(1 for s in sources if s["status"] == "error")
        meta_body = {
            "schemaVersion": SCHEMA_VERSION,
            "timezone": "UTC",
            "articleCount": sum(d["count"] for d in index),
            "dayCount": len(index),
            "latestDay": index[0]["day"] if index else None,
            "sourcesOk": ok,
            "sourcesFailed": failed,
            "translation": translation,
        }
        previous = read_json(self.out / "meta.json") or {}
        prev_body = {k: v for k, v in previous.items() if k != "dataUpdatedAt"}
        if changed or prev_body != meta_body or "dataUpdatedAt" not in previous:
            meta = {"schemaVersion": SCHEMA_VERSION, "dataUpdatedAt": to_iso(now), **{k: v for k, v in meta_body.items() if k != "schemaVersion"}}
            write_if_changed(self.out / "meta.json", dumps(meta))
            return True
        return False


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)
