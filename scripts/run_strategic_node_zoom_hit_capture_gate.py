#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen


REPO_ROOT = Path(__file__).resolve().parents[1]
TMP_DIR = REPO_ROOT / "tmp"
BASE_ARTIFACT_DIR = TMP_DIR / "screenshots" / "world_resource_alignment"
GATE_ARTIFACT_DIR = BASE_ARTIFACT_DIR / "strategic_node_zoom_hit_gate"
GATE_SUMMARY_PATH = TMP_DIR / "gates" / "strategic_node_zoom_hit_gate.json"

SOURCE_CAPTURE_METADATA = BASE_ARTIFACT_DIR / "world_cell_runtime_preview_capture_live_nodes.json"
SOURCE_CAPTURE_FULL = BASE_ARTIFACT_DIR / "world_cell_runtime_preview_capture_live_nodes.png"
SOURCE_CAPTURE_CROP = BASE_ARTIFACT_DIR / "world_cell_runtime_preview_capture_live_nodes_crop.png"

NODE_TYPES = ("pass", "fort", "dock")

CASES = [
    {
        "case_id": "fort_pass_yizhou",
        "center_x": 96,
        "center_y": 214,
        "expected_nonzero_types": ["pass", "fort"],
    },
    {
        "case_id": "dock_pass_yangzhou",
        "center_x": 224,
        "center_y": 224,
        "expected_nonzero_types": ["pass", "dock"],
    },
]

ZOOM_TIERS = [
    {"tier": "close_8x8", "camera_zoom": "2.10", "visible_cells": "8x8", "expected_visible_cells": {"width": 8, "height": 8}},
    {"tier": "default_9x9", "camera_zoom": "1.68", "visible_cells": "9x9", "expected_visible_cells": {"width": 9, "height": 9}},
    {"tier": "far_14x14", "camera_zoom": "0.42", "visible_cells": "14x14", "expected_visible_cells": {"width": 14, "height": 14}},
]


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _create_no_window_flags() -> int:
    if os.name != "nt":
        return 0
    return int(getattr(subprocess, "CREATE_NO_WINDOW", 0))


def _resolve_node_exe() -> str:
    return os.getenv("NODE_EXE", "").strip() or shutil.which("node") or ""


def _resolve_npm_exe() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"


def _run_service_process_prestart_guard(log_file) -> tuple[bool, str]:
    completed = subprocess.run(
        [_resolve_npm_exe(), "run", "ops:service-process-prestart"],
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    output = completed.stdout or ""
    if output:
        log_file.write(b"[service-process-prestart]\n")
        log_file.write(output.encode("utf-8", errors="replace"))
        if not output.endswith("\n"):
            log_file.write(b"\n")
        log_file.flush()
    return completed.returncode == 0, output[-4000:]


def _check_health(base_url: str, timeout_sec: float) -> tuple[bool, str]:
    try:
        with urlopen(f"{base_url.rstrip('/')}/api/health", timeout=timeout_sec) as response:
            return response.status == 200, f"status={response.status}"
    except URLError as error:
        return False, str(error)
    except Exception as error:  # noqa: BLE001
        return False, str(error)


def _wait_for_health(base_url: str, timeout_sec: float) -> tuple[bool, str]:
    deadline = time.time() + timeout_sec
    last_detail = "not_checked"
    while time.time() < deadline:
        ok, detail = _check_health(base_url, 5.0)
        last_detail = detail
        if ok:
            return True, detail
        time.sleep(0.5)
    return False, last_detail


def _stop_process(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=10)


def _request_json(base_url: str, path: str) -> dict[str, object]:
    with urlopen(f"{base_url.rstrip('/')}{path}", timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def _count_strategic_nodes(layout_response: dict[str, object]) -> dict[str, int]:
    payload = layout_response.get("map", {})
    tiles = payload.get("tiles", []) if isinstance(payload, dict) else []
    counts = {node_type: 0 for node_type in NODE_TYPES}
    if isinstance(tiles, list):
        for tile in tiles:
            if not isinstance(tile, dict):
                continue
            tile_type = str(tile.get("type", "")).strip().lower()
            if tile_type in counts:
                counts[tile_type] += 1
    return counts


def _expected_counts(base_url: str, center_x: int, center_y: int, visible_cells: str) -> dict[str, int]:
    query = urlencode(
        {
            "scope": "viewport",
            "layer": "tile",
            "centerX": center_x,
            "centerY": center_y,
            "visibleCells": visible_cells,
            "preloadMargin": 2,
            "chunkSize": 16,
        }
    )
    return _count_strategic_nodes(_request_json(base_url, f"/api/world/map-layout?{query}"))


def _copy_artifacts(case_id: str, tier: str) -> dict[str, str]:
    GATE_ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    copied: dict[str, str] = {}
    for source, suffix in [
        (SOURCE_CAPTURE_METADATA, "json"),
        (SOURCE_CAPTURE_FULL, "png"),
        (SOURCE_CAPTURE_CROP, "crop.png"),
    ]:
        if not source.exists():
            continue
        target = GATE_ARTIFACT_DIR / f"{case_id}_{tier}.{suffix}"
        shutil.copy2(source, target)
        copied[suffix] = str(target)
    return copied


def _read_capture_metadata() -> dict[str, object]:
    return json.loads(SOURCE_CAPTURE_METADATA.read_text(encoding="utf-8"))


def _validate_capture_metadata(
    metadata: dict[str, object],
    expected_counts: dict[str, int],
    expected_visible_cells: dict[str, int],
    expected_nonzero_types: list[str],
) -> list[str]:
    errors: list[str] = []
    map_layout = metadata.get("mapLayout", {})
    camera_viewport = map_layout.get("cameraViewport", {}) if isinstance(map_layout, dict) else {}
    live_backend = metadata.get("liveBackend", {})
    status = live_backend.get("liveNodeCaptureStatus", {}) if isinstance(live_backend, dict) else {}
    sample_hit_stats = live_backend.get("sampleHitStats", {}) if isinstance(live_backend, dict) else {}
    availability = live_backend.get("strategicNodeAvailability", {}) if isinstance(live_backend, dict) else {}
    observed_counts = availability.get("observedRawBackendCounts", {}) if isinstance(availability, dict) else {}
    sample_counts = status.get("sampleCountsByType", {}) if isinstance(status, dict) else {}

    if not isinstance(camera_viewport, dict):
        errors.append("cameraViewport missing")
        camera_viewport = {}
    if camera_viewport.get("visibleCells") != expected_visible_cells:
        errors.append(f"visibleCells={camera_viewport.get('visibleCells')!r}, expected={expected_visible_cells!r}")
    if camera_viewport.get("preloadMarginCells") != 2:
        errors.append(f"preloadMarginCells={camera_viewport.get('preloadMarginCells')!r}")
    if camera_viewport.get("chunkSizeCells") != {"width": 16, "height": 16}:
        errors.append(f"chunkSizeCells={camera_viewport.get('chunkSizeCells')!r}")
    if not camera_viewport.get("loadedChunkIds"):
        errors.append("loadedChunkIds empty")

    for node_type, expected_count in expected_counts.items():
        observed_count = int((observed_counts if isinstance(observed_counts, dict) else {}).get(node_type, 0) or 0)
        if observed_count != expected_count:
            errors.append(f"{node_type} observed={observed_count}, expected={expected_count}")
        sample_count = int((sample_counts if isinstance(sample_counts, dict) else {}).get(node_type, 0) or 0)
        if expected_count > 0 and node_type in expected_nonzero_types and sample_count <= 0:
            errors.append(f"{node_type} expected sample missing")

    for key in ("allHitOk", "allScreenRoundtripOk", "allReservedProxyOk", "allSelectionOk", "allHoverOk"):
        if not bool((sample_hit_stats if isinstance(sample_hit_stats, dict) else {}).get(key, False)):
            errors.append(f"sampleHitStats.{key} is not true")
    return errors


def main() -> int:
    node_exe = _resolve_node_exe()
    if not node_exe:
        print(json.dumps({"ok": False, "error": "node_runtime_not_found"}, ensure_ascii=False, indent=2))
        return 1

    port = _find_free_port()
    backend_url = f"http://127.0.0.1:{port}"
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    (TMP_DIR / "gates").mkdir(parents=True, exist_ok=True)
    stdout_path = TMP_DIR / "strategic_node_zoom_hit_backend_stdout.log"
    stderr_path = TMP_DIR / "strategic_node_zoom_hit_backend_stderr.log"
    env = os.environ.copy()
    env.update(
        {
            "HOST": "127.0.0.1",
            "PORT": str(port),
            "GAME_CLOCK_ENABLED": "0",
            "NODE_ENV": env.get("NODE_ENV", "test"),
            "SLG_LOCAL_GATE_BACKEND": "1",
        }
    )

    with stdout_path.open("wb") as stdout_file, stderr_path.open("wb") as stderr_file:
        guard_ok, guard_detail = _run_service_process_prestart_guard(stdout_file)
        if not guard_ok:
            summary = {
                "ok": False,
                "error": "service_process_prestart_failed",
                "serviceProcessPrestartTail": guard_detail,
                "backendStdout": str(stdout_path),
                "backendStderr": str(stderr_path),
                "runs": [],
            }
            GATE_SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(json.dumps(summary, ensure_ascii=False, indent=2))
            return 1

        backend = subprocess.Popen(
            [node_exe, "--import", "tsx", "server/src/app.ts"],
            cwd=REPO_ROOT,
            env=env,
            stdout=stdout_file,
            stderr=stderr_file,
            creationflags=_create_no_window_flags(),
        )
        try:
            backend_ok, backend_detail = _wait_for_health(backend_url, 90.0)
            summary: dict[str, object] = {
                "ok": False,
                "backendUrl": backend_url,
                "backendHealth": backend_detail,
                "backendStdout": str(stdout_path),
                "backendStderr": str(stderr_path),
                "runs": [],
            }
            if not backend_ok:
                summary["error"] = "backend_health_failed"
                GATE_SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                print(json.dumps(summary, ensure_ascii=False, indent=2))
                return 1

            aggregate_sampled_types: set[str] = set()
            failures: list[str] = []
            for case in CASES:
                for tier in ZOOM_TIERS:
                    expected_counts = _expected_counts(
                        backend_url,
                        int(case["center_x"]),
                        int(case["center_y"]),
                        str(tier["visible_cells"]),
                    )
                    command = [
                        sys.executable,
                        str(REPO_ROOT / "scripts" / "capture_world_cell_live_nodes.py"),
                        "--backend-url",
                        backend_url,
                        "--map-scope",
                        "viewport",
                        "--layer",
                        "tile",
                        "--center-x",
                        str(case["center_x"]),
                        "--center-y",
                        str(case["center_y"]),
                        "--window-size",
                        "1600x900",
                        "--camera-zoom",
                        str(tier["camera_zoom"]),
                        "--expected-pass",
                        str(expected_counts["pass"]),
                        "--expected-fort",
                        str(expected_counts["fort"]),
                        "--expected-dock",
                        str(expected_counts["dock"]),
                    ]
                    completed = subprocess.run(command, cwd=REPO_ROOT, env=os.environ.copy(), capture_output=True, text=True)
                    run_summary: dict[str, object] = {
                        "caseId": case["case_id"],
                        "tier": tier["tier"],
                        "center": {"x": case["center_x"], "y": case["center_y"]},
                        "expectedCounts": expected_counts,
                        "command": command,
                        "captureReturnCode": completed.returncode,
                    }
                    if SOURCE_CAPTURE_METADATA.exists():
                        metadata = _read_capture_metadata()
                        validation_errors = _validate_capture_metadata(
                            metadata,
                            expected_counts,
                            tier["expected_visible_cells"],
                            list(case["expected_nonzero_types"]),
                        )
                        artifacts = _copy_artifacts(str(case["case_id"]), str(tier["tier"]))
                        live_backend = metadata.get("liveBackend", {})
                        status = live_backend.get("liveNodeCaptureStatus", {}) if isinstance(live_backend, dict) else {}
                        sample_counts = status.get("sampleCountsByType", {}) if isinstance(status, dict) else {}
                        if isinstance(sample_counts, dict):
                            for node_type in NODE_TYPES:
                                if int(sample_counts.get(node_type, 0) or 0) > 0:
                                    aggregate_sampled_types.add(node_type)
                        run_summary.update(
                            {
                                "validationErrors": validation_errors,
                                "artifacts": artifacts,
                                "zoom": metadata.get("zoom"),
                                "mapLayout": metadata.get("mapLayout"),
                                "sampleCountsByType": sample_counts,
                            }
                        )
                        failures.extend(f"{case['case_id']} {tier['tier']} {error}" for error in validation_errors)
                    else:
                        failures.append(f"{case['case_id']} {tier['tier']} metadata missing")
                        run_summary["stdoutTail"] = completed.stdout.splitlines()[-40:]
                        run_summary["stderrTail"] = completed.stderr.splitlines()[-40:]
                    cast_runs = summary["runs"]
                    assert isinstance(cast_runs, list)
                    cast_runs.append(run_summary)

            missing_aggregate_types = [node_type for node_type in NODE_TYPES if node_type not in aggregate_sampled_types]
            if missing_aggregate_types:
                failures.append(f"aggregate sampled node types missing: {missing_aggregate_types}")
            summary["aggregateSampledTypes"] = sorted(aggregate_sampled_types)
            summary["failures"] = failures
            summary["ok"] = not failures
            GATE_SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(json.dumps(summary, ensure_ascii=False, indent=2))
            return 0 if not failures else 1
        finally:
            _stop_process(backend)


if __name__ == "__main__":
    raise SystemExit(main())
