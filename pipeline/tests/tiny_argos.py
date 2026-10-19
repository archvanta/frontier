"""Builds a tiny, randomly initialised Argos-style package (CTranslate2 Transformer + SentencePiece)
so the real ArgosEngine code path can be exercised offline. Its output is noise, not a translation."""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

CORPUS = [
    "Open model released with new weights for researchers",
    "Regulators publish draft rules for AI audits",
    "مدل جدید هوش مصنوعی برای پژوهشگران منتشر شد",
    "قانون‌گذاران پیش‌نویس قوانین ممیزی هوش مصنوعی را منتشر کردند",
    "شرکت یک تراشهٔ تازه برای مراکز داده معرفی کرد",
    "The company introduced a new chip for data centres",
] * 20


def build_package(root: Path, d: int = 16, ffn: int = 32, seed: int = 7) -> Path:
    import numpy as np
    import sentencepiece as spm
    from ctranslate2 import specs
    from ctranslate2.specs.model_spec import visit_spec

    pkg = root / "translate-en_fa-test"
    (pkg / "model").mkdir(parents=True)
    corpus = root / "corpus.txt"
    corpus.write_text("\n".join(CORPUS), encoding="utf-8")
    spm.SentencePieceTrainer.train(
        input=str(corpus), model_prefix=str(pkg / "sentencepiece"), vocab_size=120, hard_vocab_limit=False,
        character_coverage=1.0, model_type="unigram", minloglevel=2,
    )
    sp = spm.SentencePieceProcessor(model_file=str(pkg / "sentencepiece.model"))
    vocab = [sp.id_to_piece(i) for i in range(sp.get_piece_size())]
    v = len(vocab)
    rng = np.random.default_rng(seed)

    def rand(*shape: int):
        return (rng.standard_normal(shape) * 0.2).astype("float32")

    spec = specs.TransformerSpec.from_config(1, 2)
    shapes = {
        "embeddings": (v, d), "projection": (v, d),
        "self_attention/linear_0": (3 * d, d), "self_attention/linear_1": (d, d),
        "attention/linear_0": (d, d), "attention/linear_1": (2 * d, d), "attention/linear_2": (d, d),
        "ffn/linear_0": (ffn, d), "ffn/linear_1": (d, ffn),
    }

    def fill(layer, path: str, value) -> None:
        if value is not None:
            return
        attr = path.rsplit("/", 1)[-1]
        if attr == "gamma":
            setattr(layer, attr, np.ones(d, "float32"))
        elif attr == "beta":
            setattr(layer, attr, np.zeros(d, "float32"))
        else:
            setattr(layer, attr, rand(*next(s for k, s in shapes.items() if k in path)))

    visit_spec(spec, fill)
    spec.register_source_vocabulary(vocab)
    spec.register_target_vocabulary(vocab)
    spec.validate()
    spec.optimize()
    spec.save(str(pkg / "model"))
    (pkg / "metadata.json").write_text(json.dumps({"package_version": "test", "from_code": "en", "to_code": "fa"}))
    return pkg


def zip_package(pkg: Path, dest: Path) -> Path:
    with zipfile.ZipFile(dest, "w") as zf:
        for f in pkg.rglob("*"):
            zf.write(f, f.relative_to(pkg.parent))
    return dest
