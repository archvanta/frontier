from __future__ import annotations

import json
from datetime import timedelta

from signal_pipeline.dedup import find_event, jaccard, tokens
from signal_pipeline.pipeline import run

from .helpers import FakeResponse


def _files(out):
    return {p.relative_to(out).as_posix(): p.read_text() for p in sorted(out.rglob("*.json"))}


def _articles(out):
    arts = []
    for p in sorted((out / "days").glob("*.json")):
        arts += json.loads(p.read_text())["articles"]
    return arts


def test_run_collects_normalises_and_isolates_failures(sources, make_fetcher, routes, out_dir, now):
    fetcher, _ = make_fetcher(routes)
    report = run(out_dir, sources, fetcher, now)
    status = {s["id"]: s["status"] for s in report.sources}
    assert status == {"lab": "ok", "wire": "ok", "general": "ok", "broken": "error", "down": "error", "disabled-src": "disabled"}
    errors = {s["id"]: s.get("lastError") for s in report.sources}
    assert errors["down"] == "HTTP 503" and errors["broken"].startswith("parse error")

    arts = _articles(out_dir)
    titles = [a["title"] for a in arts]
    # same-source near-duplicate repost dropped; far-future, very old and javascript: items skipped; non-AI general item filtered
    assert sum("Nova-3 reasoning model" in t and a["sourceId"] == "lab" for t, a in zip(titles, arts)) == 1
    assert not any(t in titles for t in ("Very old item", "Bad link item", "City council approves new bike lanes"))
    assert "Hospital pilots an AI triage assistant" in titles

    nova = next(a for a in arts if a["sourceId"] == "lab" and "Nova-3" in a["title"])
    assert nova["url"] == "https://example.com/news/nova-3"  # tracking params + fragment removed
    assert nova["publishedAt"] == "2026-10-19T06:00:00Z"  # +03:30 converted to UTC
    assert "alert" not in nova["excerpt"] and "<" not in nova["excerpt"]
    assert nova["category"] == "open-source"

    undated = next(a for a in arts if a["title"] == "Fixture Lab update with no date")
    assert undated["dateEstimated"] is True and undated["publishedAt"] == "2026-10-19T12:00:00Z"
    future = next(a for a in arts if a["title"] == "Item dated in the far future")
    assert future["dateEstimated"] is True

    robot = next(a for a in arts if "robotics" in a["title"])
    assert robot["day"] == "2026-10-19"  # 22:15 -07:00 on the 18th is 05:15 UTC on the 19th

    # Day files sorted newest first; no private working fields leak.
    for p in (out_dir / "days").glob("*.json"):
        day = json.loads(p.read_text())["articles"]
        assert [a["publishedAt"] for a in day] == sorted((a["publishedAt"] for a in day), reverse=True)
        assert all(not k.startswith("_") for a in day for k in a)


def test_cross_source_event_clustering(sources, make_fetcher, routes, out_dir, now):
    fetcher, _ = make_fetcher(routes)
    run(out_dir, sources, fetcher, now)
    arts = {a["id"]: a for a in _articles(out_dir)}
    lab = next(a for a in arts.values() if a["sourceId"] == "lab" and "Nova-3" in a["title"])
    wire = next(a for a in arts.values() if a["sourceId"] == "wire" and "Nova-3" in a["title"])
    assert lab["eventId"] == wire["eventId"] == lab["id"]  # earliest report names the event
    assert lab["related"] == [wire["id"]] and wire["related"] == [lab["id"]]
    audit = next(a for a in arts.values() if "audit" in a["title"])
    assert audit["eventId"] == audit["id"] and audit["related"] == []


def test_brand_names_alone_never_merge_events(now):
    a = {"id": "a", "sourceId": "s1", "title": "OpenAI launches GPT voice", "publishedAt": "2026-10-19T00:00:00Z", "eventId": "a"}
    b = {"id": "b", "sourceId": "s2", "title": "OpenAI GPT", "publishedAt": "2026-10-19T01:00:00Z", "eventId": "b"}
    assert find_event(b, [a]) is None
    assert jaccard(tokens("x y"), tokens("")) == 0.0


def test_rerun_is_idempotent_and_preserves_history(sources, make_fetcher, routes, out_dir, now):
    fetcher, _ = make_fetcher(routes)
    first = run(out_dir, sources, fetcher, now)
    snapshot = _files(out_dir)
    assert first.changed and first.added > 0

    fetcher, _ = make_fetcher(routes)
    second = run(out_dir, sources, fetcher, now + timedelta(hours=1))
    assert second.added == 0 and second.changed is False
    assert _files(out_dir) == snapshot  # byte-identical, including meta.dataUpdatedAt

    # A source disappearing later must not delete stored history.
    fetcher, _ = make_fetcher({**routes, "https://example.com/feed.xml": FakeResponse(500)})
    run(out_dir, sources, fetcher, now + timedelta(hours=2))
    assert any(a["sourceId"] == "lab" for a in _articles(out_dir))


def test_meta_and_indexes(sources, make_fetcher, routes, out_dir, now):
    fetcher, _ = make_fetcher(routes)
    run(out_dir, sources, fetcher, now)
    meta = json.loads((out_dir / "meta.json").read_text())
    index = json.loads((out_dir / "archive-index.json").read_text())
    search = json.loads((out_dir / "search-index.json").read_text())
    srcs = json.loads((out_dir / "sources.json").read_text())
    assert meta["dataUpdatedAt"] == "2026-10-19T12:00:00Z"
    assert meta["articleCount"] == sum(d["count"] for d in index["days"]) == len(search["entries"])
    assert meta["sourcesOk"] == 3 and meta["sourcesFailed"] == 2
    assert [d["day"] for d in index["days"]] == sorted((d["day"] for d in index["days"]), reverse=True)
    lab = next(s for s in srcs["sources"] if s["id"] == "lab")
    assert lab["verifiedOn"] == "2026-10-19"
    down = next(s for s in srcs["sources"] if s["id"] == "down")
    assert "verifiedOn" not in down


def test_verified_on_is_kept_from_first_success(sources, make_fetcher, routes, out_dir, now):
    fetcher, _ = make_fetcher(routes)
    run(out_dir, sources, fetcher, now)
    fetcher, _ = make_fetcher(routes)
    run(out_dir, sources, fetcher, now + timedelta(days=2))
    srcs = json.loads((out_dir / "sources.json").read_text())
    assert next(s for s in srcs["sources"] if s["id"] == "lab")["verifiedOn"] == "2026-10-19"
