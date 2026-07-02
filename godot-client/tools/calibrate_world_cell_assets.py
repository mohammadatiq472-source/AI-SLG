from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
WORLD_DIR = ROOT / "godot-client" / "assets" / "themes" / "slgclient" / "current" / "world"
MANIFEST = WORLD_DIR / "world_cell_assets_manifest_v1.json"
FOUNDATION_FRAMES = {
    "main_city_foundation_base_v1.png",
    "city_wall_ring_profile_v1.png",
}


def clamp_channel(value: float) -> int:
    return max(0, min(255, int(round(value))))


def calibrate_pixel(r: int, g: int, b: int, a: int, *, foundation: bool) -> tuple[int, int, int, int]:
    if a <= 0:
        return r, g, b, a
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if foundation:
        gain = 1.22
        lift = 24
        alpha = a
        if lum < 38:
            alpha = int(a * 0.38)
            lift = 42
        elif lum < 72:
            alpha = int(a * 0.62)
            lift = 34
        return (
            clamp_channel(r * gain + lift),
            clamp_channel(g * gain + lift),
            clamp_channel(b * gain + lift),
            max(0, min(255, alpha)),
        )

    gain = 1.14
    lift = 14
    if lum < 36:
        gain = 1.18
        lift = 30
    elif lum < 76:
        lift = 22
    return (
        clamp_channel(r * gain + lift),
        clamp_channel(g * gain + lift),
        clamp_channel(b * gain + lift),
        a,
    )


def calibrate_png(path: Path, *, foundation: bool) -> None:
    with Image.open(path).convert("RGBA") as image:
        pixels = [
            calibrate_pixel(r, g, b, a, foundation=foundation)
            for r, g, b, a in image.getdata()
        ]
        image.putdata(pixels)
        image.save(path)


def main() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    frame_names = sorted((data.get("frames") or {}).keys())
    calibrated: list[str] = []
    for frame_name in frame_names:
        if not frame_name.endswith(".png"):
            continue
        path = WORLD_DIR / frame_name
        if not path.exists():
            continue
        calibrate_png(path, foundation=frame_name in FOUNDATION_FRAMES)
        calibrated.append(frame_name)
    print(json.dumps({"calibratedCount": len(calibrated), "calibrated": calibrated}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
