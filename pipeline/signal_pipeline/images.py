"""Chooses a genuine image for each new story (feed media → inline img → allowlisted og:image),
or, when `config.BRAND_ART_ENABLED` is on, the fixed brand artwork for stories primarily about
Claude, OpenAI or Gemini. Images are referenced by URL only; nothing is downloaded into the
repository. No image generation."""
from __future__ import annotations

import re
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin, urlsplit

from . import config
from .brands import BRAND_ART, BRAND_LABEL, primary_brand
from .fetch import Fetcher
from .sources import Source

OG_MAX_BYTES = 512_000
OG_PER_SOURCE_PER_RUN = 10
_PIXEL = re.compile(r"(pixel|spacer|1x1|tracking|feedburner|blank\.gif|gravatar\.com/avatar|/emoji/)", re.I)


def valid_image_url(url: str | None) -> bool:
    if not url or len(url) > 2000:
        return False
    parts = urlsplit(url.strip())
    if parts.scheme not in ("https", "http") or not parts.hostname:
        return False
    return not _PIXEL.search(url)


def from_media(media: list[dict[str, Any]]) -> dict[str, Any] | None:
    candidates = []
    for order, m in enumerate(media or []):
        url = str(m.get("url") or "").strip()
        mtype = str(m.get("type") or "")
        medium = str(m.get("medium") or "")
        if not valid_image_url(url):
            continue
        if mtype and not mtype.startswith("image/"):
            continue
        if not mtype and medium and medium != "image":
            continue
        try:
            width = int(m.get("width") or 0)
        except (TypeError, ValueError):
            width = 0
        if width and width < 120:
            continue
        rank = {"media:content": 0, "enclosure": 1, "media:thumbnail": 2}.get(str(m.get("source")), 3)
        candidates.append((rank, -width, order, m, url))
    if not candidates:
        return None
    _, _, _, m, url = min(candidates, key=lambda c: c[:3])
    return {"url": url, "alt": str(m.get("alt") or "")[:200], "credit": str(m.get("credit") or "")[:120]}


class _ImgFinder(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.found: dict[str, str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self.found is not None or tag != "img":
            return
        a = {k: (v or "") for k, v in attrs}
        try:
            w = int(a.get("width") or 0)
        except ValueError:
            w = 0
        if valid_image_url(a.get("src")) and not (w and w < 120):
            self.found = {"url": a["src"].strip(), "alt": a.get("alt", "")[:200]}


def from_html(html: str | None) -> dict[str, Any] | None:
    if not html or "<img" not in html:
        return None
    p = _ImgFinder()
    try:
        p.feed(html)
    except Exception:
        return None
    return p.found


class _MetaFinder(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.meta: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "meta":
            return
        a = {k: (v or "") for k, v in attrs}
        key = (a.get("property") or a.get("name") or "").lower()
        if key in ("og:image", "og:image:secure_url", "twitter:image", "og:image:alt", "twitter:image:alt") and key not in self.meta:
            self.meta[key] = a.get("content", "").strip()


def og_image(article_url: str, fetcher: Fetcher) -> dict[str, Any] | None:
    res = fetcher.get(article_url, accept="text/html,application/xhtml+xml;q=0.9,*/*;q=0.1", max_bytes=OG_MAX_BYTES)
    if not res.ok:
        return None
    head = res.content.split(b"</head>", 1)[0].decode("utf-8", errors="replace")
    p = _MetaFinder()
    try:
        p.feed(head)
    except Exception:
        return None
    raw = p.meta.get("og:image:secure_url") or p.meta.get("og:image") or p.meta.get("twitter:image")
    if not raw:
        return None
    url = urljoin(res.final_url or article_url, raw)
    if not valid_image_url(url):
        return None
    return {"url": url, "alt": (p.meta.get("og:image:alt") or p.meta.get("twitter:image:alt") or "")[:200]}


def fallback_image(a: dict[str, Any]) -> dict[str, Any]:
    return {"url": f"images/fallbacks/{a['category']}.svg", "kind": "fallback"}


def brand_image(brand: str) -> dict[str, Any]:
    return {"url": BRAND_ART[brand], "kind": "brand", "alt": f"{BRAND_LABEL[brand]} — unofficial editorial character illustration"}


def apply_brand_art(a: dict[str, Any], enabled: bool) -> None:
    """Puts a stored story's image in line with the brand-art setting, keeping the genuine image."""
    img = a.get("image") or {}
    if enabled and a.get("brand") in BRAND_ART:
        if img.get("kind") != "brand":
            a["sourceImage"] = img if img.get("kind") in ("feed", "og") else None
            a["image"] = brand_image(a["brand"])
    elif img.get("kind") == "brand":
        a["image"] = a.get("sourceImage") or fallback_image(a)
        a.pop("sourceImage", None)


class ImageStep:
    def __init__(self, og_enabled: bool = True, brand_art: bool | None = None) -> None:
        self.og_enabled = og_enabled
        self.brand_art = config.BRAND_ART_ENABLED if brand_art is None else brand_art
        self.fetcher: Fetcher | None = None
        self.og_used: dict[str, int] = {}

    def attach(self, fetcher: Fetcher) -> None:
        self.fetcher = fetcher

    def _source_image(self, a: dict[str, Any], src: Source) -> dict[str, Any] | None:
        img = from_media(a.get("_media") or [])
        if img:
            return {**img, "kind": "feed", "sourceUrl": src.feed}
        img = from_html(a.get("_html"))
        if img:
            return {**img, "kind": "feed", "sourceUrl": src.feed}
        host = urlsplit(a["url"]).hostname or ""
        if (
            self.og_enabled
            and self.fetcher is not None
            and src.og_image
            and host in src.og_hosts
            and self.og_used.get(src.id, 0) < OG_PER_SOURCE_PER_RUN
        ):
            self.og_used[src.id] = self.og_used.get(src.id, 0) + 1
            img = og_image(a["url"], self.fetcher)
            if img:
                return {**img, "kind": "og", "sourceUrl": a["url"]}
        return None

    def __call__(self, new: list[dict[str, Any]], pool: list[dict[str, Any]], sources: dict[str, Source], _now: Any) -> None:
        for a in new:
            src = sources[a["sourceId"]]
            found = self._source_image(a, src)
            if found is not None:
                found = {k: v for k, v in found.items() if v not in ("", None)}
            a["brand"] = primary_brand(a["title"], src)
            a["image"] = found or fallback_image(a)
            apply_brand_art(a, self.brand_art)
        for a in pool:  # stored stories follow a change of the setting (idempotent otherwise)
            apply_brand_art(a, self.brand_art)
