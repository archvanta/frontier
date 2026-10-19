"""Optional offline English → Persian machine translation of new headlines and excerpts.

Uses the open-source Argos Translate en→fa package (a CTranslate2 model plus a SentencePiece
tokenizer), run directly with `ctranslate2` and `sentencepiece` so no PyTorch/stanza install is
needed. No translation API, no key, no network call per story: the model package is downloaded
once and cached by the workflow.

Rules:
- Originals are never modified; the translation goes in `tr.fa` with its engine and time.
- Only stories without a translation are translated: new stories first, then recent untranslated
  ones (a short backfill after an outage), with a per-run cap. Cached translations are kept as is.
- Every failure (missing dependency, download, load, a bad output) is recorded as a note and the
  run carries on with English text. `SIGNAL_TRANSLATE=0` or `--no-translate` turns it off.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import tempfile
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Protocol

ENGINE = "argos-en_fa-1.5"
MODEL_URL = "https://argos-net.com/v1/translate-en_fa-1_5.argosmodel"
# Pin the package checksum once verified on a runner; empty means "record but do not enforce".
MODEL_SHA256 = ""
MODEL_MAX_BYTES = 400_000_000
DOWNLOAD_TIMEOUT_S = 120
MAX_PER_RUN = 150
BACKFILL_DAYS = 3
DEFAULT_CACHE = Path(os.environ.get("SIGNAL_MODEL_DIR", Path.home() / ".cache" / "signal-ai" / "models"))

_ARABIC_SCRIPT = re.compile(r"[؀-ۿ]")
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"“'(])")


class Engine(Protocol):
    def translate(self, texts: list[str]) -> list[str]: ...


class TranslationUnavailable(Exception):
    pass


def split_sentences(text: str) -> list[str]:
    return [s for s in (p.strip() for p in _SENTENCE_END.split(text)) if s]


def acceptable(source: str, output: str) -> bool:
    """Rejects outputs that are empty, untranslated, or degenerate (runaway repetition)."""
    out = output.strip()
    if not out or out == source.strip():
        return False
    if not _ARABIC_SCRIPT.search(out):
        return False
    if len(out) > 4 * len(source) + 40:
        return False
    words = out.split()
    if len(words) >= 8 and max(words.count(w) for w in set(words)) > len(words) / 2:
        return False
    return True


# --- model package -----------------------------------------------------------------


def _safe_extract(zf: zipfile.ZipFile, dest: Path) -> None:
    root = dest.resolve()
    for member in zf.infolist():
        target = (dest / member.filename).resolve()
        if not str(target).startswith(str(root) + os.sep) and target != root:
            raise TranslationUnavailable(f"unsafe path in model package: {member.filename}")
    zf.extractall(dest)


def find_package_dir(base: Path) -> Path | None:
    for meta in sorted(base.rglob("metadata.json")):
        d = meta.parent
        if (d / "model" / "model.bin").exists() and (d / "sentencepiece.model").exists():
            return d
    return None


@dataclass
class ModelInfo:
    path: Path
    sha256: str
    downloaded: bool
    metadata: dict[str, Any] = field(default_factory=dict)


def ensure_model(
    cache_dir: Path = DEFAULT_CACHE,
    url: str = MODEL_URL,
    expected_sha256: str = MODEL_SHA256,
    download: Callable[[str, Path], None] | None = None,
) -> ModelInfo:
    """Returns the extracted package directory, downloading and verifying it on first use."""
    target = cache_dir / ENGINE
    marker = target / ".sha256"
    pkg = find_package_dir(target) if target.exists() else None
    if pkg and marker.exists():
        return ModelInfo(pkg, marker.read_text().strip(), False, _metadata(pkg))
    cache_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=cache_dir) as tmp:
        archive = Path(tmp) / "package.zip"
        (download or _download)(url, archive)
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        if expected_sha256 and digest != expected_sha256:
            raise TranslationUnavailable(f"model checksum mismatch ({digest[:12]}…)")
        staging = Path(tmp) / "x"
        try:
            with zipfile.ZipFile(archive) as zf:
                _safe_extract(zf, staging)
        except zipfile.BadZipFile as exc:
            raise TranslationUnavailable("model package is not a zip archive") from exc
        if not find_package_dir(staging):
            raise TranslationUnavailable("model package layout not recognised (needs model/ and sentencepiece.model)")
        shutil.rmtree(target, ignore_errors=True)
        shutil.move(str(staging), str(target))
    (target / ".sha256").write_text(digest + "\n")
    pkg = find_package_dir(target)
    assert pkg is not None
    return ModelInfo(pkg, digest, True, _metadata(pkg))


def _metadata(pkg: Path) -> dict[str, Any]:
    try:
        return json.loads((pkg / "metadata.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _download(url: str, dest: Path) -> None:
    import requests

    from . import config

    try:
        with requests.get(url, stream=True, timeout=DOWNLOAD_TIMEOUT_S, headers={"User-Agent": config.USER_AGENT}) as r:
            if r.status_code != 200:
                raise TranslationUnavailable(f"model download failed: HTTP {r.status_code}")
            size = 0
            with dest.open("wb") as fh:
                for chunk in r.iter_content(chunk_size=1 << 20):
                    size += len(chunk)
                    if size > MODEL_MAX_BYTES:
                        raise TranslationUnavailable("model download too large")
                    fh.write(chunk)
    except requests.RequestException as exc:
        raise TranslationUnavailable(f"model download failed: {type(exc).__name__}") from exc


# --- engine ---------------------------------------------------------------------------


class ArgosEngine:
    """Mirrors Argos Translate's inference: SentencePiece pieces → CTranslate2 beam search → decode."""

    def __init__(self, package_dir: Path, threads: int = 0) -> None:
        try:
            import ctranslate2
            import sentencepiece
        except ImportError as exc:
            raise TranslationUnavailable("translation dependencies not installed") from exc
        self.sp = sentencepiece.SentencePieceProcessor(model_file=str(package_dir / "sentencepiece.model"))
        self.translator = ctranslate2.Translator(str(package_dir / "model"), device="cpu", intra_threads=threads)
        self.target_prefix = str(_metadata(package_dir).get("target_prefix") or "")

    def _translate_sentences(self, sentences: list[str]) -> list[str]:
        tokenized = [self.sp.encode(s, out_type=str) for s in sentences]
        prefix = [[self.target_prefix]] * len(tokenized) if self.target_prefix else None
        results = self.translator.translate_batch(
            tokenized,
            target_prefix=prefix,
            replace_unknowns=True,
            max_batch_size=32,
            beam_size=4,
            num_hypotheses=1,
            length_penalty=0.2,
            max_decoding_length=256,
        )
        out = []
        for r in results:
            value = self.sp.decode_pieces(r.hypotheses[0]).replace("▁", " ")
            if self.target_prefix and value.startswith(self.target_prefix):
                value = value[len(self.target_prefix):]
            out.append(value.strip())
        return out

    def translate(self, texts: list[str]) -> list[str]:
        pieces: list[tuple[int, str]] = [(i, s) for i, t in enumerate(texts) for s in split_sentences(t)]
        translated = self._translate_sentences([s for _, s in pieces]) if pieces else []
        joined: dict[int, list[str]] = {}
        for (i, _), value in zip(pieces, translated):
            joined.setdefault(i, []).append(value)
        return [" ".join(joined.get(i, [])) for i in range(len(texts))]


# --- pipeline step --------------------------------------------------------------------


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


class TranslateStep:
    def __init__(
        self,
        enabled: bool = True,
        engine_factory: Callable[[], Engine] | None = None,
        max_per_run: int = MAX_PER_RUN,
    ) -> None:
        self.enabled = enabled
        self.engine_factory = engine_factory or self._default_engine
        self.max_per_run = max_per_run
        self.engine: Engine | None = None
        self.failed: str | None = None
        self.translated = 0
        self.rejected = 0
        self.notes: list[str] = []

    def _default_engine(self) -> Engine:
        info = ensure_model()
        self.notes.append(
            f"Translation model {ENGINE}: sha256 {info.sha256}"
            + (" (downloaded this run)" if info.downloaded else " (from cache)")
        )
        return ArgosEngine(info.path)

    def _load(self) -> Engine | None:
        if self.engine is None and self.failed is None:
            try:
                self.engine = self.engine_factory()
            except TranslationUnavailable as exc:
                self.failed = str(exc)
            except Exception as exc:  # a broken model must never stop publishing
                self.failed = f"translation engine failed to load: {type(exc).__name__}"
            if self.failed:
                self.notes.append(f"Translation unavailable: {self.failed}. English originals are shown.")
        return self.engine

    @staticmethod
    def wanted(a: dict[str, Any]) -> bool:
        return a.get("lang") == "en" and not ((a.get("tr") or {}).get("fa") or {}).get("title")

    def __call__(self, new: list[dict[str, Any]], pool: list[dict[str, Any]], _sources: Any, now: datetime) -> None:
        if not self.enabled:
            return
        new_ids = {a["id"] for a in new}
        cutoff = _iso(now - timedelta(days=BACKFILL_DAYS))
        backlog = [a for a in pool if a["id"] not in new_ids and a["publishedAt"] >= cutoff]
        order = sorted(new, key=lambda a: a["publishedAt"], reverse=True) + sorted(backlog, key=lambda a: a["publishedAt"], reverse=True)
        todo = [a for a in order if self.wanted(a)][: self.max_per_run]
        if not todo or self._load() is None:
            return
        assert self.engine is not None
        for start in range(0, len(todo), 16):
            batch = todo[start : start + 16]
            texts = [a["title"] for a in batch] + [a.get("excerpt") or "" for a in batch]
            try:
                out = self.engine.translate(texts)
            except Exception as exc:
                self.notes.append(f"Translation stopped after {self.translated} stories: {type(exc).__name__}")
                return
            titles, excerpts = out[: len(batch)], out[len(batch) :]
            for a, t, x in zip(batch, titles, excerpts):
                if not acceptable(a["title"], t):
                    self.rejected += 1
                    continue
                fa: dict[str, str] = {"title": t.strip()}
                if a.get("excerpt") and acceptable(a["excerpt"], x):
                    fa["excerpt"] = x.strip()
                fa["engine"] = ENGINE
                fa["at"] = _iso(now)
                a["tr"] = {**(a.get("tr") or {}), "fa": fa}
                self.translated += 1

    def summary_notes(self) -> list[str]:
        notes = list(self.notes)
        if self.enabled and self.failed is None and (self.translated or self.rejected):
            notes.append(f"Translated {self.translated} stories to Persian ({self.rejected} outputs rejected by quality checks)")
        if not self.enabled:
            notes.append("Translation disabled for this run")
        return notes

    def info(self, pool: list[dict[str, Any]]) -> dict[str, Any]:
        on = self.enabled and self.failed is None
        return {
            "enabled": on,
            "engine": ENGINE if on else None,
            "translated": sum(1 for a in pool if ((a.get("tr") or {}).get("fa") or {}).get("title")),
        }
