from __future__ import annotations

import json

import pytest

from signal_pipeline.fetch import Fetcher
from signal_pipeline.parse import parse_feed, parse_feed_titled
from signal_pipeline.pipeline import build_article, run
from signal_pipeline.sources import Source, allowed_hosts
from signal_pipeline.video import find_video, from_html, from_media, youtube_id

from .helpers import FakeTransport, feed, no_sleep, ok


@pytest.mark.parametrize(
    "url,vid",
    [
        ("https://www.youtube.com/watch?v=AbCdEfGhI_1", "AbCdEfGhI_1"),
        ("https://youtube.com/watch?feature=share&v=AbCdEfGhI_1&t=30", "AbCdEfGhI_1"),
        ("https://m.youtube.com/watch?v=AbCdEfGhI_1", "AbCdEfGhI_1"),
        ("https://youtu.be/AbCdEfGhI_1?t=5", "AbCdEfGhI_1"),
        ("https://www.youtube.com/shorts/AbCdEfGhI_1", "AbCdEfGhI_1"),
        ("https://www.youtube.com/embed/AbCdEfGhI_1?rel=0", "AbCdEfGhI_1"),
        ("https://www.youtube-nocookie.com/embed/AbCdEfGhI_1", "AbCdEfGhI_1"),
        ("https://www.youtube.com/live/AbCdEfGhI_1", "AbCdEfGhI_1"),
        ("https://www.youtube.com/watch?v=short", None),  # not an 11-character id
        ("https://www.youtube.com/watch?v=AbCdEfGhI_1x", None),
        ("https://www.youtube.com/channel/UCfixture", None),
        ("https://evil.example.com/watch?v=AbCdEfGhI_1", None),
        ("https://www.youtube.com.evil.example/watch?v=AbCdEfGhI_1", None),
        ("javascript:alert(1)//youtu.be/AbCdEfGhI_1", None),
        ("", None),
    ],
)
def test_youtube_id(url, vid):
    assert youtube_id(url) == vid


def test_embedded_player_found_in_html():
    assert from_html('<p>x</p><iframe src="//www.youtube.com/embed/AbCdEfGhI_1"></iframe>') == "AbCdEfGhI_1"
    assert from_html('<iframe src="https://player.example.com/embed/AbCdEfGhI_1"></iframe>') is None
    assert from_html("<p>no video</p>") is None


def test_video_file_needs_https_and_a_video_type():
    assert from_media([{"url": "https://m.example.com/a.mp4", "type": "video/mp4"}]) == {"provider": "file", "url": "https://m.example.com/a.mp4", "type": "video/mp4"}
    assert from_media([{"url": "https://m.example.com/a.webm", "type": "", "medium": "video"}])["type"] == "video/webm"
    assert from_media([{"url": "http://m.example.com/a.mp4", "type": "video/mp4"}]) is None
    assert from_media([{"url": "https://m.example.com/a.jpg", "type": "image/jpeg"}]) is None
    # A Flash/player page URL is not a file the browser can play.
    assert from_media([{"url": "https://www.youtube.com/v/AbCdEfGhI_1", "type": "application/x-shockwave-flash"}]) is None


def test_feed_video_id_wins_over_everything_else():
    v = find_video("AbCdEfGhI_1", "https://youtu.be/ZyXwVuTsR-2", [{"url": "https://m.example.com/a.mp4", "type": "video/mp4"}], None)
    assert v == {"provider": "youtube", "id": "AbCdEfGhI_1", "url": "https://www.youtube.com/watch?v=AbCdEfGhI_1"}
    assert find_video("not-an-id", "https://example.com/post", [], None) is None


def test_youtube_channel_feed_parses_to_video_items():
    title, items = parse_feed_titled(feed("youtube_channel.xml"))
    assert title == "Fixture Channel"
    assert [i.video_id for i in items] == ["AbCdEfGhI_1", "ZyXwVuTsR-2"]
    assert items[0].link == "https://www.youtube.com/watch?v=AbCdEfGhI_1"
    assert "walkthrough" in items[0].summary_html


def _yt_source(**kw) -> Source:
    base = dict(
        id="fixture-yt", name="Fixture Channel (YouTube)", homepage="https://www.youtube.com/@fixture",
        feed="https://www.youtube.com/feeds/videos.xml?channel_id=UCfixturechannel000000000",
        kind="official", tier=1, owner="fixture", lang="en", category="models", expect_title="Fixture Channel",
    )
    base.update(kw)
    return Source(**base)


def _blog_source() -> Source:
    return Source(id="fixture-blog", name="Fixture Blog", homepage="https://blog.example.com/", feed="https://blog.example.com/rss",
                  kind="media", tier=2, owner="fixture-blog", lang="en", category="products", filter="ai")


def _run(out_dir, now, sources):
    routes = {
        "https://www.youtube.com/feeds/videos.xml?channel_id=UCfixturechannel000000000": ok(feed("youtube_channel.xml"), "application/atom+xml"),
        "https://blog.example.com/rss": ok(feed("rss_video.xml")),
    }
    fetcher = Fetcher(allowed_hosts(sources), transport=FakeTransport(routes), sleep=no_sleep, spacing_s=0)
    from signal_pipeline.images import ImageStep

    images = ImageStep(og_enabled=False, brand_art=False)
    images.attach(fetcher)
    return run(out_dir, sources, fetcher, now, enrichers=[images])


def _stored(out_dir):
    arts = []
    for p in sorted((out_dir / "days").glob("*.json")):
        arts += json.loads(p.read_text())["articles"]
    return {a["title"]: a for a in arts}


def test_run_stores_videos_and_writes_the_videos_section(out_dir, now):
    report = _run(out_dir, now, [_yt_source(), _blog_source()])
    assert {s["id"]: s["status"] for s in report.sources} == {"fixture-yt": "ok", "fixture-blog": "ok"}
    arts = _stored(out_dir)

    demo = arts["Fixture demo: a new AI model explained"]
    assert demo["video"] == {"provider": "youtube", "id": "AbCdEfGhI_1", "url": "https://www.youtube.com/watch?v=AbCdEfGhI_1"}
    assert demo["image"]["url"] == "https://i1.ytimg.com/vi/AbCdEfGhI_1/hqdefault.jpg"  # the feed's own thumbnail

    embed = arts["Fixture blog post with an embedded AI demo video"]
    assert embed["url"] == "https://blog.example.com/posts/demo"  # the story stays the publisher's article
    assert embed["video"]["id"] == "Qw3rTy_Ui0p"
    assert embed["image"]["url"] == "https://i.ytimg.com/vi/Qw3rTy_Ui0p/hqdefault.jpg" and embed["image"]["kind"] == "feed"

    clip = arts["Fixture clip of an AI robot, as a video file"]
    assert clip["video"] == {"provider": "file", "url": "https://media.example.com/clip.mp4", "type": "video/mp4"}
    assert clip["image"]["url"] == "https://media.example.com/clip-poster.jpg"

    assert "video" not in arts["Fixture AI post with an insecure video file"]

    # "video" sits after the image fields in the written JSON.
    keys = list(demo)
    assert keys.index("image") < keys.index("video") < keys.index("eventId")

    section = json.loads((out_dir / "sections" / "videos.json").read_text())
    assert section["section"] == "videos" and section["total"] == 4
    assert all(a.get("video") for a in section["articles"])


def test_wrong_channel_is_an_error_not_someone_elses_videos(out_dir, now):
    report = _run(out_dir, now, [_yt_source(expect_title="OpenAI")])
    entry = report.sources[0]
    assert entry["status"] == "error" and entry["lastError"] == "unexpected feed title: Fixture Channel"
    assert report.added == 0


def test_articles_without_video_have_no_video_field(now):
    item = parse_feed(feed("rss_basic.xml"))[0]
    a = build_article(item, _yt_source(), now)
    assert a is not None and "video" not in a
