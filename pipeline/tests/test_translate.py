from __future__ import annotations

import json
import zipfile
from datetime import timedelta
from pathlib import Path

import pytest

from signal_pipeline.translate import (
    ENGINE,
    TranslateStep,
    TranslationUnavailable,
    acceptable,
    ensure_model,
    split_sentences,
)
from signal_pipeline.pipeline import run

FA = "ترجمه"


class FakeEngine:
    """Deterministic stand-in: prefixes Persian text so outputs are recognisable."""

    def __init__(self) -> None:
        self.calls: list[list[str]] = []

    def translate(self, texts: list[str]) -> list[str]:
        self.calls.append(list(texts))
        return [f"{FA}: {t}" if t else "" for t in texts]


def story(aid: str, hours_ago: float, now, lang: str = "en", tr: dict | None = None, excerpt: str = "An excerpt.") -> dict:
    t = (now - timedelta(hours=hours_ago)).strftime("%Y-%m-%dT%H:%M:%SZ")
    a = {"id": aid, "title": f"Title {aid}", "excerpt": excerpt, "lang": lang, "publishedAt": t}
    if tr:
        a["tr"] = tr
    return a


def test_quality_checks():
    assert acceptable("New model released", "مدل جدید منتشر شد")
    assert acceptable("OpenAI ships GPT-6", "OpenAI مدل GPT-6 را عرضه کرد")  # Latin product names are fine
    assert not acceptable("New model", "")
    assert not acceptable("New model", "New model")
    assert not acceptable("New model", "Nouveau modèle")  # no Persian script
    assert not acceptable("Hi", "سلام " * 40)  # runaway output
    assert not acceptable("A long enough headline about chips", "تراشه تراشه تراشه تراشه تراشه تراشه تراشه تراشه تراشه")


def test_split_sentences_keeps_abbreviations_together():
    assert split_sentences("First one. Second one! Third? yes") == ["First one.", "Second one!", "Third? yes"]
    assert split_sentences("") == []
    assert split_sentences("v1.5 is out") == ["v1.5 is out"]


def test_translates_new_stories_only_and_keeps_originals(now):
    engine = FakeEngine()
    step = TranslateStep(engine_factory=lambda: engine)
    cached = {"fa": {"title": "قبلی", "engine": ENGINE, "at": "2026-10-18T00:00:00Z"}}
    new = [story("n1", 1, now), story("n2", 2, now, excerpt=""), story("fa1", 1, now, lang="fa")]
    old = [story("c1", 5, now, tr=cached), story("b1", 30, now), story("ancient", 24 * 5, now)]
    step(new, new + old, {}, now)

    assert new[0]["title"] == "Title n1" and new[0]["excerpt"] == "An excerpt."  # originals untouched
    assert new[0]["tr"]["fa"] == {"title": f"{FA}: Title n1", "excerpt": f"{FA}: An excerpt.", "engine": ENGINE, "at": "2026-10-19T12:00:00Z"}
    assert "excerpt" not in new[1]["tr"]["fa"]
    assert "tr" not in new[2]  # already Persian
    assert old[0]["tr"] == cached  # cached translation never redone
    assert old[1]["tr"]["fa"]["title"].startswith(FA)  # recent backlog (< 3 days) filled in once
    assert "tr" not in old[2]  # older archive never translated
    sent = [t for call in engine.calls for t in call]
    assert "Title c1" not in sent and "Title ancient" not in sent
    assert step.info(new + old) == {"enabled": True, "engine": ENGINE, "translated": 4}


def test_cap_per_run_prefers_newest(now):
    engine = FakeEngine()
    step = TranslateStep(engine_factory=lambda: engine, max_per_run=3)
    new = [story(f"n{i}", i, now) for i in range(10)]
    step(new, new, {}, now)
    assert [a["id"] for a in new if "tr" in a] == ["n0", "n1", "n2"]


def test_rejected_outputs_are_not_stored(now):
    class Echo:
        def translate(self, texts):
            return texts

    step = TranslateStep(engine_factory=Echo)
    new = [story("n1", 1, now)]
    step(new, new, {}, now)
    assert "tr" not in new[0]
    assert step.rejected == 1
    assert any("rejected" in n for n in step.summary_notes())


def test_nothing_to_translate_never_loads_the_model(now):
    loads = []
    step = TranslateStep(engine_factory=lambda: loads.append(1) or FakeEngine())
    step([], [story("fa", 1, now, lang="fa")], {}, now)
    assert loads == []
    assert step.info([])["enabled"] is True


def test_disabled_switch(now):
    step = TranslateStep(enabled=False, engine_factory=lambda: pytest.fail("must not load"))
    new = [story("n1", 1, now)]
    step(new, new, {}, now)
    assert "tr" not in new[0]
    assert step.info(new) == {"enabled": False, "engine": None, "translated": 0}
    assert step.summary_notes() == ["Translation disabled for this run"]


@pytest.mark.parametrize("error", [TranslationUnavailable("model download failed: HTTP 503"), RuntimeError("bad model")])
def test_load_failure_keeps_english_and_reports(now, error):
    def factory():
        raise error

    step = TranslateStep(engine_factory=factory)
    new = [story("n1", 1, now)]
    step(new, new, {}, now)
    assert "tr" not in new[0]
    assert step.info(new)["enabled"] is False
    assert any("Translation unavailable" in n for n in step.summary_notes())


def test_engine_crash_mid_run_keeps_earlier_results(now):
    class Flaky(FakeEngine):
        def translate(self, texts):
            if self.calls:
                raise RuntimeError("boom")
            return super().translate(texts)

    step = TranslateStep(engine_factory=Flaky)
    new = [story(f"n{i:02d}", i, now) for i in range(20)]  # two batches of 16 + 4
    step(new, new, {}, now)
    assert sum("tr" in a for a in new) == 16
    assert any("stopped after 16" in n for n in step.summary_notes())


def test_pipeline_publishes_news_even_when_translation_fails(sources, routes, make_fetcher, out_dir, now):
    def broken():
        raise TranslationUnavailable("translation dependencies not installed")

    step = TranslateStep(engine_factory=broken)
    fetcher, _ = make_fetcher(routes)
    report = run(out_dir, sources, fetcher, now, enrichers=[step], translation_info=step.info)
    assert report.added > 0
    meta = json.loads((out_dir / "meta.json").read_text())
    assert meta["translation"] == {"enabled": False, "engine": None, "translated": 0}


def test_pipeline_stores_translations_and_rerun_does_not_retranslate(sources, routes, make_fetcher, out_dir, now):
    engine = FakeEngine()
    step = TranslateStep(engine_factory=lambda: engine)
    fetcher, _ = make_fetcher(routes)
    run(out_dir, sources, fetcher, now, enrichers=[step], translation_info=step.info)
    entries = json.loads((out_dir / "search-index.json").read_text())["entries"]
    assert entries and all(e["tf"].startswith(FA) for e in entries)
    meta = json.loads((out_dir / "meta.json").read_text())
    assert meta["translation"]["enabled"] is True and meta["translation"]["translated"] == len(entries)

    before = {p.name: p.read_bytes() for p in out_dir.rglob("*.json")}
    engine2 = FakeEngine()
    step2 = TranslateStep(engine_factory=lambda: engine2)
    fetcher2, _ = make_fetcher(routes)
    report = run(out_dir, sources, fetcher2, now + timedelta(hours=1), enrichers=[step2], translation_info=step2.info)
    assert engine2.calls == []
    assert report.changed is False
    assert {p.name: p.read_bytes() for p in out_dir.rglob("*.json")} == before


# --- model package handling ----------------------------------------------------------


def _fake_package_zip(dest: Path, layout_ok: bool = True, evil: bool = False) -> bytes:
    with zipfile.ZipFile(dest, "w") as zf:
        zf.writestr("translate-en_fa-1_5/metadata.json", json.dumps({"from_code": "en", "to_code": "fa"}))
        if layout_ok:
            zf.writestr("translate-en_fa-1_5/model/model.bin", b"\0" * 8)
            zf.writestr("translate-en_fa-1_5/sentencepiece.model", b"\0" * 8)
        if evil:
            zf.writestr("../../escape.txt", b"x")
    return dest.read_bytes()


def test_ensure_model_downloads_once_then_uses_cache(tmp_path):
    src = tmp_path / "src.zip"
    _fake_package_zip(src)
    downloads = []

    def download(url, dest):
        downloads.append(url)
        dest.write_bytes(src.read_bytes())

    info = ensure_model(tmp_path / "cache", download=download)
    assert info.downloaded and (info.path / "model" / "model.bin").exists()
    assert len(info.sha256) == 64 and info.metadata["to_code"] == "fa"
    again = ensure_model(tmp_path / "cache", download=download)
    assert not again.downloaded and again.sha256 == info.sha256
    assert len(downloads) == 1


@pytest.mark.parametrize(
    "kind,message",
    [("checksum", "checksum mismatch"), ("layout", "layout not recognised"), ("evil", "unsafe path"), ("notzip", "not a zip")],
)
def test_ensure_model_rejects_bad_packages(tmp_path, kind, message):
    src = tmp_path / "src.zip"
    if kind == "notzip":
        src.write_bytes(b"<html>error page</html>")
    else:
        _fake_package_zip(src, layout_ok=kind != "layout", evil=kind == "evil")

    def download(url, dest):
        dest.write_bytes(src.read_bytes())

    with pytest.raises(TranslationUnavailable, match=message):
        ensure_model(tmp_path / "cache", expected_sha256="0" * 64 if kind == "checksum" else "", download=download)
    assert not (tmp_path / "escape.txt").exists()


def test_real_ctranslate2_engine_path(tmp_path):
    """Runs ArgosEngine on a tiny random model: proves the CTranslate2/SentencePiece plumbing, not quality."""
    pytest.importorskip("ctranslate2")
    pytest.importorskip("sentencepiece")
    from signal_pipeline.translate import ArgosEngine

    from .tiny_argos import build_package

    engine = ArgosEngine(build_package(tmp_path))
    out = engine.translate(["Open model released. Regulators publish draft rules!", "", "A chip"])
    assert len(out) == 3 and out[1] == ""
    assert all(isinstance(o, str) and o for o in (out[0], out[2]))
