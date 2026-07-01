#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
TMP_DIR = REPO_ROOT / "tmp"
DEFAULT_OUTPUT = TMP_DIR / "gates" / "camera_zoom_focus_mobile_acceptance_gate_plan.json"
GATE_ID = "camera_zoom_focus_mobile_acceptance_gate_v1"
WORLD_ID = "unified_aoi_v0_6_formal_real_map_data_1km"
COORDINATE_SPACE = "real_map_data_1km.cell_1km"

CASES = [
    {
        "caseId": "wheel_pivot",
        "goal": "keep mouse-wheel zoom pivot stable in a 2K landscape viewport",
        "thresholds": {
            "wheelPivotDriftPxMax": 2,
            "pivotCellDriftMax": 1,
        },
        "requiredFields": [
            "wheelPivotDriftPx",
            "pivotCellDrift",
            "zoomBefore",
            "zoomAfter",
            "pivotScreen",
            "pivotCellBefore",
            "pivotCellAfter",
        ],
    },
    {
        "caseId": "pinch_pivot",
        "goal": "keep two-finger midpoint stable for main-world and Tianxia zoom",
        "thresholds": {
            "pinchPivotDriftPxMax": 3,
            "pinchPivotCellDriftMax": 1,
        },
        "requiredFields": [
            "pinchPivotDriftPx",
            "pinchPivotCellDrift",
            "pinchMidpointScreen",
            "pinchCellBefore",
            "pinchCellAfter",
            "zoomBefore",
            "zoomAfter",
        ],
    },
    {
        "caseId": "state_jump",
        "goal": "jump from overview into state focus with stable arrival and large map coverage",
        "thresholds": {
            "stateFillRatio2kMin": 0.62,
            "focusSettleTimeMsMax": 900,
            "focusEndDriftCellsMax": 2,
        },
        "requiredFields": [
            "stateFillRatio2k",
            "focusSettleTimeMs",
            "focusEndDriftCells",
            "focusRingVisible",
            "worldMapFocusMotionToken",
            "focusTargetStateId",
            "focusEndCenterCell",
        ],
    },
    {
        "caseId": "state_detail_zoom",
        "goal": "reveal labels, boundaries, line-network detail, and nodes by zoom tier",
        "thresholds": {
            "labelOverlapCountExact": 0,
            "nodeVisibleCountMin": 1,
        },
        "requiredFields": [
            "labelOverlapCount",
            "boundaryVisible",
            "lineNetworkVisible",
            "nodeVisibleCount",
            "farTierLabelCount",
            "mediumTierLabelCount",
            "nearTierLabelCount",
            "labelBudgetUsed",
        ],
    },
    {
        "caseId": "marker_hit",
        "goal": "keep marker hit targeting stable across zoom tiers",
        "thresholds": {
            "hitRadiusPxMin": 22,
            "wrongTargetCountExact": 0,
        },
        "requiredFields": [
            "hitRadiusPx",
            "hitDistancePx",
            "allHitOk",
            "allSelectionOk",
            "allHoverOk",
            "wrongTargetCount",
            "selectedTargetId",
            "selectedTargetScope",
            "zoomTier",
        ],
    },
    {
        "caseId": "low_end_cache",
        "goal": "keep chunk growth, cache churn, and memory within budget under repeated pan/zoom",
        "thresholds": {
            "cacheUnloadOkExact": True,
        },
        "requiredFields": [
            "loadedChunkCount",
            "loadedChunkBudget",
            "newChunkIds",
            "retainedCacheChunkIds",
            "unloadCandidateChunkIds",
            "viewportCacheHitCount",
            "viewportStaleResponseCount",
            "memoryPeakMb",
            "memoryAfterUnloadMb",
            "memoryRecoveredMb",
            "cacheUnloadOk",
        ],
    },
]

REQUIRED_RUNTIME_FIELDS = [
    "runtimeProducerOk",
    "runtimeProducerInvalidFields",
    "runtimeProducerFieldSources",
    "stateFillRatio2k",
    "wheelPivotDriftPx",
    "pinchPivotDriftPx",
    "pivotCellDrift",
    "focusSettleTimeMs",
    "hitRadiusPx",
    "labelOverlapCount",
    "loadedChunkCount",
    "loadedChunkIds",
    "unloadCandidateChunkIds",
    "viewportCacheHitCount",
    "viewportStaleResponseCount",
    "memoryPeakMb",
    "memoryAfterUnloadMb",
    "memoryRecoveredMb",
    "cacheUnloadOk",
]

NUMERIC_RUNTIME_FIELDS = [
    "stateFillRatio2k",
    "wheelPivotDriftPx",
    "pinchPivotDriftPx",
    "pivotCellDrift",
    "focusSettleTimeMs",
    "hitRadiusPx",
    "labelOverlapCount",
    "loadedChunkCount",
    "viewportCacheHitCount",
    "viewportStaleResponseCount",
    "memoryPeakMb",
    "memoryAfterUnloadMb",
    "memoryRecoveredMb",
]

REQUIRED_PRODUCER_SOURCE_FIELDS = [
    "stateFillRatio2k",
    "wheelPivotDriftPx",
    "pinchPivotDriftPx",
    "pivotCellDrift",
    "focusSettleTimeMs",
    "hitRadiusPx",
    "labelOverlapCount",
    "loadedChunkCount",
    "loadedChunkIds",
    "unloadCandidateChunkIds",
    "viewportCacheHitCount",
    "viewportStaleResponseCount",
    "memoryPeakMb",
    "memoryAfterUnloadMb",
    "memoryRecoveredMb",
    "cacheUnloadOk",
]

RUNTIME_THRESHOLD_RULES = [
    ("stateFillRatio2k", ">=", 0.62),
    ("wheelPivotDriftPx", "<=", 2.0),
    ("pinchPivotDriftPx", "<=", 3.0),
    ("pivotCellDrift", "<=", 1.0),
    ("focusSettleTimeMs", "<=", 900.0),
    ("hitRadiusPx", ">=", 22.0),
    ("labelOverlapCount", "==", 0.0),
    ("cacheUnloadOk", "==", True),
]

UNIFIED_COMMANDS = [
    "npm.cmd run ops:service-process-guard",
    "npx.cmd tsx server/tests/godot_camera_zoom_focus_mobile_acceptance_gate_contract.test.ts",
    "npm.cmd run test:world:map-focus-motion-contract",
    "npx.cmd tsx server/tests/world_map_layout_main_world_cell_layer_contract.test.ts",
    "npx.cmd tsx server/tests/world_map_layout_layered_adapter_contract.test.ts",
    "npx.cmd tsx server/tests/world_map_layout_layered_cache_unload_contract.test.ts",
    "scripts\\run_python.cmd scripts\\run_camera_zoom_focus_mobile_acceptance_gate.py --print-plan --output tmp/gates/camera_zoom_focus_mobile_acceptance_gate_plan.json",
    "npm.cmd run godot:mainline:visual-smoke -- --click-action world_mainworld_camera_pan_resource_roundtrip_fixture --isolated-backend-state --timeout-sec 420 --backend-timeout-sec 180",
    "npm.cmd run godot:strategic-nodes:zoom-hit-gate",
    "npm.cmd run ops:service-process-guard",
]


def build_plan() -> dict[str, object]:
    return {
        "gateId": GATE_ID,
        "planOnly": True,
        "status": "plan_only_not_executed",
        "runtimeReportMissing": False,
        "runtimeSummaryPresent": False,
        "runtimeSummaryIncomplete": False,
        "runtimeSummaryProducerFailed": False,
        "runtimeSummaryThresholdFailed": False,
        "worldId": WORLD_ID,
        "coordinateSpace": COORDINATE_SPACE,
        "cases": CASES,
        "artifacts": {
            "summaryJson": "tmp/gates/camera_zoom_focus_mobile_acceptance_gate.json",
            "planJson": str(DEFAULT_OUTPUT.relative_to(REPO_ROOT)).replace("\\", "/"),
            "screenshotsDir": "tmp/screenshots/camera_zoom_focus_mobile_acceptance/<timestamp>/",
        },
        "processGuardRequirement": {
            "beforeSmoke": "npm.cmd run ops:service-process-guard",
            "afterSmoke": "npm.cmd run ops:service-process-guard",
        },
        "evidenceBundle": {
            "reportPath": "",
            "reportPathPresent": False,
            "realGodotReport": False,
            "fixtureOnlyNotRuntimeEvidence": False,
            "runtimeSummaryFreshness": "plan_only",
            "runtimeSummaryPresent": False,
            "screenshotEvidencePaths": [],
            "screenshotEvidencePresent": False,
            "requiredMetricCoverage": {
                "required": REQUIRED_RUNTIME_FIELDS,
                "missing": REQUIRED_RUNTIME_FIELDS,
                "covered": [],
            },
            "arraySampleCounts": {
                "loadedChunkIds": 0,
                "unloadCandidateChunkIds": 0,
            },
            "failureSummary": {
                "missingFields": [],
                "typeFailures": [],
                "producerFailures": [],
                "missingProducerSourceFields": [],
                "thresholdFailures": [],
            },
            "tmpCleanupHint": [
                "tmp/gates/camera_zoom_focus_mobile_acceptance_gate.json",
                "tmp/screenshots/camera_zoom_focus_mobile_acceptance/<timestamp>/",
            ],
            "productGreenEligible": False,
            "productGreenBlockers": ["planOnly"],
        },
        "recommendedCommands": UNIFIED_COMMANDS,
        "notes": [
            "This script is a skeleton and does not start dev/watch/server/Godot in this pass.",
            "Runtime summary wiring now targets smoke report and click-action summary fields when a Godot report JSON is provided.",
            "This pass still does not execute Godot; it only verifies the read path and contract surface.",
        ],
    }


def _read_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def _as_repo_relative_path(path: Path | None) -> str:
    if path is None:
        return ""
    try:
        return str(path.resolve().relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return str(path)


def _is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _runtime_type_failures(runtime_summary: dict[str, object]) -> list[str]:
    failures: list[str] = []
    for field in NUMERIC_RUNTIME_FIELDS:
        if not _is_number(runtime_summary.get(field)):
            failures.append(f"{field} non_numeric_or_missing")
    if not isinstance(runtime_summary.get("loadedChunkIds"), list):
        failures.append("loadedChunkIds non_array_or_missing")
    elif not runtime_summary.get("loadedChunkIds"):
        failures.append("loadedChunkIds empty_array")
    if not isinstance(runtime_summary.get("unloadCandidateChunkIds"), list):
        failures.append("unloadCandidateChunkIds non_array_or_missing")
    elif not runtime_summary.get("unloadCandidateChunkIds"):
        failures.append("unloadCandidateChunkIds empty_array")
    if _is_number(runtime_summary.get("loadedChunkCount")) and isinstance(runtime_summary.get("loadedChunkIds"), list):
        loaded_chunk_count = int(runtime_summary.get("loadedChunkCount", 0))
        loaded_chunk_id_count = len(runtime_summary.get("loadedChunkIds", []))
        if loaded_chunk_count != loaded_chunk_id_count:
            failures.append(
                f"loadedChunkCount count_mismatch loadedChunkIds (count={loaded_chunk_count}, ids={loaded_chunk_id_count})"
            )
    if not isinstance(runtime_summary.get("cacheUnloadOk"), bool):
        failures.append("cacheUnloadOk non_bool_or_missing")
    if not isinstance(runtime_summary.get("runtimeProducerOk"), bool):
        failures.append("runtimeProducerOk non_bool_or_missing")
    if not isinstance(runtime_summary.get("runtimeProducerInvalidFields"), list):
        failures.append("runtimeProducerInvalidFields non_array_or_missing")
    if not isinstance(runtime_summary.get("runtimeProducerFieldSources"), dict):
        failures.append("runtimeProducerFieldSources non_object_or_missing")
    return failures


def _missing_producer_source_fields(runtime_summary: dict[str, object]) -> list[str]:
    field_sources = runtime_summary.get("runtimeProducerFieldSources", {})
    if not isinstance(field_sources, dict):
        return []
    return [
        field
        for field in REQUIRED_PRODUCER_SOURCE_FIELDS
        if not isinstance(field_sources.get(field), str) or not str(field_sources.get(field, "")).strip()
    ]


def _runtime_producer_failures(runtime_summary: dict[str, object]) -> list[str]:
    failures: list[str] = []
    invalid_fields = runtime_summary.get("runtimeProducerInvalidFields", [])
    if runtime_summary.get("runtimeProducerOk") is not True:
        failures.append("runtimeProducerOk!=true")
    if isinstance(invalid_fields, list) and invalid_fields:
        failures.append("runtimeProducerInvalidFields=%s" % ",".join(str(field) for field in invalid_fields))
    missing_source_fields = _missing_producer_source_fields(runtime_summary)
    if missing_source_fields:
        failures.append("runtimeProducerFieldSources missing=%s" % ",".join(missing_source_fields))
    return failures


def _runtime_threshold_failures(runtime_summary: dict[str, object]) -> list[str]:
    failures: list[str] = []
    for field, operator, threshold in RUNTIME_THRESHOLD_RULES:
        value = runtime_summary.get(field)
        ok = False
        if operator == "==" and isinstance(threshold, bool):
            ok = value is threshold
        elif _is_number(value) and _is_number(threshold):
            numeric_value = float(value)
            numeric_threshold = float(threshold)
            if operator == ">=":
                ok = numeric_value >= numeric_threshold
            elif operator == "<=":
                ok = numeric_value <= numeric_threshold
            elif operator == "==":
                ok = numeric_value == numeric_threshold
        if not ok:
            failures.append(f"{field} {operator} {threshold} failed (actual={value})")
    return failures


def _collect_string_paths(value: object, key_hint: str = "") -> list[str]:
    paths: list[str] = []
    normalized_hint = key_hint.lower()
    if isinstance(value, str):
        looks_like_path = "/" in value or "\\" in value or value.endswith((".json", ".png", ".jpg", ".jpeg", ".webp"))
        looks_like_evidence = any(token in normalized_hint for token in ("path", "screenshot", "evidence", "summary"))
        if looks_like_path and looks_like_evidence:
            paths.append(value)
    elif isinstance(value, list):
        for item in value:
            paths.extend(_collect_string_paths(item, key_hint))
    elif isinstance(value, dict):
        for key, item in value.items():
            paths.extend(_collect_string_paths(item, str(key)))
    return paths


def _collect_screenshot_paths(report: dict[str, object]) -> list[str]:
    candidates: list[str] = []
    for key, value in report.items():
        if "screenshot" in str(key).lower() or "evidence" in str(key).lower():
            candidates.extend(_collect_string_paths(value, str(key)))
    deduped: list[str] = []
    for path in candidates:
        if path not in deduped:
            deduped.append(path)
    return deduped


def _build_evidence_bundle(
    report: dict[str, object],
    runtime_summary: dict[str, object],
    status: str,
    report_path: Path | None,
    missing_fields: list[str],
    type_failures: list[str],
    producer_failures: list[str],
    missing_producer_source_fields: list[str],
    threshold_failures: list[str],
    array_sample_counts: dict[str, int],
) -> dict[str, object]:
    screenshot_paths = _collect_screenshot_paths(report)
    fixture_only = bool(runtime_summary.get("fixtureOnlyNotRuntimeEvidence", False))
    report_path_value = _as_repo_relative_path(report_path)
    runtime_summary_present = status == "runtimeSummaryPresent"
    product_green_blockers: list[str] = []
    if not report_path_value:
        product_green_blockers.append("reportPathMissing")
    if fixture_only:
        product_green_blockers.append("fixtureOnlyNotRuntimeEvidence")
    if not runtime_summary_present:
        product_green_blockers.append(status)
    if not screenshot_paths:
        product_green_blockers.append("screenshotEvidenceMissing")
    product_green_eligible = not product_green_blockers
    return {
        "reportPath": report_path_value,
        "reportPathPresent": bool(report_path_value),
        "realGodotReport": bool(report_path_value) and not fixture_only,
        "fixtureOnlyNotRuntimeEvidence": fixture_only,
        "runtimeSummaryFreshness": "fixture_only" if fixture_only else ("report_path_supplied" if report_path_value else "unknown"),
        "runtimeSummaryPresent": runtime_summary_present,
        "screenshotEvidencePaths": screenshot_paths,
        "screenshotEvidencePresent": bool(screenshot_paths),
        "requiredMetricCoverage": {
            "required": REQUIRED_RUNTIME_FIELDS,
            "missing": missing_fields,
            "covered": [field for field in REQUIRED_RUNTIME_FIELDS if field not in missing_fields],
        },
        "arraySampleCounts": array_sample_counts,
        "failureSummary": {
            "missingFields": missing_fields,
            "typeFailures": type_failures,
            "producerFailures": producer_failures,
            "missingProducerSourceFields": missing_producer_source_fields,
            "thresholdFailures": threshold_failures,
        },
        "tmpCleanupHint": [
            "tmp/gates/camera_zoom_focus_mobile_acceptance_gate.json",
            "tmp/screenshots/camera_zoom_focus_mobile_acceptance/<timestamp>/",
        ],
        "productGreenEligible": product_green_eligible,
        "productGreenBlockers": product_green_blockers,
    }


def _extract_runtime_summary(report: dict[str, object], report_path: Path | None = None) -> dict[str, object]:
    runtime_summary = report.get("cameraZoomFocusRuntimeSummary", {})
    if not isinstance(runtime_summary, dict):
        runtime_summary = {}

    runtime_report_missing = not bool(runtime_summary)
    loaded_chunk_ids = runtime_summary.get("loadedChunkIds", [])
    unload_candidate_chunk_ids = runtime_summary.get("unloadCandidateChunkIds", [])
    array_sample_counts = {
        "loadedChunkIds": len(loaded_chunk_ids) if isinstance(loaded_chunk_ids, list) else 0,
        "unloadCandidateChunkIds": len(unload_candidate_chunk_ids) if isinstance(unload_candidate_chunk_ids, list) else 0,
    }
    missing_fields: list[str] = []
    for field in REQUIRED_RUNTIME_FIELDS:
        if field not in runtime_summary:
            missing_fields.append(field)

    type_failures = [] if runtime_report_missing or missing_fields else _runtime_type_failures(runtime_summary)
    missing_producer_source_fields = (
        []
        if runtime_report_missing or missing_fields or type_failures
        else _missing_producer_source_fields(runtime_summary)
    )
    producer_failures = [] if runtime_report_missing or missing_fields or type_failures else _runtime_producer_failures(runtime_summary)
    threshold_failures = [] if runtime_report_missing or missing_fields or type_failures or producer_failures else _runtime_threshold_failures(runtime_summary)

    status = "runtimeSummaryPresent"
    if runtime_report_missing:
        status = "runtimeReportMissing"
        missing_fields = ["cameraZoomFocusRuntimeSummary"]
    elif missing_fields:
        status = "runtimeSummaryIncomplete"
    elif type_failures:
        status = "runtimeSummaryIncomplete"
    elif producer_failures:
        status = "runtimeSummaryProducerFailed"
    elif threshold_failures:
        status = "runtimeSummaryThresholdFailed"
    evidence_bundle = _build_evidence_bundle(
        report,
        runtime_summary,
        status,
        report_path,
        missing_fields,
        type_failures,
        producer_failures,
        missing_producer_source_fields,
        threshold_failures,
        array_sample_counts,
    )

    return {
        "gateId": GATE_ID,
        "planOnly": False,
        "status": status,
        "runtimeReportMissing": runtime_report_missing,
        "runtimeSummaryPresent": status == "runtimeSummaryPresent",
        "runtimeSummaryIncomplete": status == "runtimeSummaryIncomplete",
        "runtimeSummaryProducerFailed": status == "runtimeSummaryProducerFailed",
        "runtimeSummaryThresholdFailed": status == "runtimeSummaryThresholdFailed",
        "missingFields": missing_fields,
        "typeFailures": type_failures,
        "producerFailures": producer_failures,
        "missingProducerSourceFields": missing_producer_source_fields,
        "thresholdFailures": threshold_failures,
        "arraySampleCounts": array_sample_counts,
        "evidenceBundle": evidence_bundle,
        "worldId": WORLD_ID,
        "coordinateSpace": COORDINATE_SPACE,
        "cases": CASES,
        "stateFillRatio2k": runtime_summary.get("stateFillRatio2k"),
        "wheelPivotDriftPx": runtime_summary.get("wheelPivotDriftPx"),
        "pinchPivotDriftPx": runtime_summary.get("pinchPivotDriftPx"),
        "pivotCellDrift": runtime_summary.get("pivotCellDrift"),
        "focusSettleTimeMs": runtime_summary.get("focusSettleTimeMs"),
        "hitRadiusPx": runtime_summary.get("hitRadiusPx"),
        "labelOverlapCount": runtime_summary.get("labelOverlapCount"),
        "loadedChunkCount": runtime_summary.get("loadedChunkCount"),
        "loadedChunkIds": runtime_summary.get("loadedChunkIds", []),
        "unloadCandidateChunkIds": runtime_summary.get("unloadCandidateChunkIds", []),
        "viewportCacheHitCount": runtime_summary.get("viewportCacheHitCount"),
        "viewportStaleResponseCount": runtime_summary.get("viewportStaleResponseCount"),
        "memoryPeakMb": runtime_summary.get("memoryPeakMb"),
        "memoryAfterUnloadMb": runtime_summary.get("memoryAfterUnloadMb"),
        "memoryRecoveredMb": runtime_summary.get("memoryRecoveredMb"),
        "cacheUnloadOk": runtime_summary.get("cacheUnloadOk"),
        "runtimeProducerOk": runtime_summary.get("runtimeProducerOk"),
        "runtimeProducerInvalidFields": runtime_summary.get("runtimeProducerInvalidFields", []),
        "runtimeProducerFieldSources": runtime_summary.get("runtimeProducerFieldSources", {}),
        "summarySource": {
            "topLevelRuntimeSummary": bool(runtime_summary),
            "clickActionSummary": bool(report.get("clickActionResult", {})),
            "mainMapStreaming": bool(report.get("mainMapStreaming", {})),
        },
        "runtimeSummary": runtime_summary,
        "errors": (
            []
            if not runtime_report_missing and not missing_fields and not type_failures and not producer_failures and not threshold_failures
            else (
                [f"cameraZoomFocusRuntimeSummary missing"]
                if runtime_report_missing
                else [f"missing required fields: {', '.join(missing_fields)}"]
                if missing_fields
                else type_failures
                if type_failures
                else producer_failures
                if producer_failures
                else threshold_failures
            )
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Plan-only skeleton for the camera zoom / focus / mobile acceptance gate."
    )
    parser.add_argument(
        "--print-plan",
        action="store_true",
        help="Print the gate plan JSON to stdout. This is the default behavior.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Optional plan JSON output path.",
    )
    parser.add_argument(
        "--run",
        action="store_true",
        help="Reserved for a future heavy smoke implementation. Not available in this skeleton.",
    )
    parser.add_argument(
        "--godot-report",
        type=Path,
        help="Read an existing Godot visual smoke report JSON and extract runtime camera/zoom summary fields without starting Godot.",
    )
    args = parser.parse_args()

    if args.run:
        print(
            json.dumps(
                {
                    "ok": False,
                    "gateId": GATE_ID,
                    "error": "run_mode_not_implemented",
                    "message": "This skeleton only prepares the acceptance contract and command plan.",
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 2

    plan = build_plan()
    exit_code = 0
    if args.godot_report is not None:
        plan = _extract_runtime_summary(_read_json(args.godot_report), args.godot_report)
        if plan.get("runtimeSummaryPresent") is not True:
            exit_code = 2
    output_path = args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.print_plan:
        print(json.dumps(plan, ensure_ascii=False, indent=2))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
