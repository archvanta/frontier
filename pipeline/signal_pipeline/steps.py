"""Assembles the optional enrichment steps (images, scoring, translation) for a run."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from .fetch import Fetcher
from .images import ImageStep
from .picks import PicksStep
from .sources import Source
from .translate import TranslateStep


@dataclass
class Steps:
    enrichers: list[Callable[..., None]] = field(default_factory=list)
    finalizers: list[Callable[..., dict[str, Any] | None]] = field(default_factory=list)
    translation_info: Callable[[list[dict[str, Any]]], dict[str, Any]] | None = None
    _fetcher_slots: list[Callable[[Fetcher], None]] = field(default_factory=list)
    _note_slots: list[Callable[[], list[str]]] = field(default_factory=list)

    def attach_fetcher(self, fetcher: Fetcher) -> None:
        for slot in self._fetcher_slots:
            slot(fetcher)

    def notes(self) -> list[str]:
        return [n for slot in self._note_slots for n in slot()]


def default_steps(sources: list[Source], og_images: bool = True, translate: bool = True) -> Steps:
    steps = Steps()
    images = ImageStep(og_enabled=og_images)
    steps.enrichers.append(images)
    steps._fetcher_slots.append(images.attach)
    translator = TranslateStep(enabled=translate)
    steps.enrichers.append(translator)
    steps._note_slots.append(translator.summary_notes)
    steps.translation_info = translator.info
    steps.finalizers.append(PicksStep(sources))
    return steps
