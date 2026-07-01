#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_PROJECT_PATH = REPO_ROOT / "godot-client"
DEFAULT_APK_PATH = REPO_ROOT / "tmp" / "android" / "slg-commander-debug.apk"
EXPORT_STDOUT_LOG = REPO_ROOT / "tmp" / "godot_android_debug_export_stdout.log"
EXPORT_STDERR_LOG = REPO_ROOT / "tmp" / "godot_android_debug_export_stderr.log"
INSTALL_STDOUT_LOG = REPO_ROOT / "tmp" / "godot_android_debug_install_stdout.log"
INSTALL_STDERR_LOG = REPO_ROOT / "tmp" / "godot_android_debug_install_stderr.log"


sys.path.insert(0, str(SCRIPT_DIR))
from launch_godot import resolve_godot_exe  # noqa: E402


def _stringify_path(path: Path | None) -> str | None:
    return str(path) if path is not None else None


def _run_probe(command: list[str], timeout_sec: float = 10.0) -> dict[str, Any]:
    try:
        completed = subprocess.run(
            command,
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout_sec,
        )
    except FileNotFoundError as exc:
        return {"ok": False, "error": "not_found", "detail": str(exc), "command": command}
    except subprocess.TimeoutExpired as exc:
        return {"ok": False, "error": "timeout", "detail": str(exc), "command": command}
    return {
        "ok": completed.returncode == 0,
        "returnCode": completed.returncode,
        "stdout": completed.stdout.strip(),
        "stderr": completed.stderr.strip(),
        "command": command,
    }


def _parse_export_presets(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []

    presets: dict[str, dict[str, Any]] = {}
    current_id = ""
    section_pattern = re.compile(r"^\[preset\.(\d+)\]$")
    key_value_pattern = re.compile(r"^([A-Za-z0-9_./-]+)=(.*)$")
    for raw_line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw_line.strip()
        section_match = section_pattern.match(line)
        if section_match:
            current_id = section_match.group(1)
            presets.setdefault(current_id, {"id": current_id})
            continue
        if not current_id or line.startswith("["):
            continue
        key_value_match = key_value_pattern.match(line)
        if not key_value_match:
            continue
        key = key_value_match.group(1)
        value = key_value_match.group(2).strip()
        if value.startswith('"') and value.endswith('"') and len(value) >= 2:
            value = value[1:-1]
        presets[current_id][key] = value
    return [presets[key] for key in sorted(presets.keys(), key=lambda item: int(item))]


def _select_android_preset(presets: list[dict[str, Any]], requested_name: str) -> dict[str, Any] | None:
    android_presets = [
        preset for preset in presets if str(preset.get("platform", "")).strip().lower() == "android"
    ]
    if requested_name.strip():
        for preset in android_presets:
            if str(preset.get("name", "")).strip() == requested_name.strip():
                return preset
    if android_presets:
        return android_presets[0]
    return None


def _parse_adb_devices(adb_output: str) -> list[dict[str, str]]:
    devices: list[dict[str, str]] = []
    for raw_line in adb_output.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("List of devices"):
            continue
        parts = re.split(r"\s+", line)
        if len(parts) < 2:
            continue
        serial, state = parts[0], parts[1]
        if state == "device":
            devices.append({"serial": serial, "state": state})
    return devices


def _resolve_adb(explicit_adb: str) -> str:
    if explicit_adb.strip():
        return explicit_adb.strip()
    env_adb = os.environ.get("ANDROID_ADB", "").strip()
    if env_adb:
        return env_adb
    found = shutil.which("adb")
    return found or ""


def _probe(project_path: Path, godot_exe: str, preset_name: str, apk_path: Path, adb_path: str) -> dict[str, Any]:
    export_presets_path = project_path / "export_presets.cfg"
    presets = _parse_export_presets(export_presets_path)
    android_preset = _select_android_preset(presets, preset_name)
    resolved_adb = _resolve_adb(adb_path)
    adb_probe: dict[str, Any] | None = None
    devices: list[dict[str, str]] = []
    if resolved_adb:
        adb_probe = _run_probe([resolved_adb, "devices"], timeout_sec=10.0)
        if adb_probe.get("ok"):
            devices = _parse_adb_devices(str(adb_probe.get("stdout", "")))

    export_blockers: list[str] = []
    if not godot_exe:
        export_blockers.append("missing_godot_exe")
    if not project_path.exists():
        export_blockers.append("missing_godot_project")
    if not export_presets_path.exists():
        export_blockers.append("missing_export_presets_cfg")
    elif android_preset is None:
        export_blockers.append("missing_android_export_preset")

    install_blockers: list[str] = []
    if not resolved_adb:
        install_blockers.append("missing_adb")
    elif adb_probe is not None and not adb_probe.get("ok"):
        install_blockers.append("adb_devices_failed")
    if not devices:
        install_blockers.append("missing_connected_android_device")
    if not apk_path.exists():
        install_blockers.append("missing_debug_apk")

    preset_export_path = ""
    if android_preset is not None:
        preset_export_path = str(android_preset.get("export_path", "")).strip()

    return {
        "projectPath": str(project_path),
        "godotExe": godot_exe or None,
        "exportPresetsPath": str(export_presets_path),
        "exportPresetsExists": export_presets_path.exists(),
        "androidPreset": android_preset,
        "requestedPresetName": preset_name,
        "presetExportPath": preset_export_path or None,
        "apkPath": str(apk_path),
        "apkExists": apk_path.exists(),
        "androidSdkRoot": os.environ.get("ANDROID_SDK_ROOT") or os.environ.get("ANDROID_HOME") or None,
        "adb": resolved_adb or None,
        "adbProbe": adb_probe,
        "devices": devices,
        "exportReady": len(export_blockers) == 0,
        "installReady": len(install_blockers) == 0,
        "exportBlockers": export_blockers,
        "installBlockers": install_blockers,
    }


def _blocked_payload(mode: str, probe: dict[str, Any], blockers: list[str]) -> dict[str, Any]:
    return {
        "ok": True,
        "status": "blocked",
        "mode": mode,
        "blockers": blockers,
        "probe": probe,
        "nextCommands": {
            "preflight": "npm run godot:android:debug:preflight",
            "export": "npm run godot:android:debug:export",
            "install": "npm run godot:android:debug:install -- --apk <debug.apk>",
        },
    }


def _run_export(godot_exe: str, project_path: Path, preset_name: str, apk_path: Path, timeout_sec: float) -> dict[str, Any]:
    apk_path.parent.mkdir(parents=True, exist_ok=True)
    EXPORT_STDOUT_LOG.parent.mkdir(parents=True, exist_ok=True)
    command = [
        godot_exe,
        "--headless",
        "--path",
        str(project_path),
        "--export-debug",
        preset_name,
        str(apk_path),
    ]
    with EXPORT_STDOUT_LOG.open("w", encoding="utf-8", errors="replace") as stdout_file, EXPORT_STDERR_LOG.open(
        "w", encoding="utf-8", errors="replace"
    ) as stderr_file:
        try:
            completed = subprocess.run(
                command,
                cwd=REPO_ROOT,
                stdout=stdout_file,
                stderr=stderr_file,
                text=True,
                timeout=timeout_sec,
            )
            return {
                "ok": completed.returncode == 0 and apk_path.exists(),
                "returnCode": completed.returncode,
                "command": command,
                "apkPath": str(apk_path),
                "apkExists": apk_path.exists(),
                "logs": {"stdout": str(EXPORT_STDOUT_LOG), "stderr": str(EXPORT_STDERR_LOG)},
            }
        except subprocess.TimeoutExpired as exc:
            return {
                "ok": False,
                "error": "timeout",
                "detail": str(exc),
                "command": command,
                "logs": {"stdout": str(EXPORT_STDOUT_LOG), "stderr": str(EXPORT_STDERR_LOG)},
            }


def _run_install(adb_path: str, serial: str, apk_path: Path, timeout_sec: float) -> dict[str, Any]:
    INSTALL_STDOUT_LOG.parent.mkdir(parents=True, exist_ok=True)
    command = [adb_path]
    if serial.strip():
        command.extend(["-s", serial.strip()])
    command.extend(["install", "-r", str(apk_path)])
    with INSTALL_STDOUT_LOG.open("w", encoding="utf-8", errors="replace") as stdout_file, INSTALL_STDERR_LOG.open(
        "w", encoding="utf-8", errors="replace"
    ) as stderr_file:
        try:
            completed = subprocess.run(
                command,
                cwd=REPO_ROOT,
                stdout=stdout_file,
                stderr=stderr_file,
                text=True,
                timeout=timeout_sec,
            )
            return {
                "ok": completed.returncode == 0,
                "returnCode": completed.returncode,
                "command": command,
                "logs": {"stdout": str(INSTALL_STDOUT_LOG), "stderr": str(INSTALL_STDERR_LOG)},
            }
        except subprocess.TimeoutExpired as exc:
            return {
                "ok": False,
                "error": "timeout",
                "detail": str(exc),
                "command": command,
                "logs": {"stdout": str(INSTALL_STDOUT_LOG), "stderr": str(INSTALL_STDERR_LOG)},
            }


def main() -> int:
    parser = argparse.ArgumentParser(description="Godot Android debug export/install gate.")
    parser.add_argument("--mode", choices=("preflight", "export", "install", "all"), default="preflight")
    parser.add_argument("--project-path", default=str(DEFAULT_PROJECT_PATH))
    parser.add_argument("--godot-exe", default="")
    parser.add_argument("--preset", default="Android Debug")
    parser.add_argument("--apk", default=str(DEFAULT_APK_PATH))
    parser.add_argument("--adb", default="")
    parser.add_argument("--serial", default=os.environ.get("ANDROID_SERIAL", ""))
    parser.add_argument("--timeout-sec", type=float, default=180.0)
    args = parser.parse_args()

    project_path = Path(args.project_path).resolve()
    apk_path = Path(args.apk).resolve()
    godot_exe = resolve_godot_exe("headless", args.godot_exe)
    probe = _probe(project_path, godot_exe, args.preset, apk_path, args.adb)

    if args.mode == "preflight":
        status = "ready" if probe["exportReady"] and probe["installReady"] else "blocked"
        print(
            json.dumps(
                {
                    "ok": True,
                    "status": status,
                    "mode": args.mode,
                    "probe": probe,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0

    if args.mode in {"export", "all"} and not probe["exportReady"]:
        print(json.dumps(_blocked_payload(args.mode, probe, probe["exportBlockers"]), ensure_ascii=False, indent=2))
        return 2

    export_result: dict[str, Any] | None = None
    if args.mode in {"export", "all"}:
        preset_name = str((probe.get("androidPreset") or {}).get("name", args.preset))
        export_result = _run_export(godot_exe, project_path, preset_name, apk_path, args.timeout_sec)
        if not export_result.get("ok"):
            print(
                json.dumps(
                    {"ok": False, "status": "failed", "mode": args.mode, "probe": probe, "export": export_result},
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return 1
        probe = _probe(project_path, godot_exe, args.preset, apk_path, args.adb)

    if args.mode in {"install", "all"} and not probe["installReady"]:
        print(json.dumps(_blocked_payload(args.mode, probe, probe["installBlockers"]), ensure_ascii=False, indent=2))
        return 2

    install_result: dict[str, Any] | None = None
    if args.mode in {"install", "all"}:
        adb_path = str(probe.get("adb") or "")
        serial = args.serial.strip() or str(probe["devices"][0]["serial"])
        install_result = _run_install(adb_path, serial, apk_path, args.timeout_sec)
        if not install_result.get("ok"):
            print(
                json.dumps(
                    {
                        "ok": False,
                        "status": "failed",
                        "mode": args.mode,
                        "probe": probe,
                        "export": export_result,
                        "install": install_result,
                    },
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return 1

    print(
        json.dumps(
            {
                "ok": True,
                "status": "passed",
                "mode": args.mode,
                "probe": probe,
                "export": export_result,
                "install": install_result,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
