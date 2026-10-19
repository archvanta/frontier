"""Test doubles: an in-memory transport so tests never touch the network."""
from __future__ import annotations

from pathlib import Path
from typing import Callable

import requests

FIXTURES = Path(__file__).parent / "fixtures"


class FakeResponse:
    def __init__(self, status: int, body: bytes = b"", headers: dict[str, str] | None = None) -> None:
        self.status_code = status
        self._body = body
        self.headers = headers or {}

    def iter_content(self, chunk_size: int = 65536):
        for i in range(0, len(self._body), chunk_size):
            yield self._body[i : i + chunk_size]

    def close(self) -> None:
        pass


class FakeTransport:
    """Maps URL → FakeResponse | Exception | callable; records every request."""

    def __init__(self, routes: dict[str, object]) -> None:
        self.routes = routes
        self.calls: list[str] = []

    def __call__(self, url: str, *, timeout: float, headers: dict[str, str]) -> FakeResponse:
        self.calls.append(url)
        r = self.routes.get(url)
        if r is None:
            return FakeResponse(404)
        if isinstance(r, Exception):
            raise r
        if callable(r):
            return r()  # type: ignore[no-any-return]
        return r  # type: ignore[return-value]


def feed(name: str) -> bytes:
    return (FIXTURES / name).read_bytes()


def ok(body: bytes, ctype: str = "application/rss+xml") -> FakeResponse:
    return FakeResponse(200, body, {"Content-Type": ctype})


def no_sleep(_s: float) -> None:
    pass


Timeout = requests.Timeout
ConnectionError_ = requests.ConnectionError
Factory = Callable[[], FakeResponse]
