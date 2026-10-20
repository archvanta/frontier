from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest

from signal_pipeline.pipeline import run
from signal_pipeline.sections import build_sections, is_ai_game, is_data_center
from signal_pipeline.sources import RegistryError, Source, load_sources

NOW = datetime(2026, 10, 20, 12, 0, 0, tzinfo=timezone.utc)


def art(title: str, excerpt: str = "", *, source: str = "s", day: str = "2026-10-19", tags: list[str] | None = None, id_: str | None = None):
    return {
        "id": id_ or title[:12].replace(" ", "_"),
        "sourceId": source,
        "title": title,
        "excerpt": excerpt,
        "tags": tags or [],
        "day": day,
        "publishedAt": f"{day}T10:00:00Z",
        "entities": [],
    }


@pytest.mark.parametrize(
    "title,excerpt",
    [
        ("Studio ships an AI-generated video game", ""),
        ("Four agents beat Minecraft without human help", ""),
        ("Epic reportedly pivots to AI first game development", ""),
        ("A new AI tool for indie developers", "It generates NPC dialogue for your game."),
        ("Introducing Playground: create and play custom games", ""),
    ],
)
def test_game_stories_are_recognised(title, excerpt):
    assert is_ai_game(art(title, excerpt))


@pytest.mark.parametrize(
    "title,excerpt",
    [
        ("This AI is a game-changer for coders", ""),
        ("OpenAI ups its game on reasoning", ""),
        ("Nvidia's new laptops arrive", "Built for creators, gamers and AI agents."),
        ("A week with a gaming laptop and local models", ""),
        ("Game theory meets multi-agent evaluation", ""),
        ("Unity among nations on AI policy", ""),
    ],
)
def test_figures_of_speech_and_hardware_launches_are_not_games(title, excerpt):
    assert not is_ai_game(art(title, excerpt))


def test_data_center_needs_headline_or_repeated_mentions():
    assert is_data_center(art("Microsoft pulls out of AI datacentre project over power supply"))
    assert is_data_center(art("Cooling AI racks", "Direct-to-chip cooling is spreading across hyperscale campuses."))
    assert not is_data_center(art("Nvidia launches open models", "Runs on PCs and in data centers."))
    assert is_data_center(art("Neocloud shakeout", "Hyperscalers rent capacity; data center builds slow."))


def _source(sid: str, sections: tuple[str, ...]) -> Source:
    return Source(id=sid, name=sid, homepage="https://x.example/", feed="https://x.example/rss", kind="media", tier=3, owner=sid, lang="en", category="products", sections=sections)


def test_dedicated_sources_join_their_section_and_files_are_newest_first():
    sources = {"games-outlet": _source("games-outlet", ("ai-games",)), "s": _source("s", ())}
    pool = [
        art("Weekly roundup", source="games-outlet", day="2026-10-18", id_="a"),
        art("Plain LLM news", source="s", id_="b"),
        art("Video game uses AI art", source="s", day="2026-10-19", id_="c"),
        art("Very old game story", source="s", day="2026-01-01", id_="d"),
    ]
    out = build_sections(pool, NOW, sources)
    games = out["ai-games"]
    assert [a["id"] for a in games["articles"]] == ["c", "a"]  # newest first; "b" is no game, "d" is outside the window
    assert games["total"] == 2 and games["section"] == "ai-games"
    assert out["data-centers"]["articles"] == []
    assert build_sections(pool, NOW, sources) == out  # deterministic


def test_registry_rejects_unknown_sections(tmp_path):
    bad = tmp_path / "s.yaml"
    bad.write_text(
        "sources:\n  - {id: x, name: X, homepage: 'https://x.example', feed: 'https://x.example/rss', kind: media, tier: 2, owner: x, lang: en, category: models, sections: [cooking]}\n"
    )
    with pytest.raises(RegistryError):
        load_sources(bad)


def test_production_registry_section_sources_are_filtered_to_ai():
    sections = {s.id: s for s in load_sources() if s.sections}
    assert {"game-developer", "datacenter-dynamics"} <= set(sections)
    # General outlets must not flood the AI news feed with non-AI stories.
    assert all(s.filter == "ai" for s in sections.values())


def test_run_writes_section_files(sources, make_fetcher, routes, out_dir, now):
    fetcher, _ = make_fetcher(routes)
    run(out_dir, sources, fetcher, now)
    for sid in ("ai-games", "data-centers"):
        body = json.loads((out_dir / "sections" / f"{sid}.json").read_text())
        assert body["section"] == sid and isinstance(body["articles"], list) and body["total"] == len(body["articles"])
