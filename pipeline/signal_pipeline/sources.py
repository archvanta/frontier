"""Loads and validates the source registry (sources.yaml)."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlsplit

import yaml

from .config import MAX_ITEMS_PER_SOURCE
from .schema import BRANDS, CATEGORIES, SECTIONS

REGISTRY_PATH = Path(__file__).with_name("sources.yaml")
KINDS = ("official", "research", "media", "community")


@dataclass(frozen=True)
class Source:
    id: str
    name: str
    homepage: str
    feed: str
    kind: str
    tier: int
    owner: str
    lang: str
    category: str
    filter: str = "none"
    brand: str | None = None
    og_image: bool = False
    og_hosts: tuple[str, ...] = field(default_factory=tuple)
    sections: tuple[str, ...] = field(default_factory=tuple)
    max_items: int = MAX_ITEMS_PER_SOURCE
    enabled: bool = True
    notes: str = ""
    # When set, the fetched feed's own title must match (a YouTube channel's name), so a wrong channel id fails loudly.
    expect_title: str = ""

    @property
    def feed_host(self) -> str:
        return urlsplit(self.feed).hostname or ""


class RegistryError(ValueError):
    pass


def _validate(raw: dict, seen: set[str]) -> Source:
    missing = [k for k in ("id", "name", "homepage", "feed", "kind", "tier", "owner", "lang", "category") if k not in raw]
    if missing:
        raise RegistryError(f"source {raw.get('id', '?')}: missing {missing}")
    if not isinstance(raw["id"], str):
        raise RegistryError(f"source id {raw['id']!r} must be a string (quote YAML words like 'off')")
    sid = raw["id"]
    if sid in seen:
        raise RegistryError(f"duplicate source id {sid}")
    seen.add(sid)
    for key in ("feed", "homepage"):
        if urlsplit(str(raw[key])).scheme != "https":
            raise RegistryError(f"source {sid}: {key} must be https")
    if raw["kind"] not in KINDS:
        raise RegistryError(f"source {sid}: unknown kind {raw['kind']}")
    if int(raw["tier"]) not in (1, 2, 3, 4):
        raise RegistryError(f"source {sid}: tier must be 1-4")
    if raw["category"] not in CATEGORIES:
        raise RegistryError(f"source {sid}: unknown category {raw['category']}")
    if raw.get("brand") not in (None, *BRANDS):
        raise RegistryError(f"source {sid}: unknown brand {raw['brand']}")
    if raw.get("filter", "none") not in ("ai", "none"):
        raise RegistryError(f"source {sid}: filter must be ai|none")
    sections = raw.get("sections") or []
    if not isinstance(sections, list) or any(x not in SECTIONS for x in sections):
        raise RegistryError(f"source {sid}: sections must be a list of {SECTIONS}")
    return Source(
        id=sid,
        name=str(raw["name"]),
        homepage=str(raw["homepage"]),
        feed=str(raw["feed"]),
        kind=str(raw["kind"]),
        tier=int(raw["tier"]),
        owner=str(raw["owner"]),
        lang=str(raw["lang"]),
        category=str(raw["category"]),
        filter=str(raw.get("filter", "none")),
        brand=raw.get("brand"),
        og_image=bool(raw.get("og_image", False)),
        og_hosts=tuple(raw.get("og_hosts") or ()),
        sections=tuple(sections),
        max_items=int(raw.get("max_items", MAX_ITEMS_PER_SOURCE)),
        enabled=bool(raw.get("enabled", True)),
        notes=str(raw.get("notes", "")).strip(),
        expect_title=str(raw.get("expect_title", "")).strip(),
    )


def load_sources(path: Path = REGISTRY_PATH) -> list[Source]:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    seen: set[str] = set()
    return [_validate(raw, seen) for raw in data.get("sources", [])]


def allowed_hosts(sources: list[Source]) -> set[str]:
    """Only these hosts may ever be fetched (feeds + explicitly listed article hosts for og:image)."""
    hosts: set[str] = set()
    for s in sources:
        if s.enabled:
            hosts.add(s.feed_host)
            hosts.update(s.og_hosts)
    return hosts
