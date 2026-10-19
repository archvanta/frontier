"""RSS/Atom parsing via feedparser into plain RawItem records."""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

import feedparser


class FeedError(ValueError):
    pass


@dataclass
class RawItem:
    title: str
    link: str
    guid: str = ""
    summary_html: str = ""
    content_html: str = ""
    published_parsed: time.struct_time | None = None
    published_raw: str = ""
    media: list[dict[str, Any]] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)


def _media_from_entry(e: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    credit = ""
    credits = e.get("media_credit") or []
    if isinstance(credits, list) and credits:
        credit = str(credits[0].get("content") or "").strip()
    for m in e.get("media_content") or []:
        out.append({"url": m.get("url", ""), "type": m.get("type", ""), "medium": m.get("medium", ""), "width": m.get("width"), "source": "media:content", "credit": credit})
    for m in e.get("media_thumbnail") or []:
        out.append({"url": m.get("url", ""), "type": "", "medium": "image", "width": m.get("width"), "source": "media:thumbnail", "credit": credit})
    for link in e.get("links") or []:
        if link.get("rel") == "enclosure" and str(link.get("type", "")).startswith("image/"):
            out.append({"url": link.get("href", ""), "type": link.get("type", ""), "medium": "image", "width": None, "source": "enclosure", "credit": credit})
    alt = ""
    if e.get("media_text"):
        alt = str(e.get("media_text"))
    for m in out:
        m.setdefault("alt", alt)
    return out


def parse_feed(content: bytes) -> list[RawItem]:
    """Parses feed bytes. Raises FeedError when nothing usable could be read."""
    parsed = feedparser.parse(content, sanitize_html=False, resolve_relative_uris=False)
    entries = parsed.get("entries") or []
    if not entries:
        reason = parsed.get("bozo_exception")
        raise FeedError(f"no entries ({type(reason).__name__ if reason else 'empty feed'})")
    items: list[RawItem] = []
    for e in entries:
        link = str(e.get("link") or "").strip()
        title = str(e.get("title") or "").strip()
        if not link or not title:
            continue
        content_html = ""
        if e.get("content"):
            content_html = str(e["content"][0].get("value") or "")
        items.append(
            RawItem(
                title=title,
                link=link,
                guid=str(e.get("id") or ""),
                summary_html=str(e.get("summary") or ""),
                content_html=content_html,
                published_parsed=e.get("published_parsed") or e.get("updated_parsed"),
                published_raw=str(e.get("published") or e.get("updated") or ""),
                media=_media_from_entry(e),
                tags=[str(t.get("term")) for t in (e.get("tags") or []) if t.get("term")],
            )
        )
    if not items:
        raise FeedError("no entries with title and link")
    return items
