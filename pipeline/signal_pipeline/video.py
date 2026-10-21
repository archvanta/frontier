"""Finds a playable video for a story, so the site can play it in the page.

Only references are stored: a YouTube video id (played through the privacy-enhanced
youtube-nocookie.com embed player, which the publisher allows on every embeddable video) or the
https URL of a video file the feed itself offers as media:content / enclosure (played from the
publisher's server). Nothing is downloaded or re-hosted.

Order: the YouTube feed's own video id → a YouTube story link → a YouTube player embedded in the
item's HTML → a video file in the feed's media.
"""
from __future__ import annotations

import re
from html.parser import HTMLParser
from typing import Any
from urllib.parse import parse_qs, urlsplit

YOUTUBE_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
_YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"}
_NOCOOKIE_HOSTS = {"youtube-nocookie.com", "www.youtube-nocookie.com"}
_PATH_ID = re.compile(r"^/(?:embed|shorts|live|v)/([A-Za-z0-9_-]{11})(?:[/?]|$)")
VIDEO_TYPES = {"video/mp4", "video/webm", "video/ogg"}
_VIDEO_EXT = re.compile(r"\.(mp4|webm|ogv)$", re.I)
_EXT_TYPE = {"mp4": "video/mp4", "webm": "video/webm", "ogv": "video/ogg"}


def youtube_id(url: str | None) -> str | None:
    """The video id of a YouTube watch, short, embed or youtu.be URL; None for anything else."""
    if not url or len(url) > 2000:
        return None
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return None
    if parts.scheme not in ("http", "https"):
        return None
    host = (parts.hostname or "").lower()
    vid: str | None = None
    if host == "youtu.be":
        vid = parts.path.lstrip("/").split("/", 1)[0]
    elif host in _YOUTUBE_HOSTS or host in _NOCOOKIE_HOSTS:
        if parts.path == "/watch" and host in _YOUTUBE_HOSTS:
            vid = (parse_qs(parts.query).get("v") or [""])[0]
        else:
            m = _PATH_ID.match(parts.path)
            vid = m.group(1) if m else None
    return vid if vid and YOUTUBE_ID.match(vid) else None


def youtube_video(vid: str) -> dict[str, Any]:
    return {"provider": "youtube", "id": vid, "url": f"https://www.youtube.com/watch?v={vid}"}


class _EmbedFinder(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.found: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self.found is not None or tag not in ("iframe", "embed"):
            return
        a = {k: (v or "") for k, v in attrs}
        src = a.get("src") or a.get("data-src") or ""
        if src.startswith("//"):
            src = "https:" + src
        self.found = youtube_id(src)


def from_html(html: str | None) -> str | None:
    """Id of the first YouTube player embedded in the item's HTML."""
    if not html or ("<iframe" not in html and "<embed" not in html):
        return None
    p = _EmbedFinder()
    try:
        p.feed(html)
    except Exception:
        return None
    return p.found


def from_media(media: list[dict[str, Any]]) -> dict[str, Any] | None:
    """The first https video file offered by the feed (media:content or enclosure)."""
    for m in media or []:
        url = str(m.get("url") or "").strip()
        if not url or len(url) > 2000:
            continue
        parts = urlsplit(url)
        # https only: the site is served over https and browsers block mixed-content video.
        if parts.scheme != "https" or not parts.hostname:
            continue
        mtype = str(m.get("type") or "").lower().split(";", 1)[0].strip()
        ext = _VIDEO_EXT.search(parts.path)
        if mtype in VIDEO_TYPES:
            return {"provider": "file", "url": url, "type": mtype}
        if not mtype and str(m.get("medium") or "") == "video" and ext:
            return {"provider": "file", "url": url, "type": _EXT_TYPE[ext.group(1).lower()]}
    return None


def find_video(feed_video_id: str, link: str, media: list[dict[str, Any]], html: str | None) -> dict[str, Any] | None:
    for vid in (feed_video_id if YOUTUBE_ID.match(feed_video_id or "") else None, youtube_id(link), from_html(html)):
        if vid:
            return youtube_video(vid)
    return from_media(media)


def youtube_thumbnail(video: dict[str, Any] | None) -> dict[str, Any] | None:
    """YouTube's own thumbnail of the video, for a story whose feed gave no image."""
    if not video or video.get("provider") != "youtube":
        return None
    return {"url": f"https://i.ytimg.com/vi/{video['id']}/hqdefault.jpg", "kind": "feed", "sourceUrl": video["url"]}
