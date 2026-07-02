#!/usr/bin/env python3
r"""
Generate W13 naval warship moving-body PNG frame batches from imagegen sheets.

Formal entrypoint:
  scripts\run_python.cmd godot-client\tools\generate_sea_overseas_naval_warship_frame_assets.py

The source sheets live in:
  godot-client/assets/themes/slgclient/current/units/naval/source_sheets/

Each source sheet is expected to contain 8 rows x 1 column in direction order:
  r / rd / d / ld / l / lu / u / ru

This tool removes model-rendered checkerboard or magenta backgrounds, slices the
8 directional poses, normalizes each pose into transparent 128x128 frames, and
adds subtle 10-frame bob / sail-highlight / water-shadow variation. It does not
connect naval frames to runtime UnitMarker and does not edit the land manifest.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw


REPO_ROOT = Path(__file__).resolve().parents[2]
NAVAL_ROOT = REPO_ROOT / "godot-client" / "assets" / "themes" / "slgclient" / "current" / "units" / "naval"
SOURCE_ROOT = NAVAL_ROOT / "source_sheets"
REPORT_PATH = REPO_ROOT / "tmp" / "gates" / "sea_overseas_naval_frame_assets" / "generate_w13_naval_assets_report.json"

DIRECTIONS = ["r", "rd", "d", "ld", "l", "lu", "u", "ru"]
FRAME_SIZE = 128
FRAMES_PER_DIRECTION = 10
PADDING = 10


@dataclass(frozen=True)
class ShipSpec:
    slot_id: str
    directory: str
    source_sheet: str
    sheet_name: str
    max_sprite_ratio: float


SPECS = [
    ShipSpec(
        slot_id="naval_light_patrol_warship_v1",
        directory="light_patrol_warship_frames",
        source_sheet="naval_light_patrol_warship_v1_builtin_source_sheet.png",
        sheet_name="naval_light_patrol_warship_v1_sheet.png",
        max_sprite_ratio=0.62,
    ),
    ShipSpec(
        slot_id="naval_interceptor_warship_v1",
        directory="interceptor_warship_frames",
        source_sheet="naval_interceptor_warship_v1_builtin_source_sheet.png",
        sheet_name="naval_interceptor_warship_v1_sheet.png",
        max_sprite_ratio=0.78,
    ),
    ShipSpec(
        slot_id="naval_transport_warship_v1",
        directory="transport_warship_frames",
        source_sheet="naval_transport_warship_v1_builtin_source_sheet.png",
        sheet_name="naval_transport_warship_v1_sheet.png",
        max_sprite_ratio=1.00,
    ),
]


def _repo_relative(path: Path) -> str:
    return path.resolve().relative_to(REPO_ROOT).as_posix()


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _is_background_pixel(r: int, g: int, b: int, a: int) -> bool:
    if a < 12:
        return True
    if r > 238 and b > 238 and g < 24:
        return True
    if min(r, g, b) >= 226 and max(r, g, b) - min(r, g, b) <= 22:
        return True
    return False


def _remove_sheet_background(image: Image.Image) -> Image.Image:
    source = image.convert("RGBA")
    pixels = source.load()
    width, height = source.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if _is_background_pixel(r, g, b, a):
                pixels[x, y] = (r, g, b, 0)
            else:
                pixels[x, y] = (r, g, b, 255)
    return source


def _alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("source row produced an empty transparent sprite")
    return bbox


def _keep_largest_alpha_component(image: Image.Image) -> Image.Image:
    rgba = image.copy()
    alpha = rgba.getchannel("A")
    width, height = rgba.size
    alpha_pixels = alpha.load()
    visited = bytearray(width * height)
    components: list[list[tuple[int, int]]] = []

    for y in range(height):
        for x in range(width):
            index = y * width + x
            if visited[index] or alpha_pixels[x, y] < 24:
                continue
            stack = [(x, y)]
            visited[index] = 1
            component: list[tuple[int, int]] = []
            while stack:
                cx, cy = stack.pop()
                component.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    n_index = ny * width + nx
                    if visited[n_index] or alpha_pixels[nx, ny] < 24:
                        continue
                    visited[n_index] = 1
                    stack.append((nx, ny))
            components.append(component)

    if not components:
        return rgba

    keep = set(max(components, key=len))
    pixels = rgba.load()
    for y in range(height):
        for x in range(width):
            if (x, y) not in keep:
                r, g, b, _a = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)
    return rgba


def _normalize_sprite(row_image: Image.Image, max_sprite_ratio: float) -> Image.Image:
    row_image = _keep_largest_alpha_component(row_image)
    bbox = _alpha_bbox(row_image)
    sprite = row_image.crop(bbox)
    max_content = int((FRAME_SIZE - PADDING * 2) * max_sprite_ratio)
    scale = min(max_content / sprite.width, max_content / sprite.height)
    target_size = (max(1, int(sprite.width * scale)), max(1, int(sprite.height * scale)))
    sprite = sprite.resize(target_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    x = (FRAME_SIZE - sprite.width) // 2
    y = (FRAME_SIZE - sprite.height) // 2
    canvas.alpha_composite(sprite, (x, y))
    return canvas


def _slice_direction_sprites(source_sheet: Path, max_sprite_ratio: float) -> dict[str, Image.Image]:
    source = _remove_sheet_background(Image.open(source_sheet))
    width, height = source.size
    row_height = height / len(DIRECTIONS)
    sprites: dict[str, Image.Image] = {}
    for row, direction in enumerate(DIRECTIONS):
        top = int(round(row * row_height))
        bottom = int(round((row + 1) * row_height))
        row_image = source.crop((0, top, width, bottom))
        sprites[direction] = _normalize_sprite(row_image, max_sprite_ratio)
    return sprites


def _alpha_bbox_or_none(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.getchannel("A").getbbox()


def _tint_with_alpha_mask(
    size: tuple[int, int],
    alpha_mask: Image.Image,
    color: tuple[int, int, int],
    opacity: int,
    crop_box: tuple[int, int, int, int] | None = None,
) -> Image.Image:
    layer = Image.new("RGBA", size, (color[0], color[1], color[2], 0))
    alpha = alpha_mask.copy()
    if crop_box is not None:
        crop_mask = Image.new("L", size, 0)
        draw = ImageDraw.Draw(crop_mask)
        draw.rectangle(crop_box, fill=255)
        alpha = Image.composite(alpha, Image.new("L", size, 0), crop_mask)
    alpha = alpha.point(lambda value: min(opacity, int(value * opacity / 255)))
    layer.putalpha(alpha)
    return layer


def _make_frame_variant(sprite: Image.Image, frame_index: int) -> Image.Image:
    phase = (frame_index / FRAMES_PER_DIRECTION) * math.tau
    bob_y = int(round(math.sin(phase) * 2.0))
    sway_x = int(round(math.cos(phase) * 0.7))

    moved = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    moved.alpha_composite(sprite, (sway_x, bob_y))
    bbox = _alpha_bbox_or_none(moved)
    if bbox is None:
        return moved

    left, top, right, bottom = bbox
    body_width = right - left
    body_height = bottom - top
    frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))

    shadow = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow, "RGBA")
    shadow_width = max(12, int(body_width * (0.88 + 0.04 * math.cos(phase))))
    shadow_height = max(5, int(body_height * 0.20))
    shadow_cx = (left + right) // 2
    shadow_cy = min(FRAME_SIZE - 4, bottom - max(2, int(body_height * 0.10)))
    shadow_alpha = 20 + int(5 * math.sin(phase + math.pi / 2))
    shadow_draw.ellipse(
        (
            shadow_cx - shadow_width // 2,
            shadow_cy - shadow_height // 2,
            shadow_cx + shadow_width // 2,
            shadow_cy + shadow_height // 2,
        ),
        fill=(54, 83, 88, shadow_alpha),
    )
    frame.alpha_composite(shadow)
    frame.alpha_composite(moved)

    highlight_opacity = 18 + int(14 * max(0.0, math.sin(phase)))
    highlight_box = (
        max(0, left + int(body_width * 0.18)),
        max(0, top + int(body_height * 0.05)),
        min(FRAME_SIZE, left + int(body_width * 0.72)),
        min(FRAME_SIZE, top + int(body_height * 0.56)),
    )
    highlight = _tint_with_alpha_mask(
        (FRAME_SIZE, FRAME_SIZE),
        moved.getchannel("A"),
        (255, 236, 184),
        highlight_opacity,
        highlight_box,
    )
    frame.alpha_composite(highlight)
    return frame


def _write_ship_assets(spec: ShipSpec) -> dict[str, Any]:
    source_path = SOURCE_ROOT / spec.source_sheet
    if not source_path.exists():
        raise FileNotFoundError(f"missing imagegen source sheet: {source_path}")

    frame_root = NAVAL_ROOT / spec.directory
    frame_root.mkdir(parents=True, exist_ok=True)
    for stale_frame in frame_root.glob("*.png"):
        stale_frame.unlink()
    for stale_import in frame_root.glob("*.png.import"):
        stale_import.unlink()

    sprites = _slice_direction_sprites(source_path, spec.max_sprite_ratio)
    sheet = Image.new("RGBA", (FRAME_SIZE * FRAMES_PER_DIRECTION, FRAME_SIZE * len(DIRECTIONS)), (0, 0, 0, 0))
    written: list[str] = []
    for row, direction in enumerate(DIRECTIONS):
        sprite = sprites[direction]
        for frame_index in range(FRAMES_PER_DIRECTION):
            frame_image = _make_frame_variant(sprite, frame_index)
            frame_name = f"{direction}_{frame_index:02d}_{spec.slot_id}.png"
            frame_path = frame_root / frame_name
            frame_image.save(frame_path)
            sheet.alpha_composite(frame_image, (frame_index * FRAME_SIZE, row * FRAME_SIZE))
            written.append(_repo_relative(frame_path))

    sheet_path = NAVAL_ROOT / spec.sheet_name
    if sheet_path.exists():
        sheet_path.unlink()
    stale_sheet_import = Path(str(sheet_path) + ".import")
    if stale_sheet_import.exists():
        stale_sheet_import.unlink()
    sheet.save(sheet_path)

    source_alpha = Image.open(source_path).convert("RGBA").getchannel("A")
    alpha_min, _alpha_max = source_alpha.getextrema()
    return {
        "slotId": spec.slot_id,
        "sourceSheet": _repo_relative(source_path),
        "sourceHadRealAlpha": alpha_min < 10,
        "frameRoot": _repo_relative(frame_root),
        "frameCount": len(written),
        "sheetPath": _repo_relative(sheet_path),
        "sample": written[:4],
    }


def main() -> int:
    NAVAL_ROOT.mkdir(parents=True, exist_ok=True)
    results = [_write_ship_assets(spec) for spec in SPECS]
    report = {
        "schemaVersion": "sea_overseas_naval_warship_imagegen_sheet_refit_v1",
        "ok": True,
        "sourceMode": "built_in_imagegen_source_sheet_local_background_removal",
        "frameSizePx": {"width": FRAME_SIZE, "height": FRAME_SIZE},
        "directions": DIRECTIONS,
        "framesPerDirection": FRAMES_PER_DIRECTION,
        "countsBySlot": {result["slotId"]: result["frameCount"] for result in results},
        "results": results,
        "notes": [
            "Built-in imagegen did not return true alpha for the first source; local neutral checkerboard/magenta removal is applied.",
            "Frames add subtle bob, sail highlight, and low-alpha water shadow; this is asset production only, not naval runtime movement.",
        ],
    }
    _write_json(REPORT_PATH, report)
    print(json.dumps({"ok": True, "reportPath": _repo_relative(REPORT_PATH), "countsBySlot": report["countsBySlot"]}, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
