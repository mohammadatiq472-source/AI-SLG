#!/usr/bin/env python3
"""Rebuild the formal cavalry map unit frames from the source atlas.

This is a delivery tool for the qibing_frames asset chain. It intentionally
uses the formal atlas/plist input and writes the formal frame directories,
instead of hiding baseline problems with UI offsets.
"""

from __future__ import annotations

import argparse
import json
import os
import plistlib
import re
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from statistics import median
from typing import Any

from PIL import Image, ImageDraw


DIRECTIONS = ["r", "ru", "u", "lu", "l", "ld", "d", "rd"]
CANVAS_SIZE = (160, 120)
FRAME_COUNT = 10
FRAME_RE = re.compile(r"\{\{(\d+),(\d+)\},\{(\d+),(\d+)\}\}")
POINT_RE = re.compile(r"\{(\d+),(\d+)\}")
ATLAS_NAMES_BY_DIRECTION = {
    "r": "map_qibing_0_{sequence}.png",
    "ru": "map_qibing_315_{sequence}.png",
    "u": "qibing_270_{sequence}.png",
    "lu": "map_qibing_225_{sequence}.png",
    "l": "map_qibing_180_{sequence}.png",
    "ld": "map_qibing_135_{sequence}.png",
    "d": "map_qibing_90_{sequence}.png",
    "rd": "map_qibing_45_{sequence}.png",
}


@dataclass(frozen=True)
class SourceFrame:
    atlas_name: str
    direction: str
    sequence: int
    output_name: str
    atlas_x: int
    atlas_y: int
    atlas_w: int
    atlas_h: int
    rotated: bool
    source_x: int
    source_y: int
    source_w: int
    source_h: int


def godot_root() -> Path:
    return Path(__file__).resolve().parents[1]


def parse_rect(value: str) -> tuple[int, int, int, int]:
    match = FRAME_RE.fullmatch(value)
    if not match:
        raise ValueError(f"Unsupported plist rect: {value}")
    return tuple(int(part) for part in match.groups())  # type: ignore[return-value]


def parse_point(value: str) -> tuple[int, int]:
    match = POINT_RE.fullmatch(value)
    if not match:
        raise ValueError(f"Unsupported plist point: {value}")
    return int(match.group(1)), int(match.group(2))


def load_source_frames(plist_path: Path) -> list[SourceFrame]:
    data = plistlib.loads(plist_path.read_bytes())
    frames = data["frames"]
    result: list[SourceFrame] = []
    for direction in DIRECTIONS:
        for sequence in range(FRAME_COUNT):
            atlas_name = ATLAS_NAMES_BY_DIRECTION[direction].format(sequence=sequence)
            if atlas_name not in frames:
                raise KeyError(f"Missing plist frame: {atlas_name}")
            item = frames[atlas_name]
            atlas_x, atlas_y, atlas_w, atlas_h = parse_rect(item["frame"])
            source_x, source_y, source_w, source_h = parse_rect(item["sourceColorRect"])
            result.append(
                SourceFrame(
                    atlas_name=atlas_name,
                    direction=direction,
                    sequence=sequence,
                    output_name=f"{direction}_{sequence:02d}_{atlas_name}",
                    atlas_x=atlas_x,
                    atlas_y=atlas_y,
                    atlas_w=atlas_w,
                    atlas_h=atlas_h,
                    rotated=bool(item["rotated"]),
                    source_x=source_x,
                    source_y=source_y,
                    source_w=source_w,
                    source_h=source_h,
                )
            )
    return result


def crop_source_sprite(atlas: Image.Image, frame: SourceFrame) -> Image.Image:
    if frame.rotated:
        crop_box = (
            frame.atlas_x,
            frame.atlas_y,
            frame.atlas_x + frame.atlas_h,
            frame.atlas_y + frame.atlas_w,
        )
        return atlas.crop(crop_box).rotate(90, expand=True)
    crop_box = (
        frame.atlas_x,
        frame.atlas_y,
        frame.atlas_x + frame.atlas_w,
        frame.atlas_y + frame.atlas_h,
    )
    return atlas.crop(crop_box)


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    alpha = image.getchannel("A")
    return alpha.getbbox()


def paste_into_source_canvas(atlas: Image.Image, frame: SourceFrame) -> Image.Image:
    sprite = crop_source_sprite(atlas, frame).convert("RGBA")
    if sprite.size != (frame.source_w, frame.source_h):
        raise ValueError(
            f"{frame.atlas_name} restored size {sprite.size} != plist source "
            f"{(frame.source_w, frame.source_h)}"
        )
    canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(sprite, (frame.source_x, frame.source_y))
    return canvas


def normalize_direction(frames: list[tuple[SourceFrame, Image.Image]]) -> dict[str, Image.Image]:
    metrics = []
    for source_frame, image in frames:
        bbox = alpha_bbox(image)
        if bbox is None:
            raise ValueError(f"Empty alpha frame: {source_frame.output_name}")
        x0, y0, x1, y1 = bbox
        metrics.append(
            {
                "frame": source_frame,
                "image": image,
                "bbox": bbox,
                "bottom": y1,
                "center_x": (x0 + x1) / 2,
            }
        )

    target_bottom = max(item["bottom"] for item in metrics)
    target_center_x = int(round(median(item["center_x"] for item in metrics)))
    rebuilt: dict[str, Image.Image] = {}

    for item in metrics:
        source_frame = item["frame"]
        image = item["image"]
        x0, y0, x1, y1 = item["bbox"]
        cropped = image.crop((x0, y0, x1, y1))
        width, height = cropped.size
        left = target_center_x - width // 2
        top = target_bottom - height
        left = max(0, min(CANVAS_SIZE[0] - width, left))
        top = max(0, min(CANVAS_SIZE[1] - height, top))
        canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
        canvas.alpha_composite(cropped, (left, top))
        rebuilt[source_frame.output_name] = canvas

    return rebuilt


def build_frames(atlas_path: Path, plist_path: Path) -> tuple[list[SourceFrame], dict[str, Image.Image]]:
    atlas = Image.open(atlas_path).convert("RGBA")
    source_frames = load_source_frames(plist_path)
    restored_by_direction: dict[str, list[tuple[SourceFrame, Image.Image]]] = {
        direction: [] for direction in DIRECTIONS
    }
    for source_frame in source_frames:
        restored_by_direction[source_frame.direction].append(
            (source_frame, paste_into_source_canvas(atlas, source_frame))
        )

    rebuilt: dict[str, Image.Image] = {}
    for direction in DIRECTIONS:
        rebuilt.update(normalize_direction(restored_by_direction[direction]))
    return source_frames, rebuilt


def write_frames(images: dict[str, Image.Image], directories: list[Path]) -> list[Path]:
    written: list[Path] = []
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
        for output_name, image in images.items():
            path = directory / output_name
            image.save(path)
            written.append(path)
            import_path = path.with_suffix(path.suffix + ".import")
            if import_path.exists():
                stamp = path.stat().st_mtime + 1
                os.utime(import_path, (stamp, stamp))
    return written


def frame_manifest_entries(
    source_frames: list[SourceFrame],
    texture_root: str,
) -> dict[str, list[dict[str, Any]]]:
    directions: dict[str, list[dict[str, Any]]] = {direction: [] for direction in DIRECTIONS}
    for frame in source_frames:
        directions[frame.direction].append(
            {
                "name": frame.atlas_name,
                "direction": frame.direction,
                "sequence": frame.sequence,
                "sourceFrame": {
                    "x": frame.atlas_x,
                    "y": frame.atlas_y,
                    "w": frame.atlas_w,
                    "h": frame.atlas_h,
                    "rotated": frame.rotated,
                },
                "texturePath": f"{texture_root}/{frame.output_name}",
                "size": {"w": CANVAS_SIZE[0], "h": CANVAS_SIZE[1]},
            }
        )
    return directions


def update_manifest(path: Path, source_frames: list[SourceFrame], texture_root: str) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    directions = frame_manifest_entries(source_frames, texture_root)
    data["importedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    data["framesRoot"] = texture_root
    data["directions"] = directions
    if "visualTypes" in data and "cavalry" in data["visualTypes"]:
        cavalry = data["visualTypes"]["cavalry"]
        cavalry["assetStatus"] = "plist_rebuilt_qibing_frames_v2_baseline_stable_2026_06_03"
        cavalry["directions"] = directions
        note = (
            "2026-06-03: cavalry qibing_frames rebuilt from formal map_qibing "
            "atlas/plist; 8 directions x 10 frames, 160x120 canvas, per-direction "
            "baseline and center stabilized."
        )
        asset_notes = data.setdefault("assetNotes", [])
        if not isinstance(asset_notes, list):
            asset_notes = [str(asset_notes)]
            data["assetNotes"] = asset_notes
        if note not in asset_notes:
            asset_notes.append(note)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sync_replacement_manifest_from_current(current_path: Path, replacement_path: Path) -> None:
    current_data = json.loads(current_path.read_text(encoding="utf-8"))
    replacement_path.write_text(json.dumps(current_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def frame_stats(images: dict[str, Image.Image]) -> dict[str, Any]:
    per_direction: dict[str, Any] = {}
    for direction in DIRECTIONS:
        rows = []
        for sequence in range(FRAME_COUNT):
            atlas_name = ATLAS_NAMES_BY_DIRECTION[direction].format(sequence=sequence)
            output_name = f"{direction}_{sequence:02d}_{atlas_name}"
            image = images[output_name]
            bbox = alpha_bbox(image)
            if bbox is None:
                raise ValueError(f"Empty alpha frame after rebuild: {output_name}")
            x0, y0, x1, y1 = bbox
            rows.append(
                {
                    "file": output_name,
                    "bbox": {"x0": x0, "y0": y0, "x1": x1, "y1": y1},
                    "bottomBaseline": y1,
                    "centerX": round((x0 + x1) / 2, 2),
                    "alphaWidth": x1 - x0,
                    "alphaHeight": y1 - y0,
                }
            )
        bottoms = [row["bottomBaseline"] for row in rows]
        centers = [row["centerX"] for row in rows]
        per_direction[direction] = {
            "frames": rows,
            "bottomBaselineMin": min(bottoms),
            "bottomBaselineMax": max(bottoms),
            "bottomBaselineRange": max(bottoms) - min(bottoms),
            "centerXMin": min(centers),
            "centerXMax": max(centers),
            "centerXRange": round(max(centers) - min(centers), 2),
        }
    return {
        "canvas": {"w": CANVAS_SIZE[0], "h": CANVAS_SIZE[1]},
        "directions": per_direction,
    }


def write_contact_sheet(images: dict[str, Image.Image], output_path: Path) -> None:
    cell_w, cell_h = CANVAS_SIZE
    label_h = 18
    sheet = Image.new(
        "RGBA",
        (cell_w * FRAME_COUNT, (cell_h + label_h) * len(DIRECTIONS)),
        (32, 32, 32, 255),
    )
    draw = ImageDraw.Draw(sheet)
    for row, direction in enumerate(DIRECTIONS):
        y = row * (cell_h + label_h)
        draw.text((4, y + 2), direction, fill=(255, 230, 170, 255))
        for sequence in range(FRAME_COUNT):
            atlas_name = ATLAS_NAMES_BY_DIRECTION[direction].format(sequence=sequence)
            output_name = f"{direction}_{sequence:02d}_{atlas_name}"
            x = sequence * cell_w
            draw.rectangle((x, y + label_h, x + cell_w - 1, y + label_h + cell_h - 1), outline=(70, 70, 70, 255))
            draw.line((x, y + label_h + cell_h - 1, x + cell_w - 1, y + label_h + cell_h - 1), fill=(110, 80, 60, 255))
            sheet.alpha_composite(images[output_name], (x, y + label_h))
            draw.text((x + 4, y + 2), f"{direction}_{sequence:02d}", fill=(220, 220, 220, 255))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(output_path)


def write_stats_markdown(stats: dict[str, Any], output_path: Path) -> None:
    lines = [
        "# qibing_frames 80 Frame Baseline Stats",
        "",
        "| direction | baseline min | baseline max | range | centerX min | centerX max | center range |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for direction in DIRECTIONS:
        item = stats["directions"][direction]
        lines.append(
            f"| {direction} | {item['bottomBaselineMin']} | {item['bottomBaselineMax']} | "
            f"{item['bottomBaselineRange']} | {item['centerXMin']} | {item['centerXMax']} | "
            f"{item['centerXRange']} |"
        )
    lines.append("")
    lines.append("All frames are regenerated from the formal map_qibing atlas/plist and saved as 160x120 transparent PNG.")
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--evidence-dir",
        default="tmp/screenshots/qibing_full_regen_asset_audit",
        help="Directory for contact sheet and baseline statistics.",
    )
    args = parser.parse_args()

    root = godot_root()
    current_world = root / "assets/themes/slgclient/current/world"
    current_frames = root / "assets/themes/slgclient/current/units/qibing_frames"
    replacement_frames = root / "assets/themes/slgclient/replacements/exchange_bundle/units/qibing_frames"
    current_manifest = root / "assets/themes/slgclient/manifests/unit_frames_manifest.json"
    replacement_manifest = root / "assets/themes/slgclient/replacements/exchange_bundle/manifests/unit_frames_manifest.json"
    evidence_dir = (Path.cwd() / args.evidence_dir).resolve()

    source_frames, rebuilt_images = build_frames(
        current_world / "map_qibing.png",
        current_world / "map_qibing.plist",
    )
    written = write_frames(rebuilt_images, [current_frames, replacement_frames])

    texture_root = "res://assets/themes/slgclient/current/units/qibing_frames"
    update_manifest(current_manifest, source_frames, texture_root)
    sync_replacement_manifest_from_current(current_manifest, replacement_manifest)

    stats = frame_stats(rebuilt_images)
    evidence_dir.mkdir(parents=True, exist_ok=True)
    contact_sheet = evidence_dir / "qibing_80_frame_contact_sheet.png"
    stats_json = evidence_dir / "qibing_80_frame_baseline_stats.json"
    stats_md = evidence_dir / "qibing_80_frame_baseline_stats.md"
    write_contact_sheet(rebuilt_images, contact_sheet)
    stats_json.write_text(json.dumps(stats, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_stats_markdown(stats, stats_md)

    print(
        json.dumps(
            {
                "writtenPngCount": len(written),
                "formalFrameCount": len(rebuilt_images),
                "contactSheet": str(contact_sheet),
                "statsJson": str(stats_json),
                "statsMarkdown": str(stats_md),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
