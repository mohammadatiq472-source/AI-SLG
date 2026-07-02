#!/usr/bin/env python3
"""Build a reversible cavalry map-unit frame sample from the current cavalry baseline.

Formal entrypoint:
  scripts\\run_python.cmd godot-client\\tools\\build_cavalry_polished_sample_frames.py

This is a sample replacement step for the main-world moving cavalry body. It
writes a new asset root instead of overwriting qibing_frames, then updates the
current and replacement unit manifests to point cavalry at the sample root.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


DIRECTIONS = ["r", "ru", "u", "lu", "l", "ld", "d", "rd"]
FRAME_COUNT = 10
CANVAS_SIZE = (160, 120)
SAMPLE_STATUS = "cavalry_polished_sample_frames_v1"
SAMPLE_ROOT_RES = "res://assets/themes/slgclient/current/units/cavalry_polished_sample_frames_v1"
SAMPLE_ROOT_REL = Path("assets/themes/slgclient/current/units/cavalry_polished_sample_frames_v1")


def godot_root() -> Path:
    return Path(__file__).resolve().parents[1]


def repo_root() -> Path:
    return godot_root().parent


def workspace_path_from_res(res_path: str) -> Path:
    if not res_path.startswith("res://"):
        raise ValueError(f"expected Godot res path, got {res_path!r}")
    return godot_root() / res_path[len("res://") :]


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("empty source frame alpha")
    return bbox


def polish_frame(source: Image.Image, direction: str, sequence: int) -> Image.Image:
    source = source.convert("RGBA")
    bbox = alpha_bbox(source)
    x0, y0, x1, y1 = bbox
    cropped = source.crop(bbox)

    scale = 1.08
    new_size = (
        max(1, min(CANVAS_SIZE[0], int(round(cropped.width * scale)))),
        max(1, min(CANVAS_SIZE[1], int(round(cropped.height * scale)))),
    )
    enlarged = cropped.resize(new_size, Image.Resampling.LANCZOS)

    center_x = int(round((x0 + x1) / 2))
    bottom_y = y1
    left = max(0, min(CANVAS_SIZE[0] - enlarged.width, center_x - enlarged.width // 2))
    top = max(0, min(CANVAS_SIZE[1] - enlarged.height, bottom_y - enlarged.height))

    body = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    body.alpha_composite(enlarged, (left, top))

    alpha = body.getchannel("A")
    dilated = alpha.filter(ImageFilter.MaxFilter(5))
    outline_mask = ImageChops.subtract(dilated, alpha)
    outline = Image.new("RGBA", CANVAS_SIZE, (18, 13, 9, 190))
    outlined = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    outlined.alpha_composite(Image.composite(outline, Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0)), outline_mask))
    outlined.alpha_composite(body)

    rgb = outlined.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(1.22)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.28)
    rgb = ImageEnhance.Brightness(rgb).enhance(1.08)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.0, percent=155, threshold=2))
    polished = Image.merge("RGBA", (*rgb.split(), outlined.getchannel("A")))

    inner_edge = alpha.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(0.55))
    highlight = Image.new("RGBA", CANVAS_SIZE, (225, 187, 108, 58))
    polished.alpha_composite(Image.composite(highlight, Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0)), inner_edge))

    draw = ImageDraw.Draw(polished, "RGBA")
    final_bbox = alpha_bbox(polished)
    fx0, fy0, fx1, fy1 = final_bbox
    pulse = sequence % 4
    if direction in {"r", "ru", "rd"}:
        banner_x = fx0 + max(5, (fx1 - fx0) // 4)
    elif direction in {"l", "lu", "ld"}:
        banner_x = fx1 - max(9, (fx1 - fx0) // 4)
    else:
        banner_x = (fx0 + fx1) // 2
    banner_y = fy0 + 2 + (1 if pulse in {1, 2} else 0)
    draw.rectangle((banner_x, banner_y, banner_x + 2, banner_y + 12), fill=(61, 40, 18, 170))
    draw.polygon(
        [
            (banner_x + 3, banner_y + 1),
            (banner_x + 13, banner_y + 4 + (pulse % 2)),
            (banner_x + 3, banner_y + 8),
        ],
        fill=(132, 23, 15, 190),
    )
    draw.line((fx0 + 2, fy1 - 4, fx1 - 2, fy1 - 5), fill=(0, 0, 0, 42), width=2)

    return polished


def output_name(direction: str, sequence: int) -> str:
    return f"{direction}_{sequence:02d}_cavalry_polished_sample_v1.png"


def build_frames(manifest: dict[str, Any], out_root: Path) -> dict[str, list[dict[str, Any]]]:
    cavalry = manifest.get("visualTypes", {}).get("cavalry")
    if not isinstance(cavalry, dict):
        raise ValueError("unit_frames_manifest visualTypes.cavalry missing")
    out_root.mkdir(parents=True, exist_ok=True)

    new_directions: dict[str, list[dict[str, Any]]] = {}
    for direction in DIRECTIONS:
        frames = cavalry.get("directions", {}).get(direction)
        if not isinstance(frames, list) or len(frames) != FRAME_COUNT:
            raise ValueError(f"expected {FRAME_COUNT} cavalry frames for {direction}")
        new_frames: list[dict[str, Any]] = []
        for sequence, frame in enumerate(frames):
            source_path = workspace_path_from_res(str(frame.get("texturePath", "")))
            polished = polish_frame(Image.open(source_path), direction, sequence)
            name = output_name(direction, sequence)
            target_path = out_root / name
            polished.save(target_path)
            new_frame = dict(frame)
            new_frame["name"] = name
            new_frame["sequence"] = sequence
            new_frame["direction"] = direction
            new_frame["assetStatus"] = SAMPLE_STATUS
            new_frame["texturePath"] = f"{SAMPLE_ROOT_RES}/{name}"
            new_frame["size"] = {"w": CANVAS_SIZE[0], "h": CANVAS_SIZE[1]}
            new_frame["sourceAssetStatus"] = str(frame.get("assetStatus", ""))
            new_frame["sampleDerivation"] = "polished_from_current_cavalry_baseline_with_generated_troops_style_reference"
            new_frames.append(new_frame)
        new_directions[direction] = new_frames
    return new_directions


def update_manifest(path: Path, new_directions: dict[str, list[dict[str, Any]]]) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    data["framesRoot"] = SAMPLE_ROOT_RES
    data["directions"] = new_directions
    visual_types = data.setdefault("visualTypes", {})
    cavalry = visual_types.setdefault("cavalry", {})
    cavalry["framesRoot"] = SAMPLE_ROOT_RES
    cavalry["assetStatus"] = SAMPLE_STATUS
    cavalry["directions"] = new_directions
    cavalry["sampleSource"] = "generated_troops/cavalry_unit_fg style reference + current 80-frame motion baseline"
    notes = data.setdefault("assetNotes", [])
    if not isinstance(notes, list):
        notes = [str(notes)]
        data["assetNotes"] = notes
    note = "2026-06-06: cavalry visualType redirected to cavalry_polished_sample_frames_v1 as a reversible moving-body art sample."
    if note not in notes:
        notes.append(note)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def make_contact_sheet(out_root: Path, evidence_path: Path) -> None:
    cell_w, cell_h = CANVAS_SIZE
    sheet = Image.new("RGBA", (cell_w * FRAME_COUNT, cell_h * len(DIRECTIONS)), (32, 28, 20, 255))
    for row, direction in enumerate(DIRECTIONS):
        for sequence in range(FRAME_COUNT):
            frame = Image.open(out_root / output_name(direction, sequence)).convert("RGBA")
            sheet.alpha_composite(frame, (sequence * cell_w, row * cell_h))
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(evidence_path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-dir", default="tmp/screenshots/map_unit_visual/cavalry_polished_sample_frames_v1")
    args = parser.parse_args()

    root = godot_root()
    manifest_paths = [
        root / "assets/themes/slgclient/manifests/unit_frames_manifest.json",
        root / "assets/themes/slgclient/replacements/exchange_bundle/manifests/unit_frames_manifest.json",
    ]
    current_manifest = json.loads(manifest_paths[0].read_text(encoding="utf-8"))
    out_root = root / SAMPLE_ROOT_REL
    new_directions = build_frames(current_manifest, out_root)
    for manifest_path in manifest_paths:
        update_manifest(manifest_path, new_directions)

    evidence_dir = repo_root() / args.evidence_dir
    make_contact_sheet(out_root, evidence_dir / "cavalry_polished_sample_80_frame_contact_sheet.png")
    report = {
        "ok": True,
        "assetStatus": SAMPLE_STATUS,
        "framesRoot": SAMPLE_ROOT_RES,
        "frameCount": len(DIRECTIONS) * FRAME_COUNT,
        "directions": DIRECTIONS,
        "contactSheet": str((evidence_dir / "cavalry_polished_sample_80_frame_contact_sheet.png").resolve()),
    }
    report_path = evidence_dir / "cavalry_polished_sample_frame_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
