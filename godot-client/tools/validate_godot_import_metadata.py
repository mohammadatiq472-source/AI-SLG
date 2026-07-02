#!/usr/bin/env python3
"""
Validate Godot PNG import metadata adjacency for delivered theme assets.

Formal entrypoints:
  scripts\run_python.cmd godot-client\tools\validate_godot_import_metadata.py --allow-missing
  scripts\run_python.cmd godot-client\tools\validate_godot_import_metadata.py

The report-only mode is intended for daily visual work while runtime loaders still
support Image.load fallback. The strict mode is the packaging gate: every .png
under the configured delivery roots must have an adjacent .png.import file.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ASSET_ROOTS = [
    REPO_ROOT / "godot-client" / "assets" / "themes" / "slgclient" / "current" / "ui",
    REPO_ROOT / "godot-client" / "assets" / "themes" / "slgclient" / "current" / "units",
]
DEFAULT_REPORT_PATH = REPO_ROOT / "tmp" / "gates" / "godot_import_metadata" / "import_metadata_report.json"


def _repo_relative(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def _json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _json_print(payload: Any) -> None:
    print(json.dumps(payload, ensure_ascii=True, indent=2))


def _scan_asset_root(root: Path, sample_limit: int) -> dict[str, Any]:
    root = root.resolve()
    png_paths = sorted(path for path in root.rglob("*.png") if path.is_file()) if root.exists() else []
    import_paths = sorted(path for path in root.rglob("*.png.import") if path.is_file()) if root.exists() else []
    missing_imports = [path for path in png_paths if not Path(str(path) + ".import").exists()]
    orphan_imports = []
    for import_path in import_paths:
        png_path = import_path.with_suffix("")
        if not png_path.exists():
            orphan_imports.append(import_path)

    return {
        "root": _repo_relative(root),
        "exists": root.exists(),
        "pngCount": len(png_paths),
        "pngImportCount": len(import_paths),
        "missingAdjacentImportCount": len(missing_imports),
        "orphanImportCount": len(orphan_imports),
        "missingAdjacentImportSample": [_repo_relative(path) for path in missing_imports[:sample_limit]],
        "orphanImportSample": [_repo_relative(path) for path in orphan_imports[:sample_limit]],
    }


def _build_report(asset_roots: list[Path], sample_limit: int, allow_missing: bool) -> dict[str, Any]:
    root_reports = [_scan_asset_root(root, sample_limit) for root in asset_roots]
    total_png = sum(int(entry["pngCount"]) for entry in root_reports)
    total_import = sum(int(entry["pngImportCount"]) for entry in root_reports)
    total_missing = sum(int(entry["missingAdjacentImportCount"]) for entry in root_reports)
    total_orphan = sum(int(entry["orphanImportCount"]) for entry in root_reports)
    hard_gate_ok = total_missing == 0 and total_orphan == 0 and all(bool(entry["exists"]) for entry in root_reports)
    return {
        "schemaVersion": "godot_png_import_metadata_gate_v1",
        "ok": hard_gate_ok or allow_missing,
        "hardGateOk": hard_gate_ok,
        "allowMissing": allow_missing,
        "totals": {
            "pngCount": total_png,
            "pngImportCount": total_import,
            "missingAdjacentImportCount": total_missing,
            "orphanImportCount": total_orphan,
        },
        "roots": root_reports,
        "policy": {
            "reportOnlyEntrypoint": "npm run godot:asset-import-metadata:report",
            "strictPackagingEntrypoint": "npm run godot:asset-import-metadata:gate",
            "runtimeFallback": "ResourceLoader/load first, Image.load fallback until Godot import metadata is produced.",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--allow-missing", action="store_true", help="write a report and exit 0 even when metadata is missing")
    parser.add_argument("--asset-root", action="append", default=[], help="asset root to scan; may be passed multiple times")
    parser.add_argument("--report-path", default=str(DEFAULT_REPORT_PATH), help="JSON report path")
    parser.add_argument("--sample-limit", type=int, default=16, help="number of missing/orphan samples per root")
    args = parser.parse_args()

    asset_roots = [Path(value) for value in args.asset_root] if args.asset_root else DEFAULT_ASSET_ROOTS
    asset_roots = [path if path.is_absolute() else REPO_ROOT / path for path in asset_roots]
    report = _build_report(asset_roots, max(1, int(args.sample_limit)), bool(args.allow_missing))
    report_path = Path(args.report_path)
    if not report_path.is_absolute():
        report_path = REPO_ROOT / report_path
    _json_write(report_path, report)
    _json_print({"ok": report["ok"], "hardGateOk": report["hardGateOk"], "reportPath": _repo_relative(report_path), "totals": report["totals"]})
    return 0 if bool(report["ok"]) else 1


if __name__ == "__main__":
    raise SystemExit(main())
