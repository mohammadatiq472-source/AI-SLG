#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


REPO_ROOT = Path(__file__).resolve().parents[2]
TMP_ROOT = REPO_ROOT / "tmp" / "resource_cell_art_restart_2026_05_26"
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

SOURCE_SIZE = (256, 160)
RUNTIME_CANVAS = (384, 384)
RUNTIME_ART_SIZE = (320, 200)
RUNTIME_ART_OFFSET = (32, 130)
RUNTIME_ANCHOR = [192, 310]
RUNTIME_FOOTPRINT = [320, 160]

ACCEPTED_SERIES = {
    "grain": {
        "review_dir": "grain_lv01_lv09_grid_review_attempt02_05_05",
        "manifest": "manifest_grain_lv01_lv09_grid_review.json",
    },
    "wood": {
        "review_dir": "wood_lv01_lv09_grid_review_attempt06_06_09_late_han_low_wide",
        "manifest": "manifest_wood_lv01_lv09_grid_review.json",
    },
    "stone": {
        "review_dir": "stone_lv01_lv09_grid_review_attempt08_redgap_managed",
        "manifest": "manifest_stone_lv01_lv09_grid_review.json",
    },
    "iron": {
        "review_dir": "iron_lv01_lv09_grid_review_attempt09_11_11_redgap_high",
        "manifest": "manifest_iron_lv01_lv09_grid_review.json",
    },
    "copper": {
        "review_dir": "copper_lv01_lv09_grid_review_attempt14_13_13_no_stumps",
        "manifest": "manifest_copper_lv01_lv09_grid_review.json",
    },
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def save_png_atomic(image: Image.Image, output_path: Path) -> None:
    temp_path = output_path.with_name(f"{output_path.name}.tmp")
    image.save(temp_path, format="PNG")
    temp_path.replace(output_path)


def rel(path: Path) -> str:
    return path.resolve().relative_to(REPO_ROOT.resolve()).as_posix()


def source_to_runtime_canvas(source_path: Path) -> Image.Image:
    with Image.open(source_path) as image:
        source = image.convert("RGBA")
    if source.size != SOURCE_SIZE:
        raise ValueError(f"unexpected source size for {source_path}: {source.size}")
    scaled = remove_red_fringe(resize_rgba_premultiplied(source, RUNTIME_ART_SIZE))
    canvas = Image.new("RGBA", RUNTIME_CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(scaled, RUNTIME_ART_OFFSET)
    return canvas


def resize_rgba_premultiplied(source: Image.Image, size: tuple[int, int]) -> Image.Image:
    rgba = source.convert("RGBA")
    arr = np.asarray(rgba).astype(np.float32)
    alpha = arr[..., 3:4] / 255.0
    premultiplied = arr[..., :3] * alpha

    premul_img = Image.fromarray(np.clip(premultiplied, 0, 255).astype(np.uint8), "RGB")
    resized_rgb = np.asarray(premul_img.resize(size, Image.Resampling.LANCZOS)).astype(np.float32)
    resized_alpha = np.asarray(rgba.getchannel("A").resize(size, Image.Resampling.LANCZOS)).astype(np.float32)

    alpha_unit = resized_alpha[..., None] / 255.0
    out_rgb = np.zeros_like(resized_rgb)
    np.divide(resized_rgb, alpha_unit, out=out_rgb, where=alpha_unit > 0.001)
    out = np.dstack([np.clip(out_rgb, 0, 255), resized_alpha])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def remove_red_fringe(image: Image.Image) -> Image.Image:
    arr = np.array(image.convert("RGBA"))
    r = arr[..., 0].astype(np.int16)
    g = arr[..., 1].astype(np.int16)
    b = arr[..., 2].astype(np.int16)
    a = arr[..., 3].astype(np.int16)
    red_fringe = (
        (a > 0)
        & (a < 255)
        & (r >= 170)
        & (g <= 105)
        & (b <= 105)
        & ((r - np.maximum(g, b)) >= 80)
    )
    arr[red_fringe] = (0, 0, 0, 0)
    return Image.fromarray(arr, "RGBA")


def import_resource_images() -> dict[str, dict[str, str]]:
    RESOURCE_DIR.mkdir(parents=True, exist_ok=True)
    runtime_resources: dict[str, dict[str, str]] = {}
    for resource, config in ACCEPTED_SERIES.items():
        manifest_path = TMP_ROOT / config["review_dir"] / config["manifest"]
        candidate_manifest = read_json(manifest_path)
        levels = candidate_manifest.get("levels", {})
        if not isinstance(levels, dict):
            raise ValueError(f"levels missing in {manifest_path}")

        entries: dict[str, str] = {}
        for level in range(1, 10):
            level_key = f"lv{level:02d}"
            runtime_key = f"l{level:02d}"
            level_entry = levels.get(level_key, {})
            if not isinstance(level_entry, dict):
                raise ValueError(f"{level_key} missing in {manifest_path}")
            source_entry = level_entry.get("source", {})
            if not isinstance(source_entry, dict):
                raise ValueError(f"{level_key}.source missing in {manifest_path}")
            source_path = REPO_ROOT / str(source_entry.get("path", ""))
            if not source_path.exists():
                raise FileNotFoundError(source_path)
            output_name = f"world_resource_{resource}_{runtime_key}_v1.png"
            output_path = RESOURCE_DIR / output_name
            save_png_atomic(source_to_runtime_canvas(source_path), output_path)
            entries[runtime_key] = output_name

        base_name = f"world_resource_{resource}_base_v1.png"
        save_png_atomic(source_to_runtime_canvas(REPO_ROOT / levels["lv05"]["source"]["path"]), RESOURCE_DIR / base_name)
        runtime_resources[resource] = {"base": base_name, **entries}
    return runtime_resources


def build_art_source() -> dict[str, Any]:
    accepted: dict[str, Any] = {}
    for resource, config in ACCEPTED_SERIES.items():
        manifest_path = TMP_ROOT / config["review_dir"] / config["manifest"]
        candidate_manifest = read_json(manifest_path)
        levels = candidate_manifest.get("levels", {})
        accepted[resource] = {
            "review_dir": rel(TMP_ROOT / config["review_dir"]),
            "manifest": rel(manifest_path),
            "review_status": "user_visual_accepted_tmp_candidate_not_imagegen_redo",
            "levels": {
                f"l{level:02d}": {
                    "source": levels[f"lv{level:02d}"]["source"]["path"],
                    "normal": levels[f"lv{level:02d}"]["normal"]["path"],
                }
                for level in range(1, 10)
            },
        }
    return {
        "source": "resource_cell_art_restart_2026_05_26_user_visual_accepted",
        "runtime_status": "accepted_runtime_candidate_pending_godot_mixed_review",
        "imported_on": "2026-05-27",
        "conversion": {
            "diagnostic_source_size": list(SOURCE_SIZE),
            "runtime_canvas": list(RUNTIME_CANVAS),
            "scaled_art_size": list(RUNTIME_ART_SIZE),
            "scaled_art_offset": list(RUNTIME_ART_OFFSET),
            "anchor_pixel": RUNTIME_ANCHOR,
            "source_floor_center_after_conversion": [192, 230],
            "source_south_tip_after_conversion": RUNTIME_ANCHOR,
        },
        "accepted_candidates": accepted,
    }


def update_resource_manifest(runtime_resources: dict[str, dict[str, str]]) -> None:
    payload = {
        "schema": "world_resource_assets_manifest_v1",
        "source_canvas": list(RUNTIME_CANVAS),
        "effective_footprint": RUNTIME_FOOTPRINT,
        "fit_footprint": RUNTIME_FOOTPRINT,
        "projection": {
            "type": "isometric_2_to_1",
            "tile_width_reference": 60,
            "tile_height_reference": 30,
            "anchor_rule": "bottom_center",
            "anchor_pixel": RUNTIME_ANCHOR,
        },
        "level_policy": {
            "min": 1,
            "max": 9,
            "base_level": 5,
            "strategy": "accepted_imagegen_series_import_from_diagnostic_resource_cell_art",
        },
        "art_source": build_art_source(),
        "resources": runtime_resources,
    }
    write_json(RESOURCE_MANIFEST, payload)


def update_world_cell_asset_manifest() -> None:
    manifest = read_json(WORLD_CELL_ASSET_MANIFEST)
    package = manifest.setdefault("strategic_node_package", {})
    resource_policy = package.setdefault("resource_policy", {})
    resource_policy["resource_kinds"] = list(ACCEPTED_SERIES.keys())
    write_json(WORLD_CELL_ASSET_MANIFEST, manifest)


def main() -> int:
    runtime_resources = import_resource_images()
    update_resource_manifest(runtime_resources)
    update_world_cell_asset_manifest()
    payload = {
        "ok": True,
        "resourceManifest": rel(RESOURCE_MANIFEST),
        "worldCellAssetManifest": rel(WORLD_CELL_ASSET_MANIFEST),
        "resources": list(runtime_resources.keys()),
        "generatedPngCount": sum(len(entries) for entries in runtime_resources.values()),
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
