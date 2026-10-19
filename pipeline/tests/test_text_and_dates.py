from __future__ import annotations

import time
from datetime import datetime, timezone

import pytest

from signal_pipeline.normalize import article_id, canonical_url, categorize, detect_entities, looks_ai_related, parse_published
from signal_pipeline.text import clean_excerpt, html_to_text, truncate

NOW = datetime(2026, 10, 19, 12, 0, tzinfo=timezone.utc)


def test_html_to_text_drops_scripts_and_tags():
    assert html_to_text("<p>Hello <b>world</b></p><script>alert(1)</script><style>x{}</style>") == "Hello world"
    assert html_to_text("A &amp; B&nbsp;&lt;tag&gt;") == "A & B <tag>"
    assert html_to_text(None) == ""


def test_clean_excerpt_removes_boilerplate_and_truncates():
    text = clean_excerpt("<p>Body text here.</p><p>The post Foo appeared first on Bar.</p>", 400)
    assert text == "Body text here."
    long = clean_excerpt("word " * 200, 50)
    assert len(long) <= 50 and long.endswith("…")


def test_truncate_keeps_short_text():
    assert truncate("short", 10) == "short"


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("https://Example.com/a/?utm_source=x&b=2&a=1#frag", "https://example.com/a?a=1&b=2"),
        ("https://example.com:443//path//", "https://example.com/path"),
        ("http://example.com/x?fbclid=1", "http://example.com/x"),
    ],
)
def test_canonical_url(raw, expected):
    assert canonical_url(raw) == expected


def test_canonical_url_rejects_non_http():
    with pytest.raises(ValueError):
        canonical_url("javascript:alert(1)")


def test_article_id_is_stable_across_scheme_and_tracking():
    assert article_id("http://example.com/a?utm_source=x") == article_id("https://example.com/a/")
    assert len(article_id("https://example.com/a")) == 16


def test_parse_published_handles_offsets_missing_malformed_and_future():
    st = time.strptime("2026-10-19 06:00:00", "%Y-%m-%d %H:%M:%S")
    assert parse_published(st, "", NOW) == datetime(2026, 10, 19, 6, 0, tzinfo=timezone.utc)
    # +03:30 offset converts to UTC
    assert parse_published(None, "Mon, 19 Oct 2026 09:30:00 +0330", NOW) == datetime(2026, 10, 19, 6, 0, tzinfo=timezone.utc)
    assert parse_published(None, "2026-10-18T23:00:00-05:00", NOW) == datetime(2026, 10, 19, 4, 0, tzinfo=timezone.utc)
    assert parse_published(None, "", NOW) is None
    assert parse_published(None, "not a date", NOW) is None
    assert parse_published(None, "Fri, 01 Jan 2100 00:00:00 GMT", NOW) is None
    # naive ISO is treated as UTC
    assert parse_published(None, "2026-10-19T01:02:03", NOW) == datetime(2026, 10, 19, 1, 2, 3, tzinfo=timezone.utc)


def test_ai_filter():
    assert looks_ai_related("Hospital pilots an AI triage assistant", "")
    assert looks_ai_related("New paper", "uses a large language model")
    assert not looks_ai_related("City council approves new bike lanes", "Transport news.")
    assert not looks_ai_related("Said the chair", "")


def test_categories_and_entities():
    assert categorize("Startup raises $50M for AI agents", "", "models") == "business"
    assert categorize("EU AI Act guidance published", "", "models") == "policy"
    assert categorize("Nvidia unveils new GPU", "", "models") == "hardware"
    assert categorize("Something vague", "", "research") == "research"
    assert detect_entities("OpenAI and Anthropic", "Gemini too") == ["anthropic", "google", "openai"]
