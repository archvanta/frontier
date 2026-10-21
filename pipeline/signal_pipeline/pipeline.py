"""Orchestrates one collection run: fetch → parse → normalise → dedup → enrich → score → write."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Iterable

from . import config
from .dedup import find_event, is_same_source_duplicate, refresh_related
from .fetch import Fetcher
from .normalize import ENTITY_PATTERNS, article_id, canonical_url, categorize, detect_entities, looks_ai_related, parse_published, to_iso
from .parse import FeedError, RawItem, parse_feed_titled
from .sections import build_sections
from .sources import Source
from .store import Store
from .text import clean_excerpt, html_to_text, tidy_excerpt, truncate
from .video import find_video

Enricher = Callable[[list[dict[str, Any]], list[dict[str, Any]], dict[str, Source], datetime], None]


@dataclass
class RunReport:
    added: int = 0
    changed: bool = False
    sources: list[dict[str, Any]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


def build_article(item: RawItem, src: Source, now: datetime) -> dict[str, Any] | None:
    """Normalises one feed item, or returns None when it must be skipped."""
    try:
        url = canonical_url(item.link)
    except ValueError:
        return None
    title = truncate(html_to_text(item.title), config.TITLE_MAX_CHARS)
    if not title:
        return None
    excerpt = clean_excerpt(item.summary_html or item.content_html, config.EXCERPT_MAX_CHARS)
    if excerpt.strip(" .…").lower() == title.strip(" .…").lower():
        excerpt = ""
    if src.filter == "ai" and not looks_ai_related(title, excerpt):
        return None
    published = parse_published(item.published_parsed, item.published_raw, now)
    estimated = published is None
    when = published or now
    if when < now - timedelta(days=config.MAX_AGE_DAYS):
        return None
    video = find_video(item.video_id, item.link, item.media, item.content_html or item.summary_html)
    tags = []
    for t in item.tags[:6]:
        clean = html_to_text(t)[:40].strip()
        if clean and clean.lower() not in tags:
            tags.append(clean.lower())
    article: dict[str, Any] = {
        "id": article_id(url),
        "url": url,
        "sourceId": src.id,
        "sourceName": src.name,
        "title": title,
        "excerpt": excerpt,
        "lang": src.lang,
        "publishedAt": to_iso(when),
        "dateEstimated": estimated,
        "fetchedAt": to_iso(now),
        "day": when.strftime("%Y-%m-%d"),
        "category": categorize(title, excerpt, src.category),
        "tags": tags,
        # The publisher itself counts as an entity (an Anthropic post is about Anthropic even if the title doesn't say so).
        "entities": sorted(set(detect_entities(title, excerpt)) | ({src.owner} & set(ENTITY_PATTERNS))),
        "brand": None,
        "image": None,
        "eventId": "",
        "related": [],
        # Private working fields (never written): raw media for the image step.
        "_media": item.media,
        "_html": item.content_html or item.summary_html,
    }
    if video:
        article["video"] = video
    return article


def _short_error(msg: str) -> str:
    return msg[:120]


def collect_source(src: Source, fetcher: Fetcher, now: datetime) -> tuple[list[dict[str, Any]], str | None]:
    res = fetcher.get(src.feed)
    if not res.ok:
        return [], _short_error(res.error or f"HTTP {res.status}")
    try:
        feed_title, items = parse_feed_titled(res.content)
    except FeedError as exc:
        return [], _short_error(f"parse error: {exc}")
    except Exception as exc:  # feedparser can raise on pathological input
        return [], _short_error(f"parse error: {type(exc).__name__}")
    if src.expect_title and feed_title.casefold() != src.expect_title.casefold():
        return [], _short_error(f"unexpected feed title: {feed_title or '(none)'}")
    built = [a for a in (build_article(i, src, now) for i in items) if a]
    # Only the newest max_items entries of the feed are considered, so reruns see the same window.
    built.sort(key=lambda a: (a["publishedAt"], a["id"]), reverse=True)
    return built[: src.max_items], None


def reclean_excerpts(articles: Iterable[dict[str, Any]]) -> int:
    """Applies the current excerpt cleaning to stories stored by an earlier run.

    A story whose English excerpt changes loses its stored Persian text, because that translation was made
    from the old excerpt; the translator then redoes it.
    """
    changed = 0
    for a in articles:
        old = a.get("excerpt") or ""
        new = tidy_excerpt(old)
        if new != old:
            a["excerpt"] = new
            (a.get("tr") or {}).pop("fa", None)
            changed += 1
    return changed


def run(
    out_dir: Path,
    sources: list[Source],
    fetcher: Fetcher,
    now: datetime,
    enrichers: list[Enricher] | None = None,
    finalizers: list[Callable[[list[dict[str, Any]], datetime], dict[str, Any] | None]] | None = None,
    translation_info: Callable[[list[dict[str, Any]]], dict[str, Any]] | None = None,
) -> RunReport:
    report = RunReport()
    store = Store(out_dir)
    loaded = store.load(now)
    existing = loaded.articles
    by_id = {s.id: s for s in sources}
    new: list[dict[str, Any]] = []
    new_ids: set[str] = set()
    health: list[dict[str, Any]] = []

    for src in sources:
        prev = loaded.source_state.get(src.id, {})
        entry: dict[str, Any] = {
            "id": src.id,
            "name": src.name,
            "homepage": src.homepage,
            "feed": src.feed,
            "kind": src.kind,
            "tier": src.tier,
            "lang": src.lang,
            "enabled": src.enabled,
            "status": "disabled",
            "notes": src.notes,
        }
        if prev.get("verifiedOn"):
            entry["verifiedOn"] = prev["verifiedOn"]
        if not src.enabled:
            health.append(entry)
            continue
        items, error = collect_source(src, fetcher, now)
        if error:
            entry["status"] = "error"
            entry["lastError"] = error
            health.append(entry)
            continue
        entry["status"] = "ok"
        entry.setdefault("verifiedOn", now.strftime("%Y-%m-%d"))
        health.append(entry)
        # Oldest first, so the original report survives and later near-identical reposts are dropped.
        for a in sorted(items, key=lambda x: (x["publishedAt"], x["id"])):
            if a["id"] in existing or a["id"] in new_ids:
                continue
            if is_same_source_duplicate(a, [*existing.values(), *new]):
                continue
            new.append(a)
            new_ids.add(a["id"])

    reclean_excerpts(existing.values())

    # Events: earliest stories first so the first report of an event names it.
    pool = list(existing.values())
    for a in sorted(new, key=lambda x: (x["publishedAt"], x["id"])):
        a["eventId"] = find_event(a, pool) or a["id"]
        pool.append(a)
    refresh_related(pool)

    for enrich in enrichers or []:
        enrich(new, pool, by_id, now)

    picks = None
    for fin in finalizers or []:
        result = fin(pool, now)
        if result is not None:
            picks = result

    for a in pool:
        for k in [k for k in a if k.startswith("_")]:
            del a[k]
    sections = build_sections(pool, now, by_id)

    translation = translation_info(pool) if translation_info else {"enabled": False, "engine": None, "translated": 0}
    report.changed = store.write(pool, now, health, picks, translation, sections)
    report.added = len(new)
    report.sources = health
    return report
