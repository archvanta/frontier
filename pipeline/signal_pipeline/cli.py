"""Command line entry point: `python -m signal_pipeline collect --out ../public/data`."""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from .fetch import Fetcher
from .pipeline import RunReport, run
from .sources import REGISTRY_PATH, allowed_hosts, load_sources
from .store import utc_now


def _summary(report: RunReport) -> str:
    ok = [s for s in report.sources if s["status"] == "ok"]
    bad = [s for s in report.sources if s["status"] == "error"]
    lines = [
        "## SIGNAL AI collection run",
        "",
        f"- New stories: **{report.added}**",
        f"- Data changed: **{'yes' if report.changed else 'no'}**",
        f"- Sources OK: {len(ok)} · failing: {len(bad)}",
    ]
    lines += [f"- {n}" for n in report.notes]
    if bad:
        lines += ["", "| Failing source | Error |", "|---|---|"]
        lines += [f"| {s['name']} | {s.get('lastError', '')} |" for s in bad]
    return "\n".join(lines) + "\n"


def cmd_collect(args: argparse.Namespace) -> int:
    from .steps import default_steps

    sources = load_sources(Path(args.sources))
    if args.only:
        wanted = set(args.only.split(","))
        sources = [s for s in sources if s.id in wanted]
    now = datetime.fromisoformat(args.now.replace("Z", "+00:00")).astimezone(timezone.utc) if args.now else utc_now()
    steps = default_steps(sources, og_images=not args.no_og, translate=not args.no_translate and os.environ.get("SIGNAL_TRANSLATE", "1") != "0")
    fetcher = Fetcher(allowed_hosts(sources))
    steps.attach_fetcher(fetcher)
    report = run(Path(args.out), sources, fetcher, now, enrichers=steps.enrichers, finalizers=steps.finalizers, translation_info=steps.translation_info)
    report.notes.extend(steps.notes())
    text = _summary(report)
    sys.stdout.write(text)
    summary_file = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_file:
        with open(summary_file, "a", encoding="utf-8") as fh:
            fh.write(text)
    # A run where every source failed is a real problem worth a red workflow; partial failure is not.
    return 1 if report.sources and all(s["status"] != "ok" for s in report.sources if s["enabled"]) else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="signal_pipeline")
    sub = parser.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("collect", help="fetch feeds and update the static dataset")
    c.add_argument("--out", default="../public/data")
    c.add_argument("--sources", default=str(REGISTRY_PATH))
    c.add_argument("--only", help="comma-separated source ids (debugging)")
    c.add_argument("--now", help="override current time (ISO-8601), for reproducible runs")
    c.add_argument("--no-og", action="store_true", help="never fetch article pages for og:image")
    c.add_argument("--no-translate", action="store_true", help="skip offline translation")
    c.set_defaults(func=cmd_collect)
    args = parser.parse_args(argv)
    return int(args.func(args))
