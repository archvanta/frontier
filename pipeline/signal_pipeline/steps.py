"""Assembles the optional enrichment steps (images, scoring, translation) for a run."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from .fetch import Fetcher
from .sources import Source


@dataclass
class Steps:
    enrichers: list[Callable[..., None]] = field(default_factory=list)
    finalizers: list[Callable[..., dict[str, Any] | None]] = field(default_factory=list)
    translation_info: Callable[[list[dict[str, Any]]], dict[str, Any]] | None = None
    notes: list[str] = field(default_factory=list)
    _fetcher_slots: list[Callable[[Fetcher], None]] = field(default_factory=list)

    def attach_fetcher(self, fetcher: Fetcher) -> None:
        for slot in self._fetcher_slots:
            slot(fetcher)


def default_steps(sources: list[Source], og_images: bool = True, translate: bool = True) -> Steps:
    return Steps()
