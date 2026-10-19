from __future__ import annotations

import pytest

from signal_pipeline.sources import RegistryError, allowed_hosts, load_sources


def test_production_registry_is_valid():
    sources = load_sources()
    assert len(sources) >= 15
    assert len({s.id for s in sources}) == len(sources)
    hosts = allowed_hosts(sources)
    assert "openai.com" in hosts and "www.anthropic.com" in hosts


def test_registry_validation(tmp_path):
    bad = tmp_path / "s.yaml"
    bad.write_text("sources:\n  - {id: x, name: X, homepage: 'http://x', feed: 'http://x/rss', kind: media, tier: 2, owner: x, lang: en, category: models}\n")
    with pytest.raises(RegistryError):
        load_sources(bad)
