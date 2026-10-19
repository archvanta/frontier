from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest

from signal_pipeline.fetch import Fetcher
from signal_pipeline.sources import allowed_hosts, load_sources

from .helpers import FIXTURES, FakeResponse, FakeTransport, feed, no_sleep, ok

NOW = datetime(2026, 10, 19, 12, 0, 0, tzinfo=timezone.utc)


@pytest.fixture
def now() -> datetime:
    return NOW


@pytest.fixture
def sources():
    return load_sources(FIXTURES / "sources_test.yaml")


@pytest.fixture
def routes() -> dict[str, object]:
    return {
        "https://example.com/feed.xml": ok(feed("rss_basic.xml")),
        "https://wire.example.org/atom": ok(feed("atom_basic.xml"), "application/atom+xml"),
        "https://general.example.net/rss": ok(feed("general.xml")),
        "https://broken.example.com/rss": ok(feed("malformed.xml")),
        "https://down.example.com/rss": FakeResponse(503),
    }


@pytest.fixture
def make_fetcher(sources):
    def make(routes: dict[str, object]) -> tuple[Fetcher, FakeTransport]:
        transport = FakeTransport(routes)
        return Fetcher(allowed_hosts(sources), transport=transport, sleep=no_sleep, spacing_s=0), transport

    return make


@pytest.fixture
def out_dir(tmp_path: Path) -> Path:
    return tmp_path / "data"
