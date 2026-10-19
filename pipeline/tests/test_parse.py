from __future__ import annotations

import pytest

from signal_pipeline.parse import FeedError, parse_feed

from .helpers import feed


def test_parses_rss_with_media_and_enclosures():
    items = parse_feed(feed("rss_basic.xml"))
    first = items[0]
    assert first.title.startswith("Fixture Lab releases Nova-3")
    assert first.media and first.media[0]["url"] == "https://cdn.example.com/nova3.jpg"
    assert first.media[0]["credit"] == "Fixture Lab"
    robot = next(i for i in items if "robotics" in i.title)
    assert robot.media[0]["source"] == "enclosure"


def test_parses_atom():
    items = parse_feed(feed("atom_basic.xml"))
    assert len(items) == 3
    assert items[0].link == "https://wire.example.org/2026/10/19/nova-3-open-weights/"
    assert items[0].published_parsed is not None


@pytest.mark.parametrize("name", ["malformed.xml", "not_a_feed.html"])
def test_invalid_feeds_raise_feed_error(name):
    with pytest.raises(FeedError):
        parse_feed(feed(name))


def test_empty_bytes():
    with pytest.raises(FeedError):
        parse_feed(b"")
