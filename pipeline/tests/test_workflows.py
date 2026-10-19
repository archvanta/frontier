"""Static policy checks on the GitHub Actions workflows (no network)."""
from __future__ import annotations

import re
from pathlib import Path

import yaml

WF = Path(__file__).resolve().parents[2] / ".github" / "workflows"


def load(name: str) -> dict:
    data = yaml.safe_load((WF / name).read_text())
    # PyYAML reads the bare key `on` as True.
    data["on"] = data.pop(True, data.get("on"))
    return data


def all_steps(wf: dict):
    for job in wf["jobs"].values():
        yield from job.get("steps", [])


def test_every_third_party_action_is_pinned_to_a_commit():
    for f in WF.glob("*.yml"):
        for ref in re.findall(r"uses:\s*([^\s#]+)", f.read_text()):
            if ref.startswith("./"):
                continue
            assert re.fullmatch(r"[\w.-]+/[\w.-]+@[0-9a-f]{40}", ref), f"{f.name}: {ref}"


def test_default_permissions_are_read_only():
    for f in WF.glob("*.yml"):
        assert load(f.name)["permissions"] == {"contents": "read"}, f.name


def test_collector_schedule_dispatch_and_minimal_write_scope():
    wf = load("update-news.yml")
    assert wf["on"]["schedule"] == [{"cron": "17 * * * *"}, {"cron": "47 * * * *"}]
    assert "workflow_dispatch" in wf["on"]
    assert "push" not in wf["on"]  # data commits can never retrigger collection
    assert wf["concurrency"]["cancel-in-progress"] is False
    assert wf["jobs"]["collect"]["permissions"] == {"contents": "write"}
    assert wf["jobs"]["deploy"]["permissions"] == {"contents": "read", "pages": "write", "id-token": "write"}
    text = (WF / "update-news.yml").read_text()
    assert "--force" not in text and "push -f" not in text
    assert "git diff --cached --quiet" in text  # commit only when data changed


def test_deploy_uses_official_pages_actions_with_scoped_permissions():
    wf = load("deploy.yml")
    assert {"push", "workflow_dispatch", "workflow_call"} <= set(wf["on"])
    assert wf["on"]["push"]["branches"] == ["main"]
    assert wf["jobs"]["build"]["permissions"] == {"contents": "read"}
    assert wf["jobs"]["deploy"]["permissions"] == {"pages": "write", "id-token": "write"}
    assert wf["jobs"]["deploy"]["environment"]["name"] == "github-pages"
    uses = {s["uses"].split("@")[0] for s in all_steps(wf) if "uses" in s}
    assert {"actions/configure-pages", "actions/upload-pages-artifact", "actions/deploy-pages"} <= uses


def test_ci_is_read_only_and_never_collects_or_deploys():
    wf = load("ci.yml")
    text = (WF / "ci.yml").read_text()
    assert "signal_pipeline collect" not in text and "deploy-pages" not in text
    assert all("permissions" not in job or job["permissions"] == {"contents": "read"} for job in wf["jobs"].values())


def test_no_secrets_are_referenced():
    for f in WF.glob("*.yml"):
        assert "secrets." not in f.read_text(), f.name
