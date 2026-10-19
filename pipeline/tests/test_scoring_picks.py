from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import pytest

from signal_pipeline import config
from signal_pipeline.images import ImageStep
from signal_pipeline.picks import PicksStep, as_of_time, build_picks
from signal_pipeline.pipeline import run
from signal_pipeline.scoring import Scorer, corroboration, independent_voices, recency, reliability, total
from signal_pipeline.sources import Source

AS_OF = datetime(2026, 10, 19, 12, 0, tzinfo=timezone.utc)


def mk_src(sid: str, tier: int = 2, owner: str | None = None) -> Source:
    return Source(id=sid, name=sid.title(), homepage=f"https://{sid}.example/", feed=f"https://{sid}.example/rss", kind="media", tier=tier, owner=owner or sid, lang="en", category="business", filter="none")


def art(aid: str, title: str, hours_ago: float, source: str = "s1", category: str = "models", event: str | None = None, brand: str | None = None, entities: list[str] | None = None) -> dict:
    when = AS_OF - timedelta(hours=hours_ago)
    return {
        "id": aid,
        "url": f"https://{source}.example/{aid}",
        "sourceId": source,
        "sourceName": source.title(),
        "title": title,
        "excerpt": "",
        "lang": "en",
        "publishedAt": when.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dateEstimated": False,
        "fetchedAt": when.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "day": when.strftime("%Y-%m-%d"),
        "category": category,
        "tags": [],
        "entities": entities or [],
        "brand": brand,
        "image": None,
        "eventId": event or aid,
        "related": [],
    }


# --- factors ----------------------------------------------------------------


def test_factors_are_normalised_to_0_100():
    assert reliability(1) == 100 and reliability(4) == 40 and reliability(9) == 40
    assert corroboration(1) == 0 and corroboration(2) == 50 and corroboration(3) == 75
    assert 0 < corroboration(50) <= 100
    assert recency(0, 12) == 100
    assert recency(12, 12) == pytest.approx(50)
    assert recency(24, 12) == pytest.approx(25)
    assert recency(-3, 12) == 100  # clock skew never exceeds 100
    parts = {"reliability": 100, "corroboration": 100, "recency": 100, "topic": 100, "novelty": 100}
    assert total(parts) == 100
    assert total(dict.fromkeys(parts, 0)) == 0
    assert sum(config.WEIGHTS.values()) == pytest.approx(1.0)


def test_syndicated_copies_and_sister_outlets_count_as_one_voice():
    owners = {"a": "a", "b": "b", "c": "group", "d": "group"}
    original = art("1", "Lab releases Nova-3 reasoning model with open weights today", 5, "a")
    copy = art("2", "Lab releases Nova-3 reasoning model with open weights today", 4, "b")  # press release reprint
    own_take = art("3", "Nova-3 hands-on: the open model is fast but uneven", 3, "c")
    sister = art("4", "Why Nova-3 open weights matter for startups", 2, "d")  # same owner as c
    assert independent_voices([original, copy, own_take, sister], owners) == 2
    assert independent_voices([original], owners) == 1


def test_recency_decays_so_old_stories_lose_to_fresh_ones():
    pool = [art("old", "Old big model launch", 20), art("new", "Fresh chip export rule", 1, category="models")]
    sc = Scorer(pool, {"s1": mk_src("s1")})
    assert sc.score(pool[1], AS_OF, 12)["total"] > sc.score(pool[0], AS_OF, 12)["total"]
    # Same story ages: score falls monotonically as as_of moves forward.
    later = [sc.score(pool[1], AS_OF + timedelta(hours=h), 12)["total"] for h in (0, 6, 12, 48)]
    assert later == sorted(later, reverse=True) and later[0] > later[-1]


def test_follow_up_reports_and_repeats_are_less_novel():
    first = art("1", "Robotics lab opens household dataset", 30, "s1", event="E")
    follow = art("2", "Robotics lab household dataset: what researchers found", 10, "s2", event="E")
    unrelated = art("3", "Quantum chip startup raises funding round", 5, "s1")
    sc = Scorer([first, follow, unrelated], {"s1": mk_src("s1"), "s2": mk_src("s2")})
    assert sc.novelty(first) == 100
    assert sc.novelty(follow) == pytest.approx(50)  # later report of the same event is halved
    assert sc.novelty(unrelated) == 100


# --- picks ------------------------------------------------------------------


def sources(*ids: str, tier: int = 2) -> dict[str, Source]:
    return {i: mk_src(i, tier) for i in ids}


def test_windows_only_include_stories_inside_their_bounds():
    pool = [
        art("h1", "Story one hour old", 1, "s1"),
        art("edge", "Story exactly a day old", 24, "s2"),  # boundary: excluded from daily (start is exclusive)
        art("d3", "Story three days old", 72, "s3"),
        art("d10", "Story ten days old", 240, "s1"),
        art("d40", "Story forty days old", 960, "s2"),
    ]
    p = build_picks(pool, AS_OF + timedelta(minutes=30), sources("s1", "s2", "s3"))
    ids = {w: [x["article"]["id"] for x in p["windows"][w]["picks"]] for w in ("daily", "weekly", "monthly")}
    assert ids["daily"] == ["h1"]
    assert set(ids["weekly"]) == {"h1", "edge", "d3"}
    assert set(ids["monthly"]) == {"h1", "edge", "d3", "d10"}
    assert p["asOf"] == "2026-10-19T12:00:00Z"
    assert p["windows"]["daily"]["from"] == "2026-10-18T12:00:00Z"
    assert p["windows"]["daily"]["to"] == "2026-10-19T12:00:00Z"


def test_one_pick_per_event_with_voice_count():
    pool = [
        art("a", "Nova-3 model launches with open weights", 3, "s1", event="E"),
        art("b", "Nova-3 open weights model arrives", 2, "s2", event="E"),
        art("c", "Nova-3 launch with open weights: analysis", 1, "s3", event="E"),
        art("z", "Unrelated policy update on audits", 2, "s1", category="policy"),
    ]
    p = build_picks(pool, AS_OF, sources("s1", "s2", "s3"))
    daily = p["windows"]["daily"]["picks"]
    events = [x["article"]["eventId"] for x in daily]
    assert events.count("E") == 1
    e = next(x for x in daily if x["article"]["eventId"] == "E")
    assert e["sources"] == 3
    assert e["article"]["score"]["parts"]["corroboration"] == 75
    assert "voices-3" in e["reason"]
    assert [x["rank"] for x in daily] == list(range(1, len(daily) + 1))


def test_diversity_caps_stop_one_company_or_source_dominating():
    pool = [art(f"o{i}", f"OpenAI announcement number {i} about agents {i}", i * 0.5, f"s{i % 3}", brand="openai") for i in range(10)]
    pool += [art(f"x{i}", f"Independent lab story {i} on robotics topic {i}", 3 + i, "s9", category="research") for i in range(3)]
    pool += [art(f"y{i}", f"Chip export rule {i} for accelerators {i}", 4 + i, f"t{i}", category="hardware", entities=["nvidia"]) for i in range(4)]
    srcs = sources("s0", "s1", "s2", "s9", "t0", "t1", "t2", "t3")
    for w, cfg in config.PICK_WINDOWS.items():
        picks = build_picks(pool, AS_OF, srcs)["windows"][w]["picks"]
        arts = [x["article"] for x in picks]
        assert len(arts) <= cfg["size"]
        assert sum(a["brand"] == "openai" for a in arts) <= cfg["per_subject"]
        assert sum("nvidia" in a["entities"] for a in arts) <= cfg["per_subject"]
        for sid in srcs:
            assert sum(a["sourceId"] == sid for a in arts) <= cfg["per_source"]
        assert len({a["category"] for a in arts}) >= 3


def test_empty_pool_and_empty_window_are_clean():
    p = build_picks([], AS_OF, {})
    assert all(p["windows"][w]["picks"] == [] for w in ("daily", "weekly", "monthly"))
    only_old = [art("old", "Two weeks old", 24 * 14)]
    p = build_picks(only_old, AS_OF, sources("s1"))
    assert p["windows"]["daily"]["picks"] == [] and p["windows"]["weekly"]["picks"] == []
    assert [x["article"]["id"] for x in p["windows"]["monthly"]["picks"]] == ["old"]


def test_as_of_ignores_future_dates_and_picks_are_deterministic():
    pool = [art("a", "Alpha story", 2), art("b", "Beta story", -2, "s2"), art("f", "Future dated", -5, "s3")]
    # Run at 15:00: newest story not in the future is 14:00, later than the 6-hour clock floor (12:00).
    assert as_of_time(pool, AS_OF + timedelta(hours=3)) == AS_OF + timedelta(hours=2)
    # With no recent stories, as_of still advances with the clock floor, so old stories age out.
    assert as_of_time([art("old", "Old", 200)], AS_OF + timedelta(hours=7, minutes=59)) == AS_OF + timedelta(hours=6)
    srcs = sources("s1", "s2", "s3")
    assert json.dumps(build_picks(pool, AS_OF, srcs)) == json.dumps(build_picks(list(reversed(pool)), AS_OF, srcs))


def test_scores_are_explainable_in_output():
    p = build_picks([art("a", "Alpha model launch", 1)], AS_OF, sources("s1", tier=1))
    entry = p["windows"]["daily"]["picks"][0]
    score = entry["article"]["score"]
    assert set(score["parts"]) == set(config.WEIGHTS)
    assert score["total"] == total(score["parts"])
    assert score["parts"]["reliability"] == 100
    assert entry["reason"][0] == "tier-1"
    assert p["weights"] == config.WEIGHTS


# --- full pipeline run ----------------------------------------------------------


def test_full_run_writes_picks_and_rerun_is_byte_identical(sources, routes, make_fetcher, out_dir, now):
    fetcher, _ = make_fetcher(routes)
    run(out_dir, sources, fetcher, now, enrichers=[ImageStep(og_enabled=False)], finalizers=[PicksStep(sources)])
    picks = json.loads((out_dir / "picks.json").read_text())
    stored = {a["id"] for f in (out_dir / "days").glob("*.json") for a in json.loads(f.read_text())["articles"]}
    for w in ("daily", "weekly", "monthly"):
        for x in picks["windows"][w]["picks"]:
            assert x["article"]["id"] in stored  # only real stored stories
            assert not any(k.startswith("_") for k in x["article"])
    # Day files carry no time-dependent score, so only picks.json depends on the clock.
    for f in (out_dir / "days").glob("*.json"):
        assert all("score" not in a for a in json.loads(f.read_text())["articles"])

    before = {p.name: p.read_bytes() for p in out_dir.rglob("*.json")}
    fetcher2, _ = make_fetcher(routes)
    report = run(out_dir, sources, fetcher2, now + timedelta(hours=1), enrichers=[ImageStep(og_enabled=False)], finalizers=[PicksStep(sources)])
    assert report.changed is False
    assert {p.name: p.read_bytes() for p in out_dir.rglob("*.json")} == before
