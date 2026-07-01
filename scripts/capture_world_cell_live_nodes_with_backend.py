#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


REPO_ROOT = Path(__file__).resolve().parents[1]
TMP_DIR = REPO_ROOT / "tmp"


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _check_health(base_url: str, timeout_sec: float) -> tuple[bool, str]:
    try:
        with urlopen(f"{base_url.rstrip('/')}/api/health", timeout=timeout_sec) as response:
            return response.status == 200, f"status={response.status}"
    except URLError as error:
        return False, str(error)
    except Exception as error:  # pragma: no cover - defensive wrapper for local process boot.
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


def _create_no_window_flags() -> int:
    if os.name != "nt":
        return 0
    return int(getattr(subprocess, "CREATE_NO_WINDOW", 0))


def _resolve_node_exe() -> str:
    env_candidate = os.getenv("NODE_EXE", "").strip()
    if env_candidate:
        return env_candidate
    return shutil.which("node") or ""


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


def _stop_process(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=10)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run world-cell capture against a temporary backend started from the current workspace.",
    )
    parser.add_argument("--backend-start-timeout-sec", type=float, default=90.0)
    args, capture_args = parser.parse_known_args()

    port = _find_free_port()
    backend_url = f"http://127.0.0.1:{port}"
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    stdout_path = TMP_DIR / "camera_current_backend_stdout.log"
    stderr_path = TMP_DIR / "camera_current_backend_stderr.log"
    node_exe = _resolve_node_exe()
    if not node_exe:
        print(json.dumps({
            "ok": False,
            "error": "node_runtime_not_found",
            "hint": "Expose node on PATH or set NODE_EXE.",
        }, ensure_ascii=False, indent=2))
        return 1

    env = os.environ.copy()
    env.update({
        "HOST": "127.0.0.1",
        "PORT": str(port),
        "GAME_CLOCK_ENABLED": "0",
        "NODE_ENV": env.get("NODE_ENV", "test"),
        "SLG_LOCAL_GATE_BACKEND": "1",
    })

    with stdout_path.open("wb") as stdout_file, stderr_path.open("wb") as stderr_file:
        guard_ok, guard_detail = _run_service_process_prestart_guard(stdout_file)
        if not guard_ok:
            print(json.dumps({
                "ok": False,
                "error": "service_process_prestart_failed",
                "serviceProcessPrestartTail": guard_detail,
                "backendStdout": str(stdout_path),
                "backendStderr": str(stderr_path),
            }, ensure_ascii=False, indent=2))
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
            ok, detail = _wait_for_health(backend_url, args.backend_start_timeout_sec)
            if not ok:
                print(json.dumps({
                    "ok": False,
                    "error": "backend_health_failed",
                    "backendUrl": backend_url,
                    "backendHealth": detail,
                    "backendStdout": str(stdout_path),
                    "backendStderr": str(stderr_path),
                }, ensure_ascii=False, indent=2))
                return 1

            print(json.dumps({
                "backendReady": True,
                "backendUrl": backend_url,
                "backendStdout": str(stdout_path),
                "backendStderr": str(stderr_path),
            }, ensure_ascii=False), flush=True)

            capture_command = [
                sys.executable,
                str(REPO_ROOT / "scripts" / "capture_world_cell_live_nodes.py"),
                "--backend-url",
                backend_url,
                *capture_args,
            ]
            completed = subprocess.run(capture_command, cwd=REPO_ROOT, env=os.environ.copy())
            return int(completed.returncode)
        finally:
            _stop_process(backend)


if __name__ == "__main__":
    raise SystemExit(main())
