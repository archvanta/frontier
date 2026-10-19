"""Python mirror of src/lib/types.ts. Keep SCHEMA_VERSION in sync with the frontend."""
from __future__ import annotations

from typing import Any, Literal, TypedDict

SCHEMA_VERSION = 1

CATEGORIES = ("models", "research", "products", "business", "policy", "open-source", "hardware", "safety")
BRANDS = ("claude", "openai", "gemini")

Category = Literal["models", "research", "products", "business", "policy", "open-source", "hardware", "safety"]


class Image(TypedDict, total=False):
    url: str
    kind: Literal["feed", "og", "brand", "fallback"]
    alt: str
    credit: str
    sourceUrl: str


class Article(TypedDict, total=False):
    id: str
    url: str
    sourceId: str
    sourceName: str
    title: str
    excerpt: str
    lang: str
    publishedAt: str
    dateEstimated: bool
    fetchedAt: str
    day: str
    category: str
    tags: list[str]
    entities: list[str]
    brand: str | None
    image: Image | None
    sourceImage: Image | None
    eventId: str
    related: list[str]
    score: dict[str, Any]
    tr: dict[str, dict[str, str]]


# Field order used when writing JSON, so files diff cleanly.
ARTICLE_KEY_ORDER = (
    "id", "url", "sourceId", "sourceName", "title", "excerpt", "lang", "publishedAt", "dateEstimated",
    "fetchedAt", "day", "category", "tags", "entities", "brand", "image", "sourceImage", "eventId",
    "related", "score", "tr",
)


def ordered_article(a: dict[str, Any]) -> dict[str, Any]:
    out = {k: a[k] for k in ARTICLE_KEY_ORDER if k in a}
    for k in sorted(a):
        if k not in out and not k.startswith("_"):
            out[k] = a[k]
    return out
