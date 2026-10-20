"""Topic sections (AI Games, Data Center Design): curated slices of the stored stories.

A section is not a category. A story keeps its category (a game studio's funding round stays
"business") and can also belong to a section. Membership is decided here, once per run, so the site
never re-implements the rules:

- every story from a source whose `sections` list in sources.yaml names the section, and
- every other stored story whose title, excerpt or feed tags match the section's keyword rule.

Every stored story is already AI-related (AI feeds, or general feeds filtered to AI items), so the
rules only have to recognise the topic. Each section is written to data/sections/<id>.json, newest
first, so the page needs one small request instead of loading the whole archive.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any

from . import config
from .schema import SCHEMA_VERSION, SECTIONS, ordered_article
from .sources import Source
from .store import sort_newest_first

# Games. The headline decides loosely, the summary only strictly: hardware launches say "gamers" or "games" in passing
# ("built for creators, gamers and AI agents"), which must not make them AI Games stories. Plain "game" is also too
# often a figure of speech ("game-changer", "ups its game"), so it only counts outside those phrases.
_GAME_STRONG = re.compile(
    r"\b(video ?games?|videogames?|playable|NPCs?|e-?sports|indie (?:dev|studio|game)s?|"
    r"game ?(?:dev\w*|studios?|engines?|design\w*|makers?|industry|publishers?|worlds?|assets?|characters?|mods?|jams?|AI)|"
    r"Unreal Engine|Epic Games|Electronic Arts|Riot Games|Square Enix|Tencent Games|NetEase Games|Game Developers Conference)\b",
    re.I,
)
_GAME_WEAK = re.compile(
    r"\b(gaming(?! (?:pcs?|laptops?|notebooks?|gpus?|hardware|rigs?|monitors?|chips?|performance|the|benchmarks?|metrics|leaderboards?|evals?|results|systems?)\b)|"
    r"gamers?|games|"
    r"(?<!its )(?<!their )(?<!his )(?<!her )(?<!our )(?<!long )(?<!the )(?<!a )game(?![- ]?(?:chang\w*|theor\w*|plans?)))\b",
    re.I,
)
# Proper names that are only safe case-sensitively ("picking up steam", "national unity").
_GAME_NAMES = re.compile(
    r"\b(Roblox|Minecraft|Fortnite|Xbox|PlayStation|Nintendo|Unity (?:Technologies|engine|AI|Muse|Sentis|\d)|"
    r"Ubisoft|Activision|Blizzard|Krafton|GDC)\b"
)

_DATA_CENTER = re.compile(
    r"\b(data ?cent(?:er|re)s?|datacent(?:er|re)s?|hyperscal\w+|colocation|server farms?|server halls?|"
    r"(?:liquid|immersion|direct-to-chip|two-phase) cooling|cooling (?:systems?|plants?|towers?)|rack density|"
    r"megawatts?|gigawatts?|\d+(?:\.\d+)? ?[MG]W|substations?|power purchase agreements?|"
    r"AI factor(?:y|ies)|compute campus(?:es)?|Stargate)\b",
    re.I,
)


def _text(a: dict[str, Any]) -> str:
    return " ".join([a.get("title", ""), a.get("excerpt", ""), " ".join(a.get("tags") or [])])


def is_ai_game(a: dict[str, Any]) -> bool:
    text = _text(a)
    return bool(_GAME_STRONG.search(text) or _GAME_NAMES.search(text) or _GAME_WEAK.search(a.get("title", "")))


def is_data_center(a: dict[str, Any]) -> bool:
    """A headline or tag match, or at least two matches in the summary: one passing mention ("…and data centers") is not the topic."""
    if _DATA_CENTER.search(a.get("title", "")) or _DATA_CENTER.search(" ".join(a.get("tags") or [])):
        return True
    return len(_DATA_CENTER.findall(a.get("excerpt", ""))) >= 2


RULES = {
    "ai-games": is_ai_game,
    "data-centers": is_data_center,
}


def in_section(section: str, a: dict[str, Any], sources: dict[str, Source]) -> bool:
    src = sources.get(a.get("sourceId", ""))
    if src is not None and section in src.sections:
        return True
    return RULES[section](a)


def build_sections(pool: list[dict[str, Any]], now: datetime, sources: dict[str, Source]) -> dict[str, dict[str, Any]]:
    """{section id: file body}. Depends only on the stored stories, so reruns without news are byte-identical."""
    start = (now - timedelta(days=config.SECTION_WINDOW_DAYS)).strftime("%Y-%m-%d")
    recent = sort_newest_first([a for a in pool if a["day"] >= start])
    out: dict[str, dict[str, Any]] = {}
    for section in SECTIONS:
        members = [a for a in recent if in_section(section, a, sources)]
        out[section] = {
            "schemaVersion": SCHEMA_VERSION,
            "section": section,
            "windowDays": config.SECTION_WINDOW_DAYS,
            "total": len(members),
            "articles": [ordered_article(a) for a in members[: config.SECTION_MAX_STORIES]],
        }
    return out
