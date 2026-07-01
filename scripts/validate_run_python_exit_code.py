#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
RUN_PYTHON = REPO_ROOT / "scripts" / "run_python.cmd"


def _run_python_exit(exit_code: int) -> subprocess.CompletedProcess[str]:
    command = [
        str(RUN_PYTHON),
        "-c",
        f"import sys; sys.exit({exit_code})",
    ]
    return subprocess.run(
        command,
        cwd=REPO_ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )


def main() -> int:
    checks: list[dict[str, object]] = []
    for expected in (0, 7):
        completed = _run_python_exit(expected)
        checks.append({
            "name": f"python_exit_{expected}",
            "expectedExitCode": expected,
            "actualExitCode": completed.returncode,
            "passed": completed.returncode == expected,
            "stdout": completed.stdout.strip(),
            "stderr": completed.stderr.strip(),
        })

    passed = all(bool(check["passed"]) for check in checks)
    print(json.dumps({
        "gate": "run_python_exit_code",
        "passed": passed,
        "runPython": str(RUN_PYTHON),
        "checks": checks,
    }, ensure_ascii=False, indent=2))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
