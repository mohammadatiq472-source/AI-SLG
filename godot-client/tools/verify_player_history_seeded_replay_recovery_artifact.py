#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


CONTRACT_ID = "player_history_seeded_replay_recovery_artifact_v1"
EXPECTED_CLICK_ACTION = "player_history_seeded_replay_panel_open"
EXPECTED_SMOKE_CONTRACT = "player_history_seeded_replay_recovery_identity_visual_smoke_v1"


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _is_ok_dict(value: Any) -> bool:
    return isinstance(value, dict) and bool(value.get("ok", False))


def _validate_summary(summary: dict[str, Any], summary_path: Path) -> tuple[bool, list[str], dict[str, Any]]:
    failures: list[str] = []
    artifacts = summary.get("artifacts", {})
    if not isinstance(artifacts, dict):
        artifacts = {}
    godot_report = summary.get("godotReport", {})
    if not isinstance(godot_report, dict):
        godot_report = {}
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        click_result = {}
        failures.append("clickActionResult missing")
    page_summary = click_result.get("pageContentSummary", {})
    if not isinstance(page_summary, dict):
        page_summary = {}
        failures.append("pageContentSummary missing")

    if str(summary.get("clickAction", "")).strip() != EXPECTED_CLICK_ACTION:
        failures.append("clickAction mismatch")
    if not bool(summary.get("ok", False)):
        failures.append("summary ok is false")
    if summary.get("formalContractFailures") not in ([], None):
        failures.append("formalContractFailures not empty")
    if not _is_ok_dict(summary.get("screenshotVisibilityGate", {})):
        failures.append("screenshotVisibilityGate not ok")
    if not _is_ok_dict(summary.get("screenshotStats", {})):
        failures.append("screenshotStats not ok")

    screenshot_path = Path(str(artifacts.get("screenshot", "")))
    if not screenshot_path.is_absolute():
        screenshot_path = (summary_path.parent / screenshot_path).resolve()
    if not screenshot_path.exists():
        failures.append("screenshot artifact missing")

    if click_result.get("seededReplayRecoveryVisualSmokeContract") != EXPECTED_SMOKE_CONTRACT:
        failures.append("seeded replay recovery smoke contract missing")
    if not bool(click_result.get("seededReplayRecoveryIdentityResolved", False)):
        failures.append("seeded replay recovery identity not resolved")
    if not bool(click_result.get("seededReplayRecoveryFrameLoaded", False)):
        failures.append("seeded replay recovery frame not loaded")
    if int(click_result.get("seededReplayRecoveryFrameCount", 0) or 0) <= 0:
        failures.append("seeded replay recovery frame count missing")
    if str(click_result.get("seededReplayRecoverySurfaceOpenReason", "")).strip() != "dedicated_replay_identity_opened":
        failures.append("seeded replay recovery open reason mismatch")
    if not bool(page_summary.get("dedicatedReplayScreenOpen", False)):
        failures.append("dedicated replay screen not open")
    if not bool(page_summary.get("replayFrameLoaded", False)):
        failures.append("page summary replay frame not loaded")
    if bool(page_summary.get("replayUnavailableCopyVisible", False)):
        failures.append("unexpected replay unavailable copy visible")
    if bool(page_summary.get("timelineRecoveryReplayIdentityResolved", False)) is not True:
        failures.append("timeline recovery replay identity not resolved")

    proof = {
        "contractId": CONTRACT_ID,
        "summaryPath": str(summary_path),
        "screenshotPath": str(screenshot_path),
        "clickAction": summary.get("clickAction"),
        "frameCount": int(click_result.get("seededReplayRecoveryFrameCount", 0) or 0),
        "surfaceOpenReason": click_result.get("seededReplayRecoverySurfaceOpenReason", ""),
        "identityResolved": bool(click_result.get("seededReplayRecoveryIdentityResolved", False)),
        "replayFrameLoaded": bool(click_result.get("seededReplayRecoveryFrameLoaded", False)),
    }
    return not failures, failures, proof


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify player-history seeded replay recovery visual-smoke artifacts.")
    parser.add_argument("--summary", required=True, help="Path to mainline_visual_smoke_summary.json")
    parser.add_argument("--output", default="", help="Optional path to write a verification report JSON")
    args = parser.parse_args()

    summary_path = Path(args.summary).resolve()
    summary = _read_json(summary_path)
    ok, failures, proof = _validate_summary(summary, summary_path)
    report = {
        "ok": ok,
        "contractId": CONTRACT_ID,
        "failures": failures,
        "proof": proof,
    }
    if args.output:
        output_path = Path(args.output).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
