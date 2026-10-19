from __future__ import annotations

import requests

from signal_pipeline.fetch import Fetcher

from .helpers import FakeResponse, FakeTransport, no_sleep, ok


def make(routes, allow=("a.test", "b.test")):
    t = FakeTransport(routes)
    return Fetcher(set(allow), transport=t, sleep=no_sleep, spacing_s=0), t


def test_blocks_non_allowlisted_hosts_and_schemes():
    f, t = make({})
    assert not f.get("https://evil.test/x").ok
    assert f.get("https://evil.test/x").error.startswith("blocked")
    assert not f.get("file:///etc/passwd").ok
    assert t.calls == []


def test_follows_redirects_only_within_allowlist():
    f, _ = make({"https://a.test/1": FakeResponse(301, headers={"Location": "https://b.test/2"}), "https://b.test/2": ok(b"<rss/>")})
    r = f.get("https://a.test/1")
    assert r.ok and r.final_url == "https://b.test/2"
    f, _ = make({"https://a.test/1": FakeResponse(302, headers={"Location": "http://169.254.169.254/latest"})})
    r = f.get("https://a.test/1")
    assert not r.ok and "blocked" in r.error


def test_size_cap():
    f, _ = make({"https://a.test/big": ok(b"x" * 2000)})
    assert f.get("https://a.test/big", max_bytes=1000).error == "response too large"
    f, _ = make({"https://a.test/big": FakeResponse(200, b"x", {"Content-Length": "999999999"})})
    assert f.get("https://a.test/big").error == "response too large"


def test_retries_transient_errors_then_succeeds():
    seq = [FakeResponse(503), FakeResponse(503), ok(b"fine")]
    f, t = make({"https://a.test/x": lambda: seq.pop(0)})
    r = f.get("https://a.test/x")
    assert r.ok and r.content == b"fine" and len(t.calls) == 3


def test_does_not_retry_client_errors_and_reports_timeouts():
    f, t = make({"https://a.test/x": FakeResponse(404)})
    assert f.get("https://a.test/x").error == "HTTP 404" and len(t.calls) == 1
    f, t = make({"https://a.test/x": requests.Timeout()})
    assert f.get("https://a.test/x").error == "timeout" and len(t.calls) == 3


def test_per_host_spacing():
    slept = []
    clock = iter([0.0, 0.2, 0.2])
    t = FakeTransport({"https://a.test/x": ok(b"1")})
    f = Fetcher({"a.test"}, transport=t, sleep=slept.append, clock=lambda: next(clock), spacing_s=1.0)
    f.get("https://a.test/x")
    f.get("https://a.test/x")
    assert slept and abs(slept[0] - 0.8) < 1e-9
