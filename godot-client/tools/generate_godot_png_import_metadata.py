#!/usr/bin/env python3
r"""
Generate adjacent Godot .png.import metadata for delivered PNG assets.

Formal entrypoint:
  scripts\run_python.cmd godot-client\tools\generate_godot_png_import_metadata.py

This is a metadata generation step, not a runtime image converter. It mirrors
Godot's default texture import metadata shape and only writes missing
`<image>.png.import` files by default. Existing editor-generated import files
are left untouched unless --overwrite is passed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ASSET_ROOTS = [
    REPO_ROOT / "godot-client" / "assets" / "themes" / "slgclient" / "current" / "ui",
    REPO_ROOT / "godot-client" / "assets" / "themes" / "slgclient" / "current" / "units",
]
DEFAULT_REPORT_PATH = REPO_ROOT / "tmp" / "gates" / "godot_import_metadata" / "generate_import_metadata_report.json"


BASE36_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"


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


def _base36(value: int, width: int) -> str:
    if value <= 0:
        encoded = "0"
    else:
        parts: list[str] = []
        while value > 0:
            value, remainder = divmod(value, 36)
            parts.append(BASE36_ALPHABET[remainder])
        encoded = "".join(reversed(parts))
    return encoded[-width:].rjust(width, "0")


def _stable_uid(res_path: str) -> str:
    digest_value = int(hashlib.sha256(("godot-import-uid:" + res_path).encode("utf-8")).hexdigest(), 16)
    return "uid://c" + _base36(digest_value, 12)


def _res_path(path: Path) -> str:
    relative_to_project = path.resolve().relative_to((REPO_ROOT / "godot-client").resolve()).as_posix()
    return f"res://{relative_to_project}"


def _imported_ctex_path(res_path: str) -> str:
    file_name = Path(res_path.replace("res://", "")).name
    path_hash = hashlib.md5(res_path.encode("utf-8")).hexdigest()
    return f"res://.godot/imported/{file_name}-{path_hash}.ctex"


def _render_png_import(source_path: Path) -> str:
    source_res = _res_path(source_path)
    ctex_res = _imported_ctex_path(source_res)
    uid = _stable_uid(source_res)
    return f"""[remap]

importer=\"texture\"
type=\"CompressedTexture2D\"
uid=\"{uid}\"
path=\"{ctex_res}\"
metadata={{
\"vram_texture\": false
}}

[deps]

source_file=\"{source_res}\"
dest_files=[\"{ctex_res}\"]

[params]

compress/mode=0
compress/high_quality=false
compress/lossy_quality=0.7
compress/uastc_level=0
compress/rdo_quality_loss=0.0
compress/hdr_compression=1
compress/normal_map=0
compress/channel_pack=0
mipmaps/generate=false
mipmaps/limit=-1
roughness/mode=0
roughness/src_normal=\"\"
process/channel_remap/red=0
process/channel_remap/green=1
process/channel_remap/blue=2
process/channel_remap/alpha=3
process/fix_alpha_border=true
process/premult_alpha=false
process/normal_map_invert_y=false
process/hdr_as_srgb=false
process/hdr_clamp_exposure=false
process/size_limit=0
detect_3d/compress_to=1
"""


def _collect_png_paths(asset_roots: list[Path]) -> list[Path]:
    paths: list[Path] = []
    for root in asset_roots:
        if not root.exists():
            continue
        paths.extend(path for path in root.rglob("*.png") if path.is_file())
    return sorted(paths)


def _generate(asset_roots: list[Path], overwrite: bool, dry_run: bool, sample_limit: int) -> dict[str, Any]:
    png_paths = _collect_png_paths(asset_roots)
    generated: list[str] = []
    skipped_existing = 0
    for png_path in png_paths:
        import_path = Path(str(png_path) + ".import")
        if import_path.exists() and not overwrite:
            skipped_existing += 1
            continue
        if not dry_run:
            import_path.write_text(_render_png_import(png_path), encoding="utf-8")
        generated.append(_repo_relative(import_path))

    return {
        "schemaVersion": "godot_png_import_metadata_generator_v1",
        "ok": True,
        "dryRun": dry_run,
        "overwrite": overwrite,
        "pngCount": len(png_paths),
        "generatedCount": len(generated),
        "skippedExistingCount": skipped_existing,
        "generatedSample": generated[:sample_limit],
        "assetRoots": [_repo_relative(root) for root in asset_roots],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset-root", action="append", default=[], help="asset root to scan; may be passed multiple times")
    parser.add_argument("--overwrite", action="store_true", help="rewrite existing .png.import files")
    parser.add_argument("--dry-run", action="store_true", help="report what would be generated without writing files")
    parser.add_argument("--report-path", default=str(DEFAULT_REPORT_PATH), help="JSON report path")
    parser.add_argument("--sample-limit", type=int, default=16, help="generated sample count")
    args = parser.parse_args()

    asset_roots = [Path(value) for value in args.asset_root] if args.asset_root else DEFAULT_ASSET_ROOTS
    asset_roots = [path if path.is_absolute() else REPO_ROOT / path for path in asset_roots]
    report = _generate(asset_roots, bool(args.overwrite), bool(args.dry_run), max(1, int(args.sample_limit)))
    report_path = Path(args.report_path)
    if not report_path.is_absolute():
        report_path = REPO_ROOT / report_path
    _json_write(report_path, report)
    _json_print({"ok": True, "reportPath": _repo_relative(report_path), "generatedCount": report["generatedCount"], "dryRun": report["dryRun"]})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
