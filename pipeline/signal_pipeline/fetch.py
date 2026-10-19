"""Polite, bounded HTTP fetching restricted to an allowlist of hosts.

- Only https/http URLs on allowlisted hosts (checked again on every redirect hop).
- Timeout, response-size cap, limited retries with backoff, per-host spacing.
- Never raises for network problems: returns a FetchResult with an error string.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable, Protocol
from urllib.parse import urljoin, urlsplit

import requests

from . import config


@dataclass
class FetchResult:
    url: str
    ok: bool
    status: int = 0
    content: bytes = b""
    final_url: str = ""
    content_type: str = ""
    error: str = ""


class Transport(Protocol):
    def __call__(self, url: str, *, timeout: float, headers: dict[str, str]) -> requests.Response: ...


def _requests_transport(session: requests.Session) -> Transport:
    def call(url: str, *, timeout: float, headers: dict[str, str]) -> requests.Response:
        return session.get(url, timeout=timeout, headers=headers, allow_redirects=False, stream=True)

    return call


class Fetcher:
    def __init__(
        self,
        allowlist: set[str],
        transport: Transport | None = None,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
        spacing_s: float = config.FETCH_HOST_SPACING_S,
    ) -> None:
        self.allowlist = {h.lower() for h in allowlist}
        self.transport = transport or _requests_transport(requests.Session())
        self.sleep = sleep
        self.clock = clock
        self.spacing_s = spacing_s
        self._last_hit: dict[str, float] = {}

    def allowed(self, url: str) -> bool:
        parts = urlsplit(url)
        return parts.scheme in ("https", "http") and (parts.hostname or "").lower() in self.allowlist

    def _space(self, host: str) -> None:
        last = self._last_hit.get(host)
        if last is not None:
            wait = self.spacing_s - (self.clock() - last)
            if wait > 0:
                self.sleep(wait)
        self._last_hit[host] = self.clock()

    def get(self, url: str, accept: str = "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5", max_bytes: int = config.FETCH_MAX_BYTES) -> FetchResult:
        headers = {"User-Agent": config.USER_AGENT, "Accept": accept}
        last_error = ""
        for attempt in range(config.FETCH_RETRIES + 1):
            if attempt:
                self.sleep(config.FETCH_BACKOFF_S * attempt)
            result = self._get_once(url, headers, max_bytes)
            if result.ok:
                return result
            last_error = result.error
            # Retry only transient failures.
            if not (result.status >= 500 or result.status == 429 or result.status == 0) or result.error.startswith("blocked"):
                return result
        return FetchResult(url=url, ok=False, error=last_error)

    def _get_once(self, url: str, headers: dict[str, str], max_bytes: int) -> FetchResult:
        current = url
        for _ in range(config.MAX_REDIRECTS + 1):
            if not self.allowed(current):
                return FetchResult(url=url, ok=False, error=f"blocked: host not allowlisted ({urlsplit(current).hostname})")
            self._space((urlsplit(current).hostname or "").lower())
            try:
                resp = self.transport(current, timeout=config.FETCH_TIMEOUT_S, headers=headers)
            except requests.Timeout:
                return FetchResult(url=url, ok=False, error="timeout")
            except requests.RequestException as exc:
                return FetchResult(url=url, ok=False, error=f"network error: {type(exc).__name__}")
            try:
                if resp.status_code in (301, 302, 303, 307, 308):
                    loc = resp.headers.get("Location")
                    if not loc:
                        return FetchResult(url=url, ok=False, status=resp.status_code, error="redirect without location")
                    current = urljoin(current, loc)
                    continue
                if resp.status_code != 200:
                    return FetchResult(url=url, ok=False, status=resp.status_code, error=f"HTTP {resp.status_code}")
                declared = resp.headers.get("Content-Length")
                if declared and declared.isdigit() and int(declared) > max_bytes:
                    return FetchResult(url=url, ok=False, status=200, error="response too large")
                body = bytearray()
                for chunk in resp.iter_content(chunk_size=65536):
                    body.extend(chunk)
                    if len(body) > max_bytes:
                        return FetchResult(url=url, ok=False, status=200, error="response too large")
                return FetchResult(
                    url=url,
                    ok=True,
                    status=200,
                    content=bytes(body),
                    final_url=current,
                    content_type=resp.headers.get("Content-Type", ""),
                )
            except requests.RequestException as exc:
                return FetchResult(url=url, ok=False, error=f"network error: {type(exc).__name__}")
            finally:
                resp.close()
        return FetchResult(url=url, ok=False, error="too many redirects")
