#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops


REPO_ROOT = Path(__file__).resolve().parents[2]
RESOURCE_DIR = REPO_ROOT / "godot-client" / "assets" / "themes" / "slgclient" / "current" / "world" / "resources"
RESOURCE_MANIFEST = RESOURCE_DIR / "world_resource_assets_manifest_v1.json"
WORLD_CELL_ASSET_MANIFEST = (
    REPO_ROOT
    / "godot-client"
    / "assets"
    / "themes"
    / "slgclient"
    / "current"
    / "world"
    / "world_cell_assets_manifest_v1.json"
)
MAP_GRID = REPO_ROOT / "godot-client" / "scripts" / "map" / "map_grid.gd"

EXPECTED_RESOURCES = ("grain", "wood", "stone", "iron", "copper")
EXPECTED_LEVELS = ("base", "l01", "l02", "l03", "l04", "l05", "l06", "l07", "l08", "l09")
EXPECTED_CANVAS = (384, 384)
EXPECTED_FOOTPRINT = [320, 160]
EXPECTED_ANCHOR = [192, 310]
RED_FRINGE_LIMIT = 0


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def image_equal(left: Path, right: Path) -> bool:
    with Image.open(left).convert("RGBA") as a, Image.open(right).convert("RGBA") as b:
        return ImageChops.difference(a, b).getbbox() is None


def validate_png(path: Path) -> list[str]:
    errors: list[str] = []
    if not path.exists():
        return [f"missing png: {path.relative_to(REPO_ROOT).as_posix()}"]
    with Image.open(path) as image:
        if image.mode != "RGBA":
            errors.append(f"{path.name} mode={image.mode}, expected RGBA")
        if image.size != EXPECTED_CANVAS:
            errors.append(f"{path.name} size={image.size}, expected {EXPECTED_CANVAS}")
        alpha_bbox = image.convert("RGBA").getchannel("A").getbbox()
        if alpha_bbox is None:
            errors.append(f"{path.name} has empty alpha")
        red_fringe_count = count_red_fringe_pixels(image.convert("RGBA"))
        if red_fringe_count > RED_FRINGE_LIMIT:
            errors.append(f"{path.name} red_fringe_pixels={red_fringe_count}, expected {RED_FRINGE_LIMIT}")
    return errors


def count_red_fringe_pixels(image: Image.Image) -> int:
    count = 0
    pixel_data = image.get_flattened_data() if hasattr(image, "get_flattened_data") else image.getdata()
    for r, g, b, a in pixel_data:
        if a == 0 or a == 255:
            continue
        if r >= 180 and g <= 90 and b <= 90 and (r - max(g, b)) >= 90:
            count += 1
    return count


def validate_resource_manifest() -> list[str]:
    errors: list[str] = []
    if not RESOURCE_MANIFEST.exists():
        return [f"missing manifest: {RESOURCE_MANIFEST.relative_to(REPO_ROOT).as_posix()}"]

    manifest = read_json(RESOURCE_MANIFEST)
    if manifest.get("schema") != "world_resource_assets_manifest_v1":
        errors.append(f"schema={manifest.get('schema')!r}")
    if manifest.get("source_canvas") != list(EXPECTED_CANVAS):
        errors.append(f"source_canvas={manifest.get('source_canvas')!r}")
    if manifest.get("effective_footprint") != EXPECTED_FOOTPRINT:
        errors.append(f"effective_footprint={manifest.get('effective_footprint')!r}")
    if manifest.get("fit_footprint") != EXPECTED_FOOTPRINT:
        errors.append(f"fit_footprint={manifest.get('fit_footprint')!r}")
    projection = manifest.get("projection", {})
    if not isinstance(projection, dict) or projection.get("anchor_pixel") != EXPECTED_ANCHOR:
        errors.append(f"projection.anchor_pixel={projection.get('anchor_pixel') if isinstance(projection, dict) else None!r}")

    art_source = manifest.get("art_source", {})
    if not isinstance(art_source, dict) or art_source.get("source") != "resource_cell_art_restart_2026_05_26_user_visual_accepted":
        errors.append("art_source.source missing accepted resource-cell handoff marker")

    resources = manifest.get("resources", {})
    if not isinstance(resources, dict):
        return errors + ["resources is not an object"]
    resource_keys = tuple(resources.keys())
    if resource_keys != EXPECTED_RESOURCES:
        errors.append(f"resources keys={resource_keys!r}, expected={EXPECTED_RESOURCES!r}")

    for resource in EXPECTED_RESOURCES:
        entries = resources.get(resource, {})
        if not isinstance(entries, dict):
            errors.append(f"resources.{resource} is not an object")
            continue
        level_keys = tuple(entries.keys())
        if level_keys != EXPECTED_LEVELS:
            errors.append(f"resources.{resource} levels={level_keys!r}, expected={EXPECTED_LEVELS!r}")
            continue
        for level_key in EXPECTED_LEVELS:
            filename = entries[level_key]
            expected_name = f"world_resource_{resource}_{level_key}_v1.png"
            if filename != expected_name:
                errors.append(f"{resource}.{level_key} filename={filename!r}, expected={expected_name!r}")
            errors.extend(validate_png(RESOURCE_DIR / expected_name))
        if not image_equal(RESOURCE_DIR / f"world_resource_{resource}_base_v1.png", RESOURCE_DIR / f"world_resource_{resource}_l05_v1.png"):
            errors.append(f"{resource} base frame differs from l05")
    return errors


def validate_world_cell_registry() -> list[str]:
    errors: list[str] = []
    manifest = read_json(WORLD_CELL_ASSET_MANIFEST)
    package = manifest.get("strategic_node_package", {})
    resource_policy = package.get("resource_policy", {}) if isinstance(package, dict) else {}
    kinds = resource_policy.get("resource_kinds", {}) if isinstance(resource_policy, dict) else {}
    if tuple(kinds) != EXPECTED_RESOURCES:
        errors.append(f"world_cell resource_kinds={kinds!r}, expected={list(EXPECTED_RESOURCES)!r}")
    return errors


def validate_map_grid_mapping() -> list[str]:
    text = MAP_GRID.read_text(encoding="utf-8")
    required = 'return "world_resource_copper_l%02d_v1.png" % world_resource_level_index'
    if '"copper"' not in text or required not in text:
        return ["map_grid.gd does not map resourceKind=copper to world_resource_copper_lXX_v1.png"]
    return []


def main() -> int:
    errors: list[str] = []
    errors.extend(validate_resource_manifest())
    errors.extend(validate_world_cell_registry())
    errors.extend(validate_map_grid_mapping())
    payload = {
        "ok": not errors,
        "resourceManifest": str(RESOURCE_MANIFEST),
        "resources": list(EXPECTED_RESOURCES),
        "levelsPerResource": len(EXPECTED_LEVELS),
        "errors": errors,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
