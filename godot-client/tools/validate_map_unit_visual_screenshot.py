#!/usr/bin/env python3
"""
Map unit visual screenshot acceptance gate.

Formal entrypoint:
  scripts\run_python.cmd godot-client\tools\validate_map_unit_visual_screenshot.py

Purpose:
- Drive the real Godot map unit preview scene.
- Capture screenshots for selection, countdown, path arrows, target markers, banner tint,
  and three troop silhouettes at multiple map zooms.
- Emit a reproducible JSON report under tmp/screenshots/map_unit_visual/.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import textwrap
import time
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageStat

from run_ui_preview_sandbox import (
    DEFAULT_PROJECT_PATH,
    REPO_ROOT,
    build_godot_command,
    resolve_godot_gui_exe,
)


PROJECT_ROOT = REPO_ROOT / "godot-client"
DEFAULT_SCREENSHOT_DIR = REPO_ROOT / "tmp" / "screenshots" / "map_unit_visual"
DEFAULT_REPORT_PATH = DEFAULT_SCREENSHOT_DIR / "map_unit_visual_screenshot_report.json"
TEMP_DRIVER_DIR = PROJECT_ROOT / "tmp"
TEMP_DRIVER_SCRIPT_PATH = TEMP_DRIVER_DIR / "map_unit_visual_capture_driver.gd"
TEMP_DRIVER_SCENE_PATH = TEMP_DRIVER_DIR / "map_unit_visual_capture_driver.tscn"
EXPECTED_VISUAL_TYPES = {"infantry", "cavalry", "archer"}
EXPECTED_MAIN_WORLD_CITY_QUEUE_ANCHOR_SOURCE = "res://assets/themes/slgclient/current/units/main_world_unit_visual_anchors_v1.json"
EXPECTED_MAIN_WORLD_CITY_QUEUE_ANCHOR_SCHEMA = "main_world_unit_visual_anchors_v1"
EXPECTED_BACKEND_CITY_QUEUE_PROFILE_COVERAGE = {
    "player_city_3x3_template_v1",
    "ai_city_3x3_template_v1",
    "neutral_city_5x5_template_v1",
    "neutral_city_7x7_template_v1",
}
EXPECTED_BACKEND_CITY_QUEUE_PROFILE_FOOTPRINTS = {
    "player_city_3x3_template_v1": {"player_city_3x3_initial"},
    "ai_city_3x3_template_v1": {"ai_city_3x3_initial"},
    "neutral_city_5x5_template_v1": {"system_city_l05_l06_5x5"},
    "neutral_city_7x7_template_v1": {"system_city_l07_l08_7x7"},
}
EXPECTED_CITY_QUEUE_VISUAL_PROFILE_ORDER = [
    "neutral_city_3x3_template_v1",
    "neutral_city_5x5_template_v1",
    "neutral_city_7x7_template_v1",
    "neutral_city_9x9_template_v1",
]
EXPECTED_DIRECTIONAL_QUEUE_ANCHOR_IDS = {"south_gate_queue", "east_gate_queue", "northwest_gate_queue"}
EXPECTED_MAINLINE_QUEUE_ANCHOR_ID = "northwest_gate_queue"
EXPECTED_MAINLINE_QUEUE_ANCHOR_SOURCE = "backend_exit"
EXPECTED_MAINLINE_ROAD_EXIT_DIRECTION = "northwest"
MAINLINE_EXIT_DIRECTION_SCENARIOS = [
    {
        "id": "east",
        "targetTileId": "tile_09",
        "expectedAnchorId": "east_gate_queue",
        "expectedDirection": "east",
    },
    {
        "id": "south",
        "targetTileId": "tile_13",
        "expectedAnchorId": "south_gate_queue",
        "expectedDirection": "south",
    },
]
STATE_SEQUENCE = [
    {"state_id": "staging", "file_name": "01_map_units_selected_infantry.png"},
    {"state_id": "march", "file_name": "02_map_units_paths_countdown_archer.png"},
    {"state_id": "contest", "file_name": "03_map_units_far_zoom_cavalry.png"},
]


def _now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _json_print(payload: Any) -> None:
    print(json.dumps(payload, ensure_ascii=True, indent=2))


def _read_main_world_city_queue_anchor_profiles() -> dict[str, Any]:
    config_path = PROJECT_ROOT / "assets" / "themes" / "slgclient" / "current" / "units" / "main_world_unit_visual_anchors_v1.json"
    data = json.loads(config_path.read_text(encoding="utf-8"))
    profiles = data.get("mainWorldCityVisualFootprints", {})
    return profiles if isinstance(profiles, dict) else {}


def _resolve_march_start_offset(profile: dict[str, Any]) -> tuple[float, float]:
    raw_anchors = profile.get("queueAnchors", [])
    if isinstance(raw_anchors, list):
        for anchor in raw_anchors:
            if not isinstance(anchor, dict):
                continue
            if str(anchor.get("role", "")).strip() != "march_start":
                continue
            raw_offset = anchor.get("offset", {})
            if isinstance(raw_offset, dict):
                return float(raw_offset.get("x", 0)), float(raw_offset.get("y", 0))
    raw_offset = profile.get("stagingOffset", {})
    if isinstance(raw_offset, dict):
        return float(raw_offset.get("x", 0)), float(raw_offset.get("y", 0))
    return 0.0, 0.0


def _resolve_queue_anchor_ids(profile: dict[str, Any]) -> set[str]:
    result: set[str] = set()
    raw_anchors = profile.get("queueAnchors", [])
    if not isinstance(raw_anchors, list):
        return result
    for anchor in raw_anchors:
        if not isinstance(anchor, dict):
            continue
        anchor_id = str(anchor.get("id", "")).strip()
        if anchor_id:
            result.add(anchor_id)
    return result


def _validate_city_queue_visual_profile_offsets() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    profiles = _read_main_world_city_queue_anchor_profiles()
    profile_offsets: dict[str, dict[str, float]] = {}
    previous_y: float | None = None
    previous_abs_x: float | None = None
    for profile_id in EXPECTED_CITY_QUEUE_VISUAL_PROFILE_ORDER:
        profile = profiles.get(profile_id, {})
        if not isinstance(profile, dict):
            errors.append(
                {
                    "path": f"mainWorldCityVisualFootprints.{profile_id}",
                    "reason": "expected neutral city visual profile is missing",
                }
            )
            continue
        offset_x, offset_y = _resolve_march_start_offset(profile)
        profile_offsets[profile_id] = {"x": offset_x, "y": offset_y}
        missing_directional_anchors = sorted(EXPECTED_DIRECTIONAL_QUEUE_ANCHOR_IDS - _resolve_queue_anchor_ids(profile))
        if missing_directional_anchors:
            errors.append(
                {
                    "path": f"mainWorldCityVisualFootprints.{profile_id}.queueAnchors",
                    "reason": f"missing directional queue anchors: {', '.join(missing_directional_anchors)}",
                }
            )
        if previous_y is not None and offset_y <= previous_y:
            errors.append(
                {
                    "path": f"mainWorldCityVisualFootprints.{profile_id}.queueAnchors.march_start.offset.y",
                    "reason": "larger neutral city footprint must use a deeper south queue offset",
                }
            )
        if previous_abs_x is not None and abs(offset_x) <= previous_abs_x:
            errors.append(
                {
                    "path": f"mainWorldCityVisualFootprints.{profile_id}.queueAnchors.march_start.offset.x",
                    "reason": "larger neutral city footprint must use a wider horizontal queue offset",
                }
            )
        previous_y = offset_y
        previous_abs_x = abs(offset_x)
    return errors, {"neutralQueueProfileOffsets": profile_offsets}


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _run_command(command: list[str], cwd: Path, log_path: Path, timeout_sec: float) -> dict[str, Any]:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    started = time.time()
    with log_path.open("w", encoding="utf-8") as log_file:
        process = subprocess.Popen(
            command,
            cwd=str(cwd),
            stdin=subprocess.DEVNULL,
            stdout=log_file,
            stderr=log_file,
            text=True,
            encoding="utf-8",
            close_fds=True,
        )
        timed_out = False
        try:
            return_code = process.wait(timeout=timeout_sec)
        except subprocess.TimeoutExpired:
            timed_out = True
            process.kill()
            return_code = process.wait(timeout=30)
    log_lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    return {
        "command": command,
        "returnCode": return_code,
        "durationMs": int((time.time() - started) * 1000),
        "logPath": str(log_path),
        "stdoutTail": log_lines[-30:],
        "ok": return_code == 0 and not timed_out,
        "timedOut": timed_out,
    }


def _write_temp_driver_assets(screenshot_dir: Path, driver_report_path: Path, presentation_capture: bool) -> None:
    TEMP_DRIVER_DIR.mkdir(parents=True, exist_ok=True)
    screenshot_dir.mkdir(parents=True, exist_ok=True)
    driver_script = textwrap.dedent(
        f"""
        extends Control

        const STORY_SCENE_PATH := "res://scenes/dev/stories/map_units_story.tscn"
        const PAYLOAD_PATH := "res://data/ui_preview/stories/map_units_story.json"
        const SCREENSHOT_DIR := {json.dumps(screenshot_dir.as_posix())}
        const REPORT_PATH := {json.dumps(driver_report_path.as_posix())}
        const STATE_SEQUENCE := {json.dumps(STATE_SEQUENCE, ensure_ascii=False)}
        const PRESENTATION_CAPTURE := {json.dumps(presentation_capture)}

        var _story: Node = null

        func _ready() -> void:
            set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
            call_deferred("_run")

        func _run() -> void:
            var packed_scene: PackedScene = load(STORY_SCENE_PATH) as PackedScene
            if packed_scene == null:
                push_error("map unit visual driver failed to load story scene: %s" % STORY_SCENE_PATH)
                _write_report(false, [])
                get_tree().quit(1)
                return
            _story = packed_scene.instantiate()
            add_child(_story)
            if _story is Control:
                (_story as Control).set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
            if _story.has_method("set_presentation_capture_mode"):
                _story.call("set_presentation_capture_mode", PRESENTATION_CAPTURE)
            await _settle_render()

            var payload := _load_payload()
            if payload.is_empty():
                _write_report(false, [])
                get_tree().quit(1)
                return

            var captures: Array = []
            for entry_variant in STATE_SEQUENCE:
                var entry: Dictionary = entry_variant as Dictionary
                var state_id := str(entry.get("state_id", "")).strip_edges()
                var file_name := str(entry.get("file_name", "")).strip_edges()
                if state_id == "" or file_name == "":
                    continue
                var state_payload: Dictionary = payload.duplicate(true)
                state_payload["activeStateId"] = state_id
                if _story.has_method("apply_preview_payload"):
                    _story.call("apply_preview_payload", state_payload)
                await _settle_render()
                var summary := _read_unit_visual_summary()
                var screenshot_ok := _capture_png(file_name)
                captures.append({{
                    "stateId": state_id,
                    "fileName": file_name,
                    "screenshotPath": SCREENSHOT_DIR.path_join(file_name) if screenshot_ok else "",
                    "screenshotOk": screenshot_ok,
                    "summary": summary,
                }})
                print("MAP_UNIT_VISUAL_CAPTURE state=%s file=%s ok=%s" % [state_id, file_name, str(screenshot_ok)])

            _write_report(true, captures)
            print("MAP_UNIT_VISUAL_DRIVER_OK captures=%d report=%s" % [captures.size(), REPORT_PATH])
            get_tree().quit(0)

        func _load_payload() -> Dictionary:
            if not FileAccess.file_exists(PAYLOAD_PATH):
                push_error("map unit visual driver payload missing: %s" % PAYLOAD_PATH)
                return {{}}
            var file := FileAccess.open(PAYLOAD_PATH, FileAccess.READ)
            if file == null:
                push_error("map unit visual driver payload open failed: %s" % PAYLOAD_PATH)
                return {{}}
            var parsed: Variant = JSON.parse_string(file.get_as_text())
            file.close()
            if not (parsed is Dictionary):
                push_error("map unit visual driver payload parse failed: %s" % PAYLOAD_PATH)
                return {{}}
            return parsed as Dictionary

        func _read_unit_visual_summary() -> Dictionary:
            if _story == null or not _story.has_method("get_unit_view_layer"):
                return {{}}
            var unit_layer: Node = _story.call("get_unit_view_layer")
            if unit_layer == null or not unit_layer.has_method("get_visual_acceptance_summary"):
                return {{}}
            return unit_layer.call("get_visual_acceptance_summary") as Dictionary

        func _settle_render() -> void:
            for _index in range(10):
                await get_tree().process_frame
            await RenderingServer.frame_post_draw
            await get_tree().create_timer(0.42).timeout

        func _capture_png(file_name: String) -> bool:
            var viewport_texture: ViewportTexture = get_viewport().get_texture()
            if viewport_texture == null:
                push_error("map unit visual capture failed: missing viewport texture")
                return false
            var image: Image = viewport_texture.get_image()
            if image == null:
                push_error("map unit visual capture failed: missing image")
                return false
            DirAccess.make_dir_recursive_absolute(SCREENSHOT_DIR)
            var output_path := SCREENSHOT_DIR.path_join(file_name)
            var save_err: Error = image.save_png(output_path)
            if save_err != OK:
                push_error("map unit visual capture failed: %s err=%d" % [output_path, int(save_err)])
                return false
            return true

        func _write_report(ok: bool, captures: Array) -> void:
            DirAccess.make_dir_recursive_absolute(SCREENSHOT_DIR)
            var file := FileAccess.open(REPORT_PATH, FileAccess.WRITE)
            if file == null:
                push_error("map unit visual driver report write failed: %s" % REPORT_PATH)
                return
            file.store_string(JSON.stringify({{
                "ok": ok,
                "scenePath": STORY_SCENE_PATH,
                "payloadPath": PAYLOAD_PATH,
                "screenshotDir": SCREENSHOT_DIR,
                "captures": captures,
            }}, "  "))
            file.close()
        """
    ).strip()
    driver_scene = textwrap.dedent(
        """
        [gd_scene load_steps=2 format=3]

        [ext_resource type="Script" path="res://tmp/map_unit_visual_capture_driver.gd" id="1_driver"]

        [node name="MapUnitVisualCaptureDriver" type="Control"]
        anchor_right = 1.0
        anchor_bottom = 1.0
        script = ExtResource("1_driver")
        """
    ).strip()
    TEMP_DRIVER_SCRIPT_PATH.write_text(driver_script + "\n", encoding="utf-8")
    TEMP_DRIVER_SCENE_PATH.write_text(driver_scene + "\n", encoding="utf-8")


def _cleanup_temp_driver_assets() -> None:
    for path in (TEMP_DRIVER_SCENE_PATH, TEMP_DRIVER_SCRIPT_PATH):
        try:
            if path.exists():
                path.unlink()
        except Exception:
            pass


def _image_stats(path: Path) -> dict[str, Any]:
    with Image.open(path) as image:
        rgb = image.convert("RGB")
        stat = ImageStat.Stat(rgb)
        extrema = rgb.getextrema()
        non_flat = any(channel_max > channel_min for channel_min, channel_max in extrema)
        return {
            "ok": rgb.width >= 320 and rgb.height >= 180 and non_flat,
            "path": str(path),
            "width": rgb.width,
            "height": rgb.height,
            "mode": image.mode,
            "mean": [round(value, 2) for value in stat.mean],
            "extrema": extrema,
            "nonFlat": non_flat,
            "sha256": _sha256_file(path),
        }


def _average_hash(image: Image.Image, hash_size: int = 16) -> int:
    gray = image.convert("L").resize((hash_size, hash_size), Image.Resampling.LANCZOS)
    pixels = list(gray.tobytes())
    mean = sum(pixels) / len(pixels)
    bits = 0
    for index, value in enumerate(pixels):
        if value >= mean:
            bits |= 1 << index
    return bits


def _hamming_distance(a: int, b: int) -> int:
    return int((a ^ b).bit_count())


def _crop_marker(image: Image.Image, position: dict[str, Any], size: int = 96) -> Image.Image:
    x = int(round(float(position.get("x", 0.0))))
    y = int(round(float(position.get("y", 0.0)) - 30.0))
    half = size // 2
    left = x - half
    top = y - half
    right = left + size
    bottom = top + size
    crop = Image.new("RGB", (size, size), (18, 22, 28))
    src_left = max(0, left)
    src_top = max(0, top)
    src_right = min(image.width, right)
    src_bottom = min(image.height, bottom)
    if src_right <= src_left or src_bottom <= src_top:
        return crop
    dst_left = src_left - left
    dst_top = src_top - top
    crop.paste(image.crop((src_left, src_top, src_right, src_bottom)), (dst_left, dst_top))
    return crop


def _marker_position_in_frame(position: dict[str, Any], image_stats: dict[str, Any], margin: int = 18) -> bool:
    try:
        x = float(position.get("x", 0.0))
        y = float(position.get("y", 0.0))
        width = float(image_stats.get("width", 0))
        height = float(image_stats.get("height", 0))
    except (TypeError, ValueError):
        return False
    return margin <= x <= width - margin and margin <= y <= height - margin


def _write_crop_contact_sheet(
    captures: list[dict[str, Any]],
    screenshot_dir: Path,
    output_path: Path,
) -> dict[str, Any]:
    crop_entries: list[dict[str, Any]] = []
    for capture in captures:
        screenshot_path = Path(str(capture.get("screenshotPath", "")))
        summary = capture.get("summary", {})
        if not screenshot_path.exists() or not isinstance(summary, dict):
            continue
        markers = summary.get("markers", [])
        if not isinstance(markers, list):
            continue
        with Image.open(screenshot_path) as image:
            rgb = image.convert("RGB")
            for marker in markers:
                if not isinstance(marker, dict):
                    continue
                visual_type = str(marker.get("visualType", "")).strip()
                position = marker.get("position", {})
                if visual_type == "" or not isinstance(position, dict):
                    continue
                crop = _crop_marker(rgb, position)
                crop_entries.append(
                    {
                        "stateId": capture.get("stateId", ""),
                        "unitId": marker.get("unitId", ""),
                        "visualType": visual_type,
                        "crop": crop,
                        "hash": _average_hash(crop),
                    }
                )
    if not crop_entries:
        return {"ok": False, "reason": "no marker crops"}

    cell_w = 112
    cell_h = 122
    columns = 3
    rows = (len(crop_entries) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell_w, rows * cell_h), (18, 22, 28))
    draw = ImageDraw.Draw(sheet)
    for index, entry in enumerate(crop_entries):
        col = index % columns
        row = index // columns
        x = col * cell_w + 8
        y = row * cell_h + 8
        sheet.paste(entry["crop"], (x, y))
        draw.text((x, y + 98), f"{entry['stateId']}:{entry['visualType']}", fill=(235, 240, 246))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)

    best_min_distance = 0
    by_state: dict[str, dict[str, int]] = {}
    for entry in crop_entries:
        state_id = str(entry["stateId"])
        visual_type = str(entry["visualType"])
        by_state.setdefault(state_id, {})
        by_state[state_id].setdefault(visual_type, int(entry["hash"]))
    per_state: dict[str, Any] = {}
    for state_id, hashes_by_visual in by_state.items():
        if not EXPECTED_VISUAL_TYPES.issubset(set(hashes_by_visual.keys())):
            continue
        distances: list[int] = []
        visual_list = sorted(EXPECTED_VISUAL_TYPES)
        for left_index in range(len(visual_list)):
            for right_index in range(left_index + 1, len(visual_list)):
                distances.append(
                    _hamming_distance(
                        hashes_by_visual[visual_list[left_index]],
                        hashes_by_visual[visual_list[right_index]],
                    )
                )
        min_distance = min(distances) if distances else 0
        best_min_distance = max(best_min_distance, min_distance)
        per_state[state_id] = {"minHashDistance": min_distance, "distances": distances}
    return {
        "ok": True,
        "path": str(output_path),
        "cropCount": len(crop_entries),
        "bestMinHashDistance": best_min_distance,
        "perState": per_state,
    }


def _banner_color_key(marker: dict[str, Any]) -> str:
    marker_state = marker.get("marker", {})
    if not isinstance(marker_state, dict):
        return ""
    color = marker_state.get("bannerColor", {})
    if not isinstance(color, dict):
        return ""
    return ",".join(str(round(float(color.get(channel, 0.0)), 2)) for channel in ("r", "g", "b"))


def _validate_driver_captures(driver_report: dict[str, Any], screenshot_dir: Path, min_hash_distance: int) -> tuple[bool, list[dict[str, Any]], dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    captures = driver_report.get("captures", [])
    if not isinstance(captures, list) or len(captures) != len(STATE_SEQUENCE):
        errors.append({"path": "captures", "reason": f"expected {len(STATE_SEQUENCE)} captures"})
        captures = []

    image_stats: list[dict[str, Any]] = []
    countdown_seen = False
    path_seen = False
    target_seen = False
    arrow_seen = False
    label_avoidance_seen = False
    label_clamp_seen = False
    commercial_label_seen = False
    mixed_formation_seen = False
    flag_atlas_seen = False
    distinct_banner_colors: set[str] = set()

    for capture in captures:
        if not isinstance(capture, dict):
            errors.append({"path": "captures[]", "reason": "capture is not object"})
            continue
        state_id = str(capture.get("stateId", ""))
        screenshot_path = Path(str(capture.get("screenshotPath", "")))
        if not bool(capture.get("screenshotOk", False)) or not screenshot_path.exists():
            errors.append({"path": f"captures.{state_id}.screenshot", "reason": "missing screenshot"})
            continue
        stats = _image_stats(screenshot_path)
        image_stats.append(stats)
        if not stats.get("nonFlat"):
            errors.append({"path": f"captures.{state_id}.image", "reason": "screenshot is flat"})

        summary = capture.get("summary", {})
        if not isinstance(summary, dict):
            errors.append({"path": f"captures.{state_id}.summary", "reason": "missing summary"})
            continue
        counts = summary.get("visualTypeCounts", {})
        if not isinstance(counts, dict) or not EXPECTED_VISUAL_TYPES.issubset(set(str(key) for key in counts.keys())):
            errors.append({"path": f"captures.{state_id}.visualTypeCounts", "reason": "missing infantry/cavalry/archer"})
        if int(summary.get("markerCount", 0)) < 3:
            errors.append({"path": f"captures.{state_id}.markerCount", "reason": "expected at least 3 markers"})
        selected_unit_id = str(summary.get("selectedUnitId", "")).strip()
        if selected_unit_id == "":
            errors.append({"path": f"captures.{state_id}.selectedUnitId", "reason": "missing selected unit"})

        markers = summary.get("markers", [])
        selected_debug_seen = False
        marker_offscreen_count = 0
        if isinstance(markers, list):
            for marker in markers:
                if not isinstance(marker, dict):
                    continue
                position = marker.get("position", {})
                if not isinstance(position, dict) or not _marker_position_in_frame(position, stats):
                    marker_offscreen_count += 1
                banner_key = _banner_color_key(marker)
                if banner_key:
                    distinct_banner_colors.add(banner_key)
                marker_state = marker.get("marker", {})
                if isinstance(marker_state, dict):
                    formation_visual_types = {
                        str(value)
                        for value in marker_state.get("formationVisualTypes", [])
                        if str(value).strip()
                    }
                    mixed_formation_seen = mixed_formation_seen or (
                        int(marker_state.get("formationSlotCount", 0)) >= 3
                        and EXPECTED_VISUAL_TYPES.issubset(formation_visual_types)
                    )
                    flag_atlas_seen = flag_atlas_seen or str(marker_state.get("flagSource", "")) == "atlas"
                if marker.get("unitId") == selected_unit_id and isinstance(marker_state, dict):
                    selected_debug_seen = bool(marker_state.get("selected", False))
        if marker_offscreen_count > 0:
            errors.append({"path": f"captures.{state_id}.markers", "reason": f"{marker_offscreen_count} marker(s) outside visible frame"})
        if not selected_debug_seen:
            errors.append({"path": f"captures.{state_id}.selectedMarker", "reason": "selected marker debug state missing"})

        countdown_seen = countdown_seen or int(summary.get("countdownLabelCount", 0)) > 0
        label_texts = summary.get("labelTexts", [])
        if isinstance(label_texts, list):
            for label_entry in label_texts:
                if not isinstance(label_entry, dict):
                    continue
                commercial_label_seen = commercial_label_seen or (
                    bool(label_entry.get("hasPlate", False))
                    and int(label_entry.get("fontSize", 0)) >= 17
                    and str(label_entry.get("text", "")).strip() != ""
                )
        label_avoidance_seen = label_avoidance_seen or int(summary.get("labelAvoidanceAppliedCount", 0)) > 0
        label_clamp_seen = label_clamp_seen or int(summary.get("labelClampAppliedCount", 0)) > 0
        path_layer = summary.get("pathLayer", {})
        if isinstance(path_layer, dict):
            path_seen = path_seen or int(path_layer.get("pathCount", 0)) > 0
            target_seen = target_seen or int(path_layer.get("targetCount", 0)) > 0
            arrow_seen = arrow_seen or int(path_layer.get("arrowEstimateCount", 0)) > 0

    if not countdown_seen:
        errors.append({"path": "captures", "reason": "no countdown label observed"})
    if not path_seen:
        errors.append({"path": "captures", "reason": "no unit path observed"})
    if not target_seen:
        errors.append({"path": "captures", "reason": "no target marker observed"})
    if not arrow_seen:
        errors.append({"path": "captures", "reason": "no path arrow estimate observed"})
    if not label_avoidance_seen:
        errors.append({"path": "captures.labelAvoidanceAppliedCount", "reason": "no label avoidance displacement observed"})
    if not label_clamp_seen:
        errors.append({"path": "captures.labelClampAppliedCount", "reason": "no label screen-edge clamp observed"})
    if not commercial_label_seen:
        errors.append({"path": "captures.labelTexts", "reason": "no plated large-font commercial label observed"})
    if not mixed_formation_seen:
        errors.append({"path": "captures.markers.formationSlots", "reason": "no mixed three-row infantry/cavalry/archer formation observed"})
    if not flag_atlas_seen:
        errors.append({"path": "captures.markers.flagSource", "reason": "no atlas-backed unit flag observed"})
    if len(distinct_banner_colors) < 3:
        errors.append({"path": "captures.markers.bannerColor", "reason": "expected 3 distinct runtime banner colors"})

    crop_sheet_path = screenshot_dir / "map_unit_visual_crop_contact_sheet.png"
    crop_report = _write_crop_contact_sheet([capture for capture in captures if isinstance(capture, dict)], screenshot_dir, crop_sheet_path)
    if not crop_report.get("ok", False):
        errors.append({"path": "cropContactSheet", "reason": str(crop_report.get("reason", "failed"))})
    elif int(crop_report.get("bestMinHashDistance", 0)) < min_hash_distance:
        errors.append(
            {
                "path": "cropContactSheet.bestMinHashDistance",
                "reason": f"expected >= {min_hash_distance}, got {crop_report.get('bestMinHashDistance')}",
            }
        )

    details = {
        "imageStats": image_stats,
        "distinctBannerColorCount": len(distinct_banner_colors),
        "labelAvoidanceSeen": label_avoidance_seen,
        "labelClampSeen": label_clamp_seen,
        "commercialLabelSeen": commercial_label_seen,
        "mixedFormationSeen": mixed_formation_seen,
        "flagAtlasSeen": flag_atlas_seen,
        "cropContactSheet": crop_report,
    }
    return len(errors) == 0, errors, details


def _validate_mainline_map_unit_smoke(
    summary: dict[str, Any],
    *,
    expected_anchor_id: str = EXPECTED_MAINLINE_QUEUE_ANCHOR_ID,
    expected_direction: str = EXPECTED_MAINLINE_ROAD_EXIT_DIRECTION,
    expected_target_tile_id: str = "",
    scenario_id: str = "northwest",
    require_countdown_label: bool = True,
) -> tuple[bool, list[dict[str, Any]], dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    godot_report = summary.get("godotReport", {})
    if not isinstance(godot_report, dict):
        godot_report = {}
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        click_result = {}
    map_unit_summary = click_result.get("mapUnitVisualSummary", godot_report.get("mapUnitVisual", {}))
    if not isinstance(map_unit_summary, dict):
        map_unit_summary = {}
    path_layer = map_unit_summary.get("pathLayer", {})
    if not isinstance(path_layer, dict):
        path_layer = {}
    city_queue_anchor = map_unit_summary.get("cityQueueAnchor", {})
    if not isinstance(city_queue_anchor, dict):
        city_queue_anchor = {}
    target_marker = click_result.get("targetMarkerSummary", {})
    if not isinstance(target_marker, dict):
        target_marker = {}
    formation_types = {
        str(value).strip()
        for value in click_result.get("formationVisualTypes", target_marker.get("formationVisualTypes", []))
        if str(value).strip()
    }

    if not bool(summary.get("ok", False)):
        errors.append({"path": "mainline.summary.ok", "reason": "mainline smoke command failed"})
    if not bool(godot_report.get("ok", False)):
        errors.append({"path": "mainline.godotReport.ok", "reason": "Godot mainline report failed"})
    if not bool(click_result.get("ok", False)):
        errors.append({"path": "mainline.clickActionResult.ok", "reason": "submit/march click action failed"})
    if str(godot_report.get("displayMode", "")) != "world":
        errors.append({"path": "mainline.displayMode", "reason": "expected world display mode"})
    if not bool(click_result.get("returnedToMap", False)):
        errors.append({"path": "mainline.clickActionResult.returnedToMap", "reason": "main map was not restored before screenshot"})
    if not bool(click_result.get("selected", False)):
        errors.append({"path": "mainline.clickActionResult.selected", "reason": "deployed unit was not selected"})
    if not bool(click_result.get("mixedFormationOk", False)):
        errors.append({"path": "mainline.clickActionResult.mixedFormationOk", "reason": "mixed three-row formation not verified"})
    if not EXPECTED_VISUAL_TYPES.issubset(formation_types):
        errors.append({"path": "mainline.formationVisualTypes", "reason": "missing infantry/cavalry/archer in deployed unit formation"})
    if int(path_layer.get("pathCount", 0)) <= 0:
        errors.append({"path": "mainline.mapUnitVisual.pathLayer.pathCount", "reason": "no real march path rendered"})
    if int(path_layer.get("targetCount", 0)) <= 0:
        errors.append({"path": "mainline.mapUnitVisual.pathLayer.targetCount", "reason": "no real target marker rendered"})
    if int(path_layer.get("arrowEstimateCount", 0)) <= 0:
        errors.append({"path": "mainline.mapUnitVisual.pathLayer.arrowEstimateCount", "reason": "no path arrow estimate rendered"})
    if require_countdown_label and int(map_unit_summary.get("countdownLabelCount", 0)) <= 0:
        errors.append({"path": "mainline.mapUnitVisual.countdownLabelCount", "reason": "no countdown label rendered"})
    if int(map_unit_summary.get("markerCount", 0)) <= 0:
        errors.append({"path": "mainline.mapUnitVisual.markerCount", "reason": "no unit marker rendered"})
    if int(map_unit_summary.get("cityStationedHiddenCount", 0)) <= 0:
        errors.append({"path": "mainline.mapUnitVisual.cityStationedHiddenCount", "reason": "city-stationed idle units were not hidden from the main world"})
    if str(city_queue_anchor.get("source", "")) != EXPECTED_MAIN_WORLD_CITY_QUEUE_ANCHOR_SOURCE:
        errors.append({"path": "mainline.mapUnitVisual.cityQueueAnchor.source", "reason": "main-world unit queue anchor did not come from formal JSON config"})
    if str(city_queue_anchor.get("configSchemaVersion", "")) != EXPECTED_MAIN_WORLD_CITY_QUEUE_ANCHOR_SCHEMA:
        errors.append({"path": "mainline.mapUnitVisual.cityQueueAnchor.configSchemaVersion", "reason": "main-world unit queue anchor schema version missing or unexpected"})
    if str(city_queue_anchor.get("footprintSelectionMode", "")) != "backend-first":
        errors.append({"path": "mainline.mapUnitVisual.cityQueueAnchor.footprintSelectionMode", "reason": "city queue anchor did not advertise backend-first footprint resolution"})
    if str(city_queue_anchor.get("sourceMode", "")) != "backend_footprint":
        errors.append({"path": "mainline.mapUnitVisual.cityQueueAnchor.sourceMode", "reason": "mainline unit queue anchor did not resolve from backend footprint data"})
    if str(city_queue_anchor.get("backendFootprintInputMode", "")) != "backend":
        errors.append({"path": "mainline.mapUnitVisual.cityQueueAnchor.backendFootprintInputMode", "reason": "backend footprint data was not indexed by UnitViewLayer"})
    if not bool(city_queue_anchor.get("profileResolvedFromBackend", False)):
        errors.append({"path": "mainline.mapUnitVisual.cityQueueAnchor.profileResolvedFromBackend", "reason": "city queue anchor profile was not selected from backend footprintId"})
    if expected_target_tile_id and str(click_result.get("targetTileId", "")).strip() != expected_target_tile_id:
        errors.append(
            {
                "path": f"mainline.{scenario_id}.clickActionResult.targetTileId",
                "reason": f"expected target tile {expected_target_tile_id}",
            }
        )
    if str(city_queue_anchor.get("selectedQueueAnchorId", "")).strip() != expected_anchor_id:
        errors.append(
            {
                "path": f"mainline.{scenario_id}.mapUnitVisual.cityQueueAnchor.selectedQueueAnchorId",
                "reason": f"expected directional queue anchor {expected_anchor_id} for the mainline march",
            }
        )
    if str(city_queue_anchor.get("selectedQueueAnchorSource", "")).strip() != EXPECTED_MAINLINE_QUEUE_ANCHOR_SOURCE:
        errors.append(
            {
                "path": f"mainline.{scenario_id}.mapUnitVisual.cityQueueAnchor.selectedQueueAnchorSource",
                "reason": "mainline queue anchor must consume backend exit fields before local direction fallback",
            }
        )
    if str(city_queue_anchor.get("backendExitAnchorId", "")).strip() != expected_anchor_id:
        errors.append(
            {
                "path": f"mainline.{scenario_id}.mapUnitVisual.cityQueueAnchor.backendExitAnchorId",
                "reason": f"expected backend exit anchor id {expected_anchor_id}",
            }
        )
    if str(city_queue_anchor.get("backendRoadExitDirection", "")).strip() != expected_direction:
        errors.append(
            {
                "path": f"mainline.{scenario_id}.mapUnitVisual.cityQueueAnchor.backendRoadExitDirection",
                "reason": f"expected backend road exit direction {expected_direction}",
            }
        )
    if str(city_queue_anchor.get("backendFootprintId", "")).strip() == "":
        errors.append({"path": "mainline.mapUnitVisual.cityQueueAnchor.backendFootprintId", "reason": "backend footprint id missing from queue anchor summary"})
    if int(city_queue_anchor.get("backendFootprintTileCount", 0)) < 9:
        errors.append({"path": "mainline.mapUnitVisual.cityQueueAnchor.backendFootprintTileCount", "reason": "backend footprint tile members are missing or too small"})
    if int(city_queue_anchor.get("backendFootprintMatchedTileCount", 0)) < 9:
        errors.append({"path": "mainline.mapUnitVisual.cityQueueAnchor.backendFootprintMatchedTileCount", "reason": "backend footprint member index was not populated"})
    if bool(city_queue_anchor.get("localProfileFallbackUsed", True)):
        errors.append({"path": "mainline.mapUnitVisual.cityQueueAnchor.localProfileFallbackUsed", "reason": "local tile profile fallback was used despite backend footprint data"})
    backend_profile_coverage = city_queue_anchor.get("backendProfileCoverage", {})
    if not isinstance(backend_profile_coverage, dict):
        backend_profile_coverage = {}
    missing_backend_profiles = sorted(
        profile_id
        for profile_id in EXPECTED_BACKEND_CITY_QUEUE_PROFILE_COVERAGE
        if int(backend_profile_coverage.get(profile_id, {}).get("footprintCount", 0))
        <= 0
    )
    if missing_backend_profiles:
        errors.append(
            {
                "path": "mainline.mapUnitVisual.cityQueueAnchor.backendProfileCoverage",
                "reason": f"missing backend footprint coverage for profiles: {', '.join(missing_backend_profiles)}",
            }
        )
    for profile_id, expected_footprints in EXPECTED_BACKEND_CITY_QUEUE_PROFILE_FOOTPRINTS.items():
        coverage_record = backend_profile_coverage.get(profile_id, {})
        if not isinstance(coverage_record, dict):
            coverage_record = {}
        actual_footprints = {
            str(value).strip()
            for value in coverage_record.get("footprintIds", [])
            if str(value).strip()
        }
        missing_footprints = sorted(expected_footprints - actual_footprints)
        if missing_footprints:
            errors.append(
                {
                    "path": f"mainline.mapUnitVisual.cityQueueAnchor.backendProfileCoverage.{profile_id}.footprintIds",
                    "reason": f"missing expected backend footprints: {', '.join(missing_footprints)}",
                }
            )
    visual_profile_errors, visual_profile_details = _validate_city_queue_visual_profile_offsets()
    errors.extend(visual_profile_errors)
    if int(city_queue_anchor.get("profileCount", 0)) < 2:
        errors.append({"path": "mainline.mapUnitVisual.cityQueueAnchor.profileCount", "reason": "city queue anchors are still single-profile only"})
    active_profile_id = str(city_queue_anchor.get("activeProfileId", "")).strip()
    if active_profile_id == "" or active_profile_id == "fallback_default":
        errors.append({"path": "mainline.mapUnitVisual.cityQueueAnchor.activeProfileId", "reason": "no configured city queue anchor profile was applied"})
    if int(city_queue_anchor.get("footprintTileCount", 0)) < 9:
        errors.append({"path": "mainline.mapUnitVisual.cityQueueAnchor.footprintTileCount", "reason": "city queue anchor footprint is too small or missing"})
    queue_anchor_ids = city_queue_anchor.get("queueAnchorIds", [])
    if not isinstance(queue_anchor_ids, list) or len(queue_anchor_ids) <= 0:
        errors.append({"path": "mainline.mapUnitVisual.cityQueueAnchor.queueAnchorIds", "reason": "configured queue anchor ids were not surfaced"})
    if not bool(city_queue_anchor.get("queueAnchorApplied", False)):
        errors.append({"path": "mainline.mapUnitVisual.cityQueueAnchor.queueAnchorApplied", "reason": "march-start queue anchor offset was not applied"})
    label_texts = map_unit_summary.get("labelTexts", [])
    if int(map_unit_summary.get("labelVisibleCount", len(label_texts) if isinstance(label_texts, list) else 99)) > 5:
        errors.append({"path": "mainline.mapUnitVisual.labelVisibleCount", "reason": "main-city label density was not converged"})
    if int(map_unit_summary.get("labelDensitySuppressedCount", 0)) <= 0:
        errors.append({"path": "mainline.mapUnitVisual.labelDensitySuppressedCount", "reason": "main-city idle labels were not suppressed"})
    mainline_commercial_label_seen = False
    if isinstance(label_texts, list):
        for label_entry in label_texts:
            if not isinstance(label_entry, dict):
                continue
            mainline_commercial_label_seen = mainline_commercial_label_seen or (
                bool(label_entry.get("hasPlate", False))
                and int(label_entry.get("fontSize", 0)) >= 17
                and str(label_entry.get("text", "")).strip() != ""
            )
    if not mainline_commercial_label_seen:
        errors.append({"path": "mainline.mapUnitVisual.labelTexts", "reason": "no plated large-font label rendered in mainline"})

    movement_ok, movement_errors, movement_details = _validate_mainline_movement_sequence(
        summary,
        str(click_result.get("unitId", "")),
        require_countdown_label=require_countdown_label,
    )
    errors.extend(movement_errors)

    details = {
        "summaryOk": bool(summary.get("ok", False)),
        "scenarioId": scenario_id,
        "expectedTargetTileId": expected_target_tile_id,
        "expectedQueueAnchorId": expected_anchor_id,
        "expectedRoadExitDirection": expected_direction,
        "godotReportOk": bool(godot_report.get("ok", False)),
        "clickActionOk": bool(click_result.get("ok", False)),
        "unitId": str(click_result.get("unitId", "")),
        "originTileId": str(click_result.get("originTileId", "")),
        "targetTileId": str(click_result.get("targetTileId", "")),
        "formationVisualTypes": sorted(formation_types),
        "markerCount": int(map_unit_summary.get("markerCount", 0)),
        "cityStationedHiddenCount": int(map_unit_summary.get("cityStationedHiddenCount", 0)),
        "countdownLabelCount": int(map_unit_summary.get("countdownLabelCount", 0)),
        "labelDensityCompactCount": int(map_unit_summary.get("labelDensityCompactCount", 0)),
        "labelDensitySuppressedCount": int(map_unit_summary.get("labelDensitySuppressedCount", 0)),
        "labelVisibleCount": int(map_unit_summary.get("labelVisibleCount", len(label_texts) if isinstance(label_texts, list) else 0)),
        "cityQueueAnchor": city_queue_anchor,
        "cityQueueVisualProfiles": visual_profile_details,
        "pathCount": int(path_layer.get("pathCount", 0)),
        "targetCount": int(path_layer.get("targetCount", 0)),
        "arrowEstimateCount": int(path_layer.get("arrowEstimateCount", 0)),
        "commercialLabelSeen": mainline_commercial_label_seen,
        "movementSequenceOk": movement_ok,
        "movementSequence": movement_details,
    }
    return len(errors) == 0, errors, details


def _validate_mainline_owner_delta_smoke(summary: dict[str, Any]) -> tuple[bool, list[dict[str, Any]], dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    godot_report = summary.get("godotReport", {})
    if not isinstance(godot_report, dict):
        godot_report = {}
    click_result = godot_report.get("clickActionResult", {})
    if not isinstance(click_result, dict):
        click_result = {}
    claim_result = click_result.get("claimResult", {})
    if not isinstance(claim_result, dict):
        claim_result = {}
    claimed_screenshot = click_result.get("claimedScreenshot", {})
    if not isinstance(claimed_screenshot, dict):
        claimed_screenshot = {}
    claimed_streaming = click_result.get("claimedStreamingSummary", {})
    if not isinstance(claimed_streaming, dict):
        claimed_streaming = {}

    if not bool(summary.get("ok", False)):
        errors.append({"path": "ownerDelta.summary.ok", "reason": "owner delta smoke command failed"})
    if not bool(godot_report.get("ok", False)):
        errors.append({"path": "ownerDelta.godotReport.ok", "reason": "Godot owner delta report failed"})
    if not bool(click_result.get("ok", False)):
        errors.append({"path": "ownerDelta.clickActionResult.ok", "reason": "claim/release click action failed"})
    if not bool(claim_result.get("ok", False)):
        errors.append({"path": "ownerDelta.claimResult.ok", "reason": "claim action failed"})
    if not bool(claim_result.get("ownerDeltaApplied", False)):
        errors.append({"path": "ownerDelta.claimResult.ownerDeltaApplied", "reason": "claim owner delta was not applied into map grid"})
    if not bool(claim_result.get("deltaRefreshOk", False)):
        errors.append({"path": "ownerDelta.claimResult.deltaRefreshOk", "reason": "claim delta refresh failed"})
    if not bool(click_result.get("claimedOwnerOk", False)):
        errors.append({"path": "ownerDelta.claimedOwnerOk", "reason": "claimed cell did not resolve to target faction"})
    if str(click_result.get("immunityDeltaSource", "")).strip() != "backend_receipt":
        errors.append({"path": "ownerDelta.immunityDeltaSource", "reason": "gold immunity shield must come from backend receipt fields"})
    if not bool(click_result.get("immunityReceiptOk", False)):
        errors.append({"path": "ownerDelta.immunityReceiptOk", "reason": "claim receipt did not include formal backend immunity fields"})
    if not bool(claimed_screenshot.get("ok", False)):
        errors.append({"path": "ownerDelta.claimedScreenshot.ok", "reason": "claimed owner screenshot was not captured"})
    raw_screenshot_path = str(claimed_screenshot.get("path", "")).strip()
    screenshot_stats = _image_stats(Path(raw_screenshot_path).resolve()) if raw_screenshot_path else {"ok": False, "reason": "missing_path"}
    if not bool(screenshot_stats.get("ok", False)):
        errors.append({"path": "ownerDelta.claimedScreenshot.imageStats", "reason": "claimed owner screenshot is missing or visually flat"})
    if int(claimed_streaming.get("mainMapOwnerOverrideDrawCount", 0)) <= 0:
        errors.append({"path": "ownerDelta.claimedStreamingSummary.mainMapOwnerOverrideDrawCount", "reason": "owner override overlay was not drawn after claim"})
    if int(claimed_streaming.get("mainMapImmunityBorderDrawCount", 0)) <= 0:
        errors.append({"path": "ownerDelta.claimedStreamingSummary.mainMapImmunityBorderDrawCount", "reason": "gold immunity shield border was not drawn"})

    details = {
        "summaryOk": bool(summary.get("ok", False)),
        "godotReportOk": bool(godot_report.get("ok", False)),
        "clickActionOk": bool(click_result.get("ok", False)),
        "targetCell": click_result.get("targetCell", {}),
        "claimedOwnerOk": bool(click_result.get("claimedOwnerOk", False)),
        "immunityDeltaSource": str(click_result.get("immunityDeltaSource", "")),
        "immunityReceiptOk": bool(click_result.get("immunityReceiptOk", False)),
        "claimOwnerDeltaApplied": bool(claim_result.get("ownerDeltaApplied", False)),
        "claimDeltaRefreshOk": bool(claim_result.get("deltaRefreshOk", False)),
        "claimedScreenshot": str(claimed_screenshot.get("path", "")),
        "claimedScreenshotStats": screenshot_stats,
        "mainMapOwnerOverrideDrawCount": int(claimed_streaming.get("mainMapOwnerOverrideDrawCount", 0)),
        "mainMapImmunityBorderDrawCount": int(claimed_streaming.get("mainMapImmunityBorderDrawCount", 0)),
        "mainMapOwnerOverrideRelationCounts": claimed_streaming.get("mainMapOwnerOverrideRelationCounts", {}),
    }
    return len(errors) == 0, errors, details


def _validate_mainline_movement_sequence(
    summary: dict[str, Any],
    unit_id: str,
    *,
    require_countdown_label: bool = True,
) -> tuple[bool, list[dict[str, Any]], dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    godot_report = summary.get("godotReport", {})
    if not isinstance(godot_report, dict):
        godot_report = {}
    sequence = godot_report.get("sequenceCapture", {})
    if not isinstance(sequence, dict):
        sequence = {}
    frames = sequence.get("frames", [])
    if not isinstance(frames, list):
        frames = []
    if not bool(sequence.get("attempted", False)):
        errors.append({"path": "mainline.sequenceCapture", "reason": "movement sequence was not attempted"})
    if not bool(sequence.get("ok", False)):
        errors.append({"path": "mainline.sequenceCapture.ok", "reason": "movement sequence capture failed"})
    if len(frames) < 4:
        errors.append({"path": "mainline.sequenceCapture.frames", "reason": "expected at least 4 movement frames"})

    frame_indexes: list[int] = []
    progress_samples: list[float] = []
    position_samples: list[tuple[float, float]] = []
    active_march_display_count = 0
    moving_seen_count = 0
    stable_visual_frames = 0
    screenshot_paths: list[str] = []
    for frame in frames:
        if not isinstance(frame, dict):
            continue
        screenshot = frame.get("screenshot", {})
        if isinstance(screenshot, dict):
            screenshot_path = str(screenshot.get("path", "")).strip()
            if screenshot_path:
                screenshot_paths.append(screenshot_path)
                stats = _image_stats(Path(screenshot_path))
                if not bool(stats.get("ok", False)):
                    errors.append({"path": f"mainline.sequenceCapture.frame[{frame.get('index', '?')}].screenshot", "reason": "movement frame missing or flat"})
        map_unit_summary = frame.get("mapUnitVisual", {})
        if not isinstance(map_unit_summary, dict):
            continue
        path_layer = map_unit_summary.get("pathLayer", {})
        if not isinstance(path_layer, dict):
            path_layer = {}
        if (
            int(map_unit_summary.get("markerCount", 0)) > 0
            and int(path_layer.get("pathCount", 0)) > 0
            and int(path_layer.get("targetCount", 0)) > 0
            and (not require_countdown_label or int(map_unit_summary.get("countdownLabelCount", 0)) > 0)
        ):
            stable_visual_frames += 1
        marker_summary = _find_mainline_sequence_marker(map_unit_summary, unit_id)
        marker_state = marker_summary.get("marker", {}) if isinstance(marker_summary, dict) else {}
        if not isinstance(marker_state, dict):
            marker_state = {}
        if bool(marker_state.get("moving", False)):
            moving_seen_count += 1
        try:
            frame_indexes.append(int(marker_state.get("frameIndex", -1)))
        except (TypeError, ValueError):
            pass
        march_display = marker_summary.get("marchDisplay", {}) if isinstance(marker_summary, dict) else {}
        if isinstance(march_display, dict) and bool(march_display.get("active", False)):
            active_march_display_count += 1
            try:
                progress_samples.append(float(march_display.get("progress", 0.0)))
            except (TypeError, ValueError):
                pass
            position = march_display.get("position", marker_summary.get("position", {}))
            if isinstance(position, dict):
                try:
                    position_samples.append((float(position.get("x", 0.0)), float(position.get("y", 0.0))))
                except (TypeError, ValueError):
                    pass

    distinct_frame_indexes = sorted({index for index in frame_indexes if index >= 0})
    max_position_shift = 0.0
    if position_samples:
        origin_x, origin_y = position_samples[0]
        for x, y in position_samples[1:]:
            max_position_shift = max(max_position_shift, ((x - origin_x) ** 2 + (y - origin_y) ** 2) ** 0.5)
    if moving_seen_count < 2:
        errors.append({"path": "mainline.sequenceCapture.markers.moving", "reason": "selected unit did not keep marching animation across frames"})
    if len(distinct_frame_indexes) < 2:
        errors.append({"path": "mainline.sequenceCapture.markers.frameIndex", "reason": "selected unit frame index did not change"})
    if active_march_display_count < 2:
        errors.append({"path": "mainline.sequenceCapture.markers.marchDisplay", "reason": "selected unit did not expose authoritative-time display interpolation"})
    if stable_visual_frames < max(2, min(4, len(frames))):
        errors.append({"path": "mainline.sequenceCapture.mapUnitVisual", "reason": "path/target/countdown did not remain stable across movement frames"})

    return len(errors) == 0, errors, {
        "attempted": bool(sequence.get("attempted", False)),
        "frameCount": len(frames),
        "movingSeenCount": moving_seen_count,
        "distinctFrameIndexes": distinct_frame_indexes,
        "activeMarchDisplayCount": active_march_display_count,
        "progressSamples": [round(value, 4) for value in progress_samples],
        "maxPositionShift": round(max_position_shift, 3),
        "stableVisualFrames": stable_visual_frames,
        "screenshotPaths": screenshot_paths,
    }


def _find_mainline_sequence_marker(map_unit_summary: dict[str, Any], unit_id: str) -> dict[str, Any]:
    raw_markers = map_unit_summary.get("markers", [])
    markers = raw_markers if isinstance(raw_markers, list) else []
    for marker in markers:
        if isinstance(marker, dict) and str(marker.get("unitId", "")).strip() == unit_id:
            return marker
    for marker in markers:
        if isinstance(marker, dict) and bool(marker.get("selected", False)):
            return marker
    return {}


def _allocate_mainline_evidence_dir(screenshot_dir: Path, suffix: str = "") -> Path:
    base_dir = screenshot_dir / ("mainline_submit_march" if not suffix else f"mainline_submit_march_{suffix}")
    if not base_dir.exists():
        return base_dir
    timestamp = int(time.time())
    for attempt in range(20):
        candidate = screenshot_dir / f"{base_dir.name}_{timestamp}_{attempt:02d}"
        if not candidate.exists():
            return candidate
    return screenshot_dir / f"{base_dir.name}_{timestamp}_fallback"


def _allocate_mainline_owner_delta_evidence_dir(screenshot_dir: Path) -> Path:
    base_dir = screenshot_dir / "mainline_owner_delta"
    if not base_dir.exists():
        return base_dir
    timestamp = int(time.time())
    for attempt in range(20):
        candidate = screenshot_dir / f"mainline_owner_delta_{timestamp}_{attempt:02d}"
        if not candidate.exists():
            return candidate
    return screenshot_dir / f"mainline_owner_delta_{timestamp}_fallback"


def _run_mainline_map_unit_smoke(
    args: argparse.Namespace,
    screenshot_dir: Path,
    *,
    scenario_id: str = "northwest",
    target_tile_id: str = "",
    expected_anchor_id: str = EXPECTED_MAINLINE_QUEUE_ANCHOR_ID,
    expected_direction: str = EXPECTED_MAINLINE_ROAD_EXIT_DIRECTION,
    sequence_count: int | None = None,
    require_countdown_label: bool = True,
) -> dict[str, Any]:
    evidence_dir = _allocate_mainline_evidence_dir(screenshot_dir, "" if scenario_id == "northwest" else scenario_id)
    log_path = screenshot_dir / "logs" / f"mainline_submit_march_map_unit_{scenario_id}.log"
    smoke_script_path = REPO_ROOT / "godot-client" / "tools" / "run_mainline_visual_smoke.py"
    resolved_sequence_count = int(args.mainline_sequence_count) if sequence_count is None else int(sequence_count)
    command = [
        sys.executable,
        str(smoke_script_path),
        "--server-script",
        "start",
        "--isolated-backend-state",
        "--timeout-sec",
        str(float(args.mainline_timeout_sec)),
        "--backend-timeout-sec",
        str(float(args.mainline_backend_timeout_sec)),
        "--click-action",
        "world_click_main_city_node_troop_submit_march_map_unit",
        "--evidence-dir",
        str(evidence_dir),
        "--window-width",
        "1600",
        "--window-height",
        "900",
        "--sequence-capture-count",
        str(resolved_sequence_count),
        "--sequence-capture-interval-sec",
        str(float(args.mainline_sequence_interval_sec)),
    ]
    if target_tile_id:
        command.extend(["--map-unit-march-target-tile-id", target_tile_id])
    command_result = _run_command(command, REPO_ROOT, log_path, float(args.mainline_timeout_sec) + 45.0)
    summary_path = evidence_dir / "mainline_visual_smoke_summary.json"
    if not command_result.get("ok", False):
        return {
            "ok": False,
            "commandResult": command_result,
            "evidenceDir": str(evidence_dir),
            "summaryPath": str(summary_path),
            "logPath": str(log_path),
            "errors": [{"path": "mainline.command", "reason": "command returned non-zero"}],
        }
    if not summary_path.exists():
        return {
            "ok": False,
            "commandResult": command_result,
            "evidenceDir": str(evidence_dir),
            "summaryPath": str(summary_path),
            "logPath": str(log_path),
            "errors": [{"path": "mainline.summary", "reason": "summary report missing"}],
        }
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    validation_ok, validation_errors, validation_details = _validate_mainline_map_unit_smoke(
        summary,
        expected_anchor_id=expected_anchor_id,
        expected_direction=expected_direction,
        expected_target_tile_id=target_tile_id,
        scenario_id=scenario_id,
        require_countdown_label=require_countdown_label,
    )
    artifacts = summary.get("artifacts", {})
    if not isinstance(artifacts, dict):
        artifacts = {}
    return {
        "ok": validation_ok,
        "commandResult": command_result,
        "evidenceDir": str(evidence_dir),
        "summaryPath": str(summary_path),
        "logPath": str(log_path),
        "errors": validation_errors,
        **validation_details,
        "mainlineScreenshot": str(artifacts.get("screenshot", "")),
        "movementSequenceDir": str(artifacts.get("movementSequenceDir", evidence_dir / "movement_sequence")),
        "movementContactSheet": str(artifacts.get("movementContactSheet", "")),
        "movementPreviewGif": str(artifacts.get("movementPreviewGif", "")),
        "movementUnitCloseupContactSheet": str(artifacts.get("movementUnitCloseupContactSheet", "")),
        "movementUnitCloseupGif": str(artifacts.get("movementUnitCloseupGif", "")),
        "movementUnitCloseupMid": str(artifacts.get("movementUnitCloseupMid", "")),
    }


def _run_mainline_owner_delta_smoke(args: argparse.Namespace, screenshot_dir: Path) -> dict[str, Any]:
    evidence_dir = _allocate_mainline_owner_delta_evidence_dir(screenshot_dir)
    log_path = screenshot_dir / "logs" / "mainline_owner_delta.log"
    smoke_script_path = REPO_ROOT / "godot-client" / "tools" / "run_mainline_visual_smoke.py"
    command = [
        sys.executable,
        str(smoke_script_path),
        "--server-script",
        "start",
        "--isolated-backend-state",
        "--timeout-sec",
        str(float(args.mainline_timeout_sec)),
        "--backend-timeout-sec",
        str(float(args.mainline_backend_timeout_sec)),
        "--click-action",
        "world_main_map_claim_release_cell",
        "--evidence-dir",
        str(evidence_dir),
        "--window-width",
        "1600",
        "--window-height",
        "900",
    ]
    command_result = _run_command(command, REPO_ROOT, log_path, float(args.mainline_timeout_sec) + 45.0)
    summary_path = evidence_dir / "mainline_visual_smoke_summary.json"
    if not command_result.get("ok", False):
        return {
            "ok": False,
            "commandResult": command_result,
            "evidenceDir": str(evidence_dir),
            "summaryPath": str(summary_path),
            "logPath": str(log_path),
            "errors": [{"path": "ownerDelta.command", "reason": "command returned non-zero"}],
        }
    if not summary_path.exists():
        return {
            "ok": False,
            "commandResult": command_result,
            "evidenceDir": str(evidence_dir),
            "summaryPath": str(summary_path),
            "logPath": str(log_path),
            "errors": [{"path": "ownerDelta.summary", "reason": "summary report missing"}],
        }
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    validation_ok, validation_errors, validation_details = _validate_mainline_owner_delta_smoke(summary)
    godot_report = summary.get("godotReport", {})
    click_result = godot_report.get("clickActionResult", {}) if isinstance(godot_report, dict) else {}
    claimed_screenshot = click_result.get("claimedScreenshot", {}) if isinstance(click_result, dict) else {}
    return {
        "ok": validation_ok,
        "commandResult": command_result,
        "evidenceDir": str(evidence_dir),
        "summaryPath": str(summary_path),
        "logPath": str(log_path),
        "errors": validation_errors,
        **validation_details,
        "claimedScreenshot": str(claimed_screenshot.get("path", "")) if isinstance(claimed_screenshot, dict) else "",
    }


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate real Godot screenshots for map unit visuals.")
    parser.add_argument("--godot-exe", default="", help="Explicit Godot executable path")
    parser.add_argument("--project-path", default=DEFAULT_PROJECT_PATH, help="Godot project path")
    parser.add_argument("--screenshot-dir", default=str(DEFAULT_SCREENSHOT_DIR), help="Screenshot output directory")
    parser.add_argument("--report-path", default=str(DEFAULT_REPORT_PATH), help="Validation report path")
    parser.add_argument("--timeout-sec", type=float, default=180.0, help="Godot driver timeout")
    parser.add_argument("--mainline-timeout-sec", type=float, default=240.0, help="Godot mainline submit/march timeout")
    parser.add_argument("--mainline-backend-timeout-sec", type=float, default=90.0, help="Backend timeout for the mainline submit/march smoke")
    parser.add_argument("--mainline-sequence-count", type=int, default=6, help="Movement frame count for the real mainline submit/march smoke")
    parser.add_argument("--mainline-sequence-interval-sec", type=float, default=0.20, help="Delay between real mainline movement frames")
    parser.add_argument("--min-hash-distance", type=int, default=3, help="Minimum rendered crop hash distance")
    parser.add_argument("--no-presentation-capture", action="store_true", help="Keep story UI panels visible")
    parser.add_argument("--skip-mainline", action="store_true", help="Skip the real mainline submit/march screenshot chain")
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    screenshot_dir = Path(args.screenshot_dir).resolve()
    report_path = Path(args.report_path).resolve()
    log_path = screenshot_dir / "logs" / "map_unit_visual_capture_driver.log"
    driver_report_path = screenshot_dir / "driver_report.json"
    screenshot_dir.mkdir(parents=True, exist_ok=True)
    report: dict[str, Any] = {
        "command": "validate_map_unit_visual_screenshot",
        "generatedAt": _now_iso(),
        "screenshotDir": str(screenshot_dir),
        "reportPath": str(report_path),
        "steps": [],
        "artifacts": {},
    }

    try:
        godot_exe = resolve_godot_gui_exe(args.godot_exe)
        _write_temp_driver_assets(screenshot_dir, driver_report_path, not args.no_presentation_capture)
        command = build_godot_command(
            godot_exe=godot_exe,
            project_path=args.project_path,
            scene_path="res://tmp/map_unit_visual_capture_driver.tscn",
            headless=False,
        )
        driver_result = _run_command(command, REPO_ROOT, log_path, args.timeout_sec)
        report["steps"].append({"name": "godot_driver_capture", **driver_result})
        report["artifacts"]["driverLog"] = str(log_path)
        if not driver_result["ok"]:
            raise RuntimeError("Godot map unit visual capture driver failed")
        if not driver_report_path.exists():
            raise RuntimeError(f"driver report missing: {driver_report_path}")

        driver_report = json.loads(driver_report_path.read_text(encoding="utf-8"))
        validation_ok, validation_errors, validation_detail = _validate_driver_captures(
            driver_report,
            screenshot_dir,
            int(args.min_hash_distance),
        )
        report["steps"].append(
            {
                "name": "map_unit_visual_screenshot_acceptance",
                "ok": validation_ok,
                "errors": validation_errors,
                **validation_detail,
            }
        )
        if not validation_ok:
            raise RuntimeError(f"map unit visual screenshot acceptance failed: {validation_errors}")

        mainline_result: dict[str, Any] = {"ok": True, "skipped": True, "reason": "skip_mainline_requested"}
        owner_delta_result: dict[str, Any] = {"ok": True, "skipped": True, "reason": "skip_mainline_requested"}
        if not args.skip_mainline:
            mainline_result = _run_mainline_map_unit_smoke(args, screenshot_dir)
            report["steps"].append(
                {
                    "name": "mainline_submit_march_map_unit_screenshot_acceptance",
                    **mainline_result,
                }
            )
            if not bool(mainline_result.get("ok", False)):
                raise RuntimeError(f"mainline map unit submit/march acceptance failed: {mainline_result.get('errors', [])}")
            exit_direction_results: list[dict[str, Any]] = []
            for scenario in MAINLINE_EXIT_DIRECTION_SCENARIOS:
                direction_result = _run_mainline_map_unit_smoke(
                    args,
                    screenshot_dir,
                    scenario_id=str(scenario["id"]),
                    target_tile_id=str(scenario["targetTileId"]),
                    expected_anchor_id=str(scenario["expectedAnchorId"]),
                    expected_direction=str(scenario["expectedDirection"]),
                    sequence_count=max(4, min(4, int(args.mainline_sequence_count))),
                    require_countdown_label=False,
                )
                exit_direction_results.append(direction_result)
                report["steps"].append(
                    {
                        "name": f"mainline_submit_march_map_unit_{scenario['id']}_exit_acceptance",
                        **direction_result,
                    }
                )
                if not bool(direction_result.get("ok", False)):
                    raise RuntimeError(
                        f"mainline map unit {scenario['id']} exit acceptance failed: {direction_result.get('errors', [])}"
                    )
            owner_delta_result = _run_mainline_owner_delta_smoke(args, screenshot_dir)
            report["steps"].append(
                {
                    "name": "mainline_owner_delta_screenshot_acceptance",
                    **owner_delta_result,
                }
            )
            if not bool(owner_delta_result.get("ok", False)):
                raise RuntimeError(f"mainline owner delta acceptance failed: {owner_delta_result.get('errors', [])}")

        captures = driver_report.get("captures", [])
        screenshots = [str(capture.get("screenshotPath", "")) for capture in captures if isinstance(capture, dict)]
        report["artifacts"] = {
            "screenshots": screenshots,
            "cropContactSheet": validation_detail.get("cropContactSheet", {}).get("path", ""),
            "driverReport": str(driver_report_path),
            "driverLog": str(log_path),
            "mainlineEvidenceDir": str(mainline_result.get("evidenceDir", "")),
            "mainlineSummary": str(mainline_result.get("summaryPath", "")),
            "mainlineLog": str(mainline_result.get("logPath", "")),
            "mainlineScreenshot": str(mainline_result.get("mainlineScreenshot", "")),
            "mainlineMovementSequenceDir": str(mainline_result.get("movementSequenceDir", "")),
            "mainlineMovementContactSheet": str(mainline_result.get("movementContactSheet", "")),
            "mainlineMovementPreviewGif": str(mainline_result.get("movementPreviewGif", "")),
            "mainlineMovementUnitCloseupContactSheet": str(mainline_result.get("movementUnitCloseupContactSheet", "")),
            "mainlineMovementUnitCloseupGif": str(mainline_result.get("movementUnitCloseupGif", "")),
            "mainlineMovementUnitCloseupMid": str(mainline_result.get("movementUnitCloseupMid", "")),
            "mainlineExitDirectionResults": exit_direction_results if not args.skip_mainline else [],
            "mainlineOwnerDeltaEvidenceDir": str(owner_delta_result.get("evidenceDir", "")),
            "mainlineOwnerDeltaSummary": str(owner_delta_result.get("summaryPath", "")),
            "mainlineOwnerDeltaLog": str(owner_delta_result.get("logPath", "")),
            "mainlineOwnerDeltaClaimedScreenshot": str(owner_delta_result.get("claimedScreenshot", "")),
            "report": str(report_path),
        }
        report["driverReport"] = driver_report
        report["mainlineResult"] = mainline_result
        report["mainlineOwnerDeltaResult"] = owner_delta_result
        report["ok"] = True
        _json_write(report_path, report)
        _json_print(report)
        return 0
    except Exception as exc:
        report["ok"] = False
        report["error"] = type(exc).__name__
        report["message"] = str(exc)
        _json_write(report_path, report)
        _json_print(report)
        return 1
    finally:
        _cleanup_temp_driver_assets()


if __name__ == "__main__":
    raise SystemExit(main())
