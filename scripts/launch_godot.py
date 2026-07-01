#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PROJECT_PATH = REPO_ROOT / "godot-client"
DEFAULT_MAIN_SCENE = "res://scenes/app/main.tscn"
DEFAULT_EXPORT_PRESET = "Windows Desktop"
DEFAULT_EXPORT_OUTPUT = REPO_ROOT / "exports" / "windows" / "SLG Commander.exe"
GODOT_RELEASE_EXPORT_STDOUT_LOG = REPO_ROOT / "tmp" / "godot_release_export_stdout.log"
GODOT_RELEASE_EXPORT_STDERR_LOG = REPO_ROOT / "tmp" / "godot_release_export_stderr.log"
FORBIDDEN_EXPORT_LOG_MARKERS = (
    "SCRIPT ERROR",
    "ERROR:",
    "res://tmp/",
    "res://scripts/dev/",
    "res://scenes/dev/",
    "res://addons/ui_preview_sandbox/",
    "res://addons/editor_locale_helper/",
    "res://tools/",
    "res://ui_generated/",
    "res://data/ui_preview/",
    "res://Godot/app_userdata/",
)

COMMON_GUI_PATHS = (
    r"C:\Godot_v4.6.2-stable_win64.exe",
    r"D:\Apps\Godot\Godot_v4.6.2-stable_win64.exe",
    r"C:\Program Files\Godot\Godot_v4.6.2-stable_win64.exe",
    r"C:\Users\26739\Downloads\Godot_v4.6.2-stable_win64.exe",
)
COMMON_CONSOLE_PATHS = (
    r"C:\Godot_v4.6.2-stable_win64_console.exe",
    r"D:\Apps\Godot\Godot_v4.6.2-stable_win64_console.exe",
    r"C:\Program Files\Godot\Godot_v4.6.2-stable_win64_console.exe",
    r"C:\Users\26739\Downloads\Godot_v4.6.2-stable_win64_console.exe",
)


def _resolve_from_env(names: tuple[str, ...]) -> str:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


def _resolve_existing(paths: tuple[str, ...]) -> str:
    for candidate in paths:
        if Path(candidate).exists():
            return candidate
    return ""


def _resolve_from_path(names: tuple[str, ...]) -> str:
    for name in names:
        found = shutil.which(name)
        if found:
            return found
    return ""


def resolve_godot_exe(mode: str, explicit: str) -> str:
    if explicit.strip():
        return explicit.strip()

    if mode in {"headless", "export-release"}:
        env_candidate = _resolve_from_env(("GODOT_CONSOLE_EXE", "GODOT_EXE", "GODOT_GUI_EXE", "GODOT_EDITOR_EXE"))
        if env_candidate:
            return env_candidate
        path_candidate = _resolve_existing(COMMON_CONSOLE_PATHS + COMMON_GUI_PATHS)
        if path_candidate:
            return path_candidate
        found = _resolve_from_path(("godot_console.exe", "Godot_v4.6.2-stable_win64_console.exe", "godot4", "godot.exe"))
        if found:
            return found
        return ""

    env_candidate = _resolve_from_env(("GODOT_EDITOR_EXE", "GODOT_GUI_EXE", "GODOT_EXE", "GODOT_CONSOLE_EXE"))
    if env_candidate:
        return env_candidate
    path_candidate = _resolve_existing(COMMON_GUI_PATHS + COMMON_CONSOLE_PATHS)
    if path_candidate:
        return path_candidate
    found = _resolve_from_path(("godot.exe", "godot4", "Godot_v4.6.2-stable_win64.exe", "godot_console.exe"))
    if found:
        return found
    return ""


def resolve_export_output(output: str) -> Path:
    path = Path(output.strip() or str(DEFAULT_EXPORT_OUTPUT))
    if path.is_absolute():
        return path
    return (REPO_ROOT / path).resolve()


def build_command(
    mode: str,
    exe: str,
    project_path: Path,
    scene: str,
    quit_after: int,
    preset: str = DEFAULT_EXPORT_PRESET,
    output_path: Path | None = None,
) -> list[str]:
    command = [exe]
    if mode == "editor":
        command.append("--editor")
    if mode == "headless":
        command.extend(["--headless", "--quit-after", str(quit_after)])
    if mode == "export-release":
        command.append("--headless")
    command.extend(["--path", str(project_path)])
    if mode == "export-release":
        export_output = output_path or DEFAULT_EXPORT_OUTPUT
        command.extend(["--export-release", preset.strip() or DEFAULT_EXPORT_PRESET, str(export_output)])
    elif mode == "editor" and scene.strip():
        command.append(scene.strip())
    elif mode != "editor" and scene.strip():
        command.extend(["--scene", scene.strip()])
    return command


def inspect_export_log_text(text: str) -> list[str]:
    return [marker for marker in FORBIDDEN_EXPORT_LOG_MARKERS if marker in text]


def run_export_release(command: list[str]) -> int:
    GODOT_RELEASE_EXPORT_STDOUT_LOG.parent.mkdir(parents=True, exist_ok=True)
    completed = subprocess.run(
        command,
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    GODOT_RELEASE_EXPORT_STDOUT_LOG.write_text(completed.stdout, encoding="utf-8", errors="replace")
    GODOT_RELEASE_EXPORT_STDERR_LOG.write_text(completed.stderr, encoding="utf-8", errors="replace")
    if completed.stdout:
        print(completed.stdout, end="")
    if completed.stderr:
        print(completed.stderr, end="", file=sys.stderr)
    if completed.returncode != 0:
        return int(completed.returncode)
    hits = inspect_export_log_text(f"{completed.stdout}\n{completed.stderr}")
    if hits:
        print(
            json.dumps(
                {
                    "ok": False,
                    "status": "failed",
                    "reason": "godot_release_export_hygiene_failed",
                    "hits": hits,
                    "logs": {
                        "stdout": str(GODOT_RELEASE_EXPORT_STDOUT_LOG),
                        "stderr": str(GODOT_RELEASE_EXPORT_STDERR_LOG),
                    },
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 3
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Launch the 8989 Godot project with a stable project root.")
    parser.add_argument("--mode", choices=("editor", "runtime", "headless", "export-release"), default="editor")
    parser.add_argument("--godot-exe", default="", help="Explicit Godot executable path")
    parser.add_argument("--project-path", default=str(DEFAULT_PROJECT_PATH), help="Godot project root")
    parser.add_argument("--scene", default=DEFAULT_MAIN_SCENE, help="Scene path used for runtime/headless")
    parser.add_argument("--quit-after", type=int, default=1, help="Headless quit-after seconds")
    parser.add_argument("--preset", default=DEFAULT_EXPORT_PRESET, help="Godot export preset used by export-release")
    parser.add_argument("--output", default=str(DEFAULT_EXPORT_OUTPUT), help="Output path used by export-release")
    parser.add_argument("--dry-run", action="store_true", help="Print the resolved command and exit")
    args, passthrough = parser.parse_known_args()

    project_path = Path(args.project_path).resolve()
    export_output_path = resolve_export_output(args.output) if args.mode == "export-release" else None
    exe = resolve_godot_exe(args.mode, args.godot_exe)
    payload = {
        "mode": args.mode,
        "projectPath": str(project_path),
        "resolved": bool(exe),
        "godotExe": exe or None,
    }
    if args.mode == "export-release":
        payload["preset"] = args.preset
        payload["outputPath"] = str(export_output_path)

    if not exe:
        payload["hint"] = "Set GODOT_EDITOR_EXE / GODOT_GUI_EXE / GODOT_CONSOLE_EXE / GODOT_EXE or pass --godot-exe."
        if args.dry_run:
            print(json.dumps(payload, ensure_ascii=False, indent=2))
            return 0
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 1

    command = build_command(args.mode, exe, project_path, args.scene, args.quit_after, args.preset, export_output_path)
    if passthrough:
        command.extend(passthrough)
    payload["command"] = command

    if args.dry_run:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    if args.mode == "export-release" and export_output_path is not None:
        export_output_path.parent.mkdir(parents=True, exist_ok=True)

    if args.mode == "export-release":
        return run_export_release(command)

    if args.mode == "headless":
        completed = subprocess.run(command, cwd=REPO_ROOT)
        return int(completed.returncode)

    subprocess.Popen(command, cwd=REPO_ROOT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
