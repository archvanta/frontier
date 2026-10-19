"""Primary-subject detection for the three brands that get fixed character artwork.

Conservative by design: the art is used only when the brand is clearly what the story is about —
the headline names exactly one of the brands, or the story comes from that brand's own channel.
A brand mentioned only in the excerpt, or several brands in one headline, never triggers the art.
"""
from __future__ import annotations

import re

from .sources import Source

BRAND_ART = {
    "claude": "images/ai-brands/claude-character.webp",
    "openai": "images/ai-brands/openai-character.webp",
    "gemini": "images/ai-brands/gemini-character.webp",
}

BRAND_LABEL = {"claude": "Claude / Anthropic", "openai": "OpenAI", "gemini": "Google Gemini"}

BRAND_PATTERNS: dict[str, re.Pattern[str]] = {
    "claude": re.compile(r"\b(Claude|Anthropic)\b"),
    "openai": re.compile(r"\b(OpenAI|ChatGPT|GPT-?\d[\w.]*|Sora|DALL[·-]?E)\b"),
    "gemini": re.compile(r"\bGemini\b"),
}

# Same words, different subjects.
NOT_BRAND: dict[str, re.Pattern[str]] = {
    "claude": re.compile(r"Jean-Claude|Claude (Monet|Debussy|Shannon|Lévi-Strauss|Makélélé)", re.I),
    "gemini": re.compile(r"Gemini (Trust|exchange|crypto|space|capsule|zodiac|horoscope)|Winklevoss|bitcoin|crypto", re.I),
    "openai": re.compile(r"$^"),
}


def brands_in(text: str) -> list[str]:
    """Brands named in text, ordered by first mention."""
    hits: list[tuple[int, str]] = []
    for brand, pat in BRAND_PATTERNS.items():
        if NOT_BRAND[brand].search(text):
            continue
        m = pat.search(text)
        if m:
            hits.append((m.start(), brand))
    return [b for _, b in sorted(hits)]


def primary_brand(title: str, source: Source) -> str | None:
    in_title = brands_in(title)
    if source.brand and (not in_title or in_title == [source.brand]):
        return source.brand
    if len(in_title) == 1:
        return in_title[0]
    return None
