from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageFilter


USAGE_ID = "left_troop_rail_icon_poc_2026_06_01"
ICON_SIZE = 72
SCALE = 4

PAPER = (248, 244, 232, 244)
PAPER_EDGE = (194, 169, 119, 236)
PAPER_EDGE_DARK = (96, 76, 47, 230)
INK = (50, 45, 34, 244)
GOLD = (204, 159, 74, 255)
PALE_GOLD = (236, 212, 151, 230)
BRONZE = (138, 91, 42, 245)
GREEN = (66, 99, 72, 255)
GREEN_DARK = (35, 66, 48, 255)
IRON = (114, 113, 103, 255)
IRON_DARK = (55, 54, 50, 250)
RED = (158, 74, 50, 248)
MUTED = (127, 118, 92, 220)


IconPainter = Callable[[ImageDraw.ImageDraw], None]


ICON_SPECS: list[dict[str, str]] = [
    {"id": "squad_primary", "category": "squad_role", "label": "主力"},
    {"id": "squad_mobile", "category": "squad_role", "label": "机动"},
    {"id": "squad_reserve", "category": "squad_role", "label": "后备"},
    {"id": "squad_empty", "category": "squad_role", "label": "空位"},
    {"id": "troop_infantry", "category": "troop_type", "label": "步兵"},
    {"id": "troop_cavalry", "category": "troop_type", "label": "骑兵"},
    {"id": "troop_archer", "category": "troop_type", "label": "弓兵"},
    {"id": "troop_siege", "category": "troop_type", "label": "器械"},
    {"id": "status_idle", "category": "status", "label": "待命"},
    {"id": "status_marching", "category": "status", "label": "行军"},
    {"id": "status_garrison", "category": "status", "label": "驻守"},
    {"id": "status_recruiting", "category": "status", "label": "征兵"},
    {"id": "status_healing", "category": "status", "label": "整补"},
    {"id": "status_low_morale", "category": "status", "label": "士气低"},
    {"id": "status_returning", "category": "status", "label": "返回"},
    {"id": "status_locked", "category": "status", "label": "未开放"},
]


def s(value: float) -> int:
    return round(value * SCALE)


def box(coords: tuple[float, float, float, float]) -> tuple[int, int, int, int]:
    return (s(coords[0]), s(coords[1]), s(coords[2]), s(coords[3]))


def pts(points: list[tuple[float, float]]) -> list[tuple[int, int]]:
    return [(s(x), s(y)) for x, y in points]


def draw_line(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: tuple[int, int, int, int], width: float = 2.0) -> None:
    draw.line(pts(points), fill=fill, width=max(1, s(width)), joint="curve")


def draw_poly(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: tuple[int, int, int, int], outline: tuple[int, int, int, int] | None = None, width: float = 1.0) -> None:
    draw.polygon(pts(points), fill=fill)
    if outline is not None:
        draw.line(pts(points + [points[0]]), fill=outline, width=max(1, s(width)), joint="curve")


def draw_badge(draw: ImageDraw.ImageDraw) -> None:
    shadow = Image.new("RGBA", (ICON_SIZE * SCALE, ICON_SIZE * SCALE), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shape = [(11, 7), (61, 7), (66, 12), (66, 60), (60, 66), (12, 66), (6, 60), (6, 12)]
    shadow_draw.polygon(pts([(x + 1.5, y + 2.0) for x, y in shape]), fill=(36, 29, 19, 96))
    blurred = shadow.filter(ImageFilter.GaussianBlur(s(1.2)))
    draw.bitmap((0, 0), blurred, fill=None)
    draw_poly(draw, shape, PAPER, PAPER_EDGE_DARK, 1.1)
    draw.line(pts([(13, 10), (59, 10), (63, 14), (63, 58), (58, 63), (14, 63), (9, 58), (9, 14), (13, 10)]), fill=PAPER_EDGE, width=s(1.2), joint="curve")
    draw.line(pts([(17, 56), (30, 56), (33, 59), (39, 59), (42, 56), (55, 56)]), fill=(206, 176, 119, 138), width=s(1.0))
    draw.arc(box((18, 16, 54, 52)), 210, 330, fill=(205, 201, 185, 54), width=s(1.1))


def icon_squad_primary(draw: ImageDraw.ImageDraw) -> None:
    draw_poly(draw, [(29, 19), (45, 24), (45, 48), (29, 43)], GREEN, PAPER_EDGE_DARK, 1.4)
    draw_line(draw, [(27, 18), (27, 51)], INK, 2.2)
    draw_line(draw, [(25, 51), (44, 51)], BRONZE, 2.2)
    draw.ellipse(box((31, 27, 42, 38)), fill=GOLD, outline=PAPER_EDGE_DARK, width=s(1.1))
    draw_line(draw, [(33, 33), (40, 33)], PALE_GOLD, 1.1)


def icon_squad_mobile(draw: ImageDraw.ImageDraw) -> None:
    draw_line(draw, [(21, 45), (32, 30), (46, 28), (54, 36)], IRON_DARK, 3.0)
    draw_line(draw, [(23, 45), (33, 33), (45, 31), (52, 37)], GREEN, 2.0)
    draw_poly(draw, [(48, 27), (60, 34), (49, 39)], GOLD, PAPER_EDGE_DARK, 1.0)
    draw_line(draw, [(27, 49), (20, 56)], BRONZE, 1.8)
    draw_line(draw, [(42, 49), (50, 56)], BRONZE, 1.8)
    draw_line(draw, [(27, 31), (21, 24)], RED, 1.6)


def icon_squad_reserve(draw: ImageDraw.ImageDraw) -> None:
    for offset, color in [(0, GREEN), (7, BRONZE), (-7, IRON)]:
        draw.rounded_rectangle(box((25 + offset, 27, 47 + offset, 46)), radius=s(2.5), fill=color, outline=PAPER_EDGE_DARK, width=s(1.0))
        draw_line(draw, [(28 + offset, 32), (44 + offset, 32)], PALE_GOLD, 1.0)
    draw_line(draw, [(19, 51), (53, 51)], INK, 2.0)


def icon_squad_empty(draw: ImageDraw.ImageDraw) -> None:
    draw.ellipse(box((23, 21, 49, 47)), outline=MUTED, width=s(2.4))
    draw_line(draw, [(30, 34), (42, 34)], MUTED, 2.2)
    draw_line(draw, [(22, 53), (50, 53)], (206, 176, 119, 150), 1.2)


def icon_troop_infantry(draw: ImageDraw.ImageDraw) -> None:
    draw_poly(draw, [(36, 17), (51, 24), (48, 45), (36, 56), (24, 45), (21, 24)], IRON, PAPER_EDGE_DARK, 1.4)
    draw_poly(draw, [(36, 22), (45, 27), (43, 42), (36, 50), (29, 42), (27, 27)], GREEN, None)
    draw_line(draw, [(21, 54), (53, 22)], GOLD, 3.0)
    draw_line(draw, [(19, 56), (29, 53)], PAPER_EDGE_DARK, 2.0)


def icon_troop_cavalry(draw: ImageDraw.ImageDraw) -> None:
    draw_line(draw, [(20, 45), (28, 33), (41, 30), (53, 40)], IRON_DARK, 4.0)
    draw_line(draw, [(24, 43), (30, 35), (40, 34), (49, 41)], GREEN, 2.6)
    draw_poly(draw, [(42, 25), (50, 28), (47, 34)], BRONZE, PAPER_EDGE_DARK, 1.0)
    draw_line(draw, [(32, 47), (27, 56)], INK, 1.8)
    draw_line(draw, [(45, 48), (52, 56)], INK, 1.8)
    draw_line(draw, [(20, 25), (55, 25)], GOLD, 2.2)
    draw_poly(draw, [(55, 25), (49, 21), (49, 29)], GOLD, PAPER_EDGE_DARK, 0.8)


def icon_troop_archer(draw: ImageDraw.ImageDraw) -> None:
    draw.arc(box((19, 16, 53, 58)), 255, 105, fill=GREEN_DARK, width=s(4.0))
    draw_line(draw, [(36, 17), (36, 57)], MUTED, 1.3)
    draw_line(draw, [(20, 39), (54, 31)], GOLD, 2.2)
    draw_poly(draw, [(55, 31), (47, 27), (49, 36)], GOLD, PAPER_EDGE_DARK, 0.8)
    draw_line(draw, [(25, 40), (19, 45)], RED, 1.2)


def icon_troop_siege(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle(box((19, 31, 53, 45)), radius=s(2.5), fill=IRON, outline=PAPER_EDGE_DARK, width=s(1.2))
    draw_line(draw, [(25, 30), (43, 20)], BRONZE, 3.2)
    draw_line(draw, [(43, 20), (51, 28)], GOLD, 2.2)
    draw.ellipse(box((22, 43, 32, 53)), fill=GREEN, outline=PAPER_EDGE_DARK, width=s(1.0))
    draw.ellipse(box((42, 43, 52, 53)), fill=GREEN, outline=PAPER_EDGE_DARK, width=s(1.0))
    draw_line(draw, [(22, 38), (51, 38)], PALE_GOLD, 1.0)


def icon_status_idle(draw: ImageDraw.ImageDraw) -> None:
    draw_poly(draw, [(25, 28), (47, 28), (52, 43), (20, 43)], GREEN, PAPER_EDGE_DARK, 1.2)
    draw_line(draw, [(24, 28), (36, 18), (48, 28)], GOLD, 2.0)
    draw_line(draw, [(22, 51), (50, 51)], MUTED, 1.6)


def icon_status_marching(draw: ImageDraw.ImageDraw) -> None:
    draw_line(draw, [(18, 51), (49, 22)], GOLD, 3.0)
    draw_poly(draw, [(51, 20), (48, 32), (39, 23)], GOLD, PAPER_EDGE_DARK, 0.8)
    draw.ellipse(box((22, 34, 31, 43)), fill=GREEN, outline=PAPER_EDGE_DARK, width=s(0.8))
    draw.ellipse(box((34, 45, 43, 54)), fill=BRONZE, outline=PAPER_EDGE_DARK, width=s(0.8))


def icon_status_garrison(draw: ImageDraw.ImageDraw) -> None:
    draw_poly(draw, [(21, 48), (21, 29), (28, 29), (28, 24), (35, 24), (35, 29), (43, 29), (43, 24), (50, 24), (50, 48)], IRON, PAPER_EDGE_DARK, 1.3)
    draw.arc(box((29, 35, 43, 55)), 180, 360, fill=GREEN_DARK, width=s(4.0))
    draw_line(draw, [(17, 52), (55, 52)], GOLD, 1.8)


def icon_status_recruiting(draw: ImageDraw.ImageDraw) -> None:
    draw.arc(box((21, 22, 47, 52)), 190, 350, fill=IRON_DARK, width=s(4.0))
    draw.rounded_rectangle(box((24, 34, 44, 49)), radius=s(2), fill=IRON, outline=PAPER_EDGE_DARK, width=s(1.0))
    draw_line(draw, [(53, 25), (53, 45)], GREEN, 3.2)
    draw_line(draw, [(43, 35), (63, 35)], GREEN, 3.2)
    draw_line(draw, [(27, 40), (41, 40)], PALE_GOLD, 1.0)


def icon_status_healing(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle(box((22, 28, 50, 46)), radius=s(5), fill=(235, 220, 183, 245), outline=PAPER_EDGE_DARK, width=s(1.1))
    draw_line(draw, [(25, 43), (47, 31)], RED, 2.8)
    draw_line(draw, [(27, 30), (49, 42)], GOLD, 2.0)
    draw.ellipse(box((31, 18, 41, 28)), fill=GREEN, outline=PAPER_EDGE_DARK, width=s(0.8))


def icon_status_low_morale(draw: ImageDraw.ImageDraw) -> None:
    draw_line(draw, [(25, 19), (25, 53)], INK, 2.0)
    draw_poly(draw, [(27, 21), (50, 27), (44, 40), (27, 36)], RED, PAPER_EDGE_DARK, 1.0)
    draw_line(draw, [(36, 30), (40, 37)], PALE_GOLD, 2.0)
    draw.ellipse(box((39, 42, 44, 47)), fill=PALE_GOLD)


def icon_status_returning(draw: ImageDraw.ImageDraw) -> None:
    draw.arc(box((20, 21, 55, 56)), 25, 318, fill=GOLD, width=s(3.4))
    draw_poly(draw, [(23, 32), (17, 43), (31, 40)], GOLD, PAPER_EDGE_DARK, 0.8)
    draw_line(draw, [(34, 29), (46, 41)], GREEN_DARK, 2.2)
    draw_line(draw, [(46, 29), (34, 41)], GREEN_DARK, 2.2)


def icon_status_locked(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle(box((23, 34, 49, 54)), radius=s(3), fill=IRON, outline=PAPER_EDGE_DARK, width=s(1.2))
    draw.arc(box((27, 19, 45, 41)), 180, 360, fill=IRON_DARK, width=s(3.0))
    draw.ellipse(box((34, 42, 38, 47)), fill=GOLD)


PAINTERS: dict[str, IconPainter] = {
    "squad_primary": icon_squad_primary,
    "squad_mobile": icon_squad_mobile,
    "squad_reserve": icon_squad_reserve,
    "squad_empty": icon_squad_empty,
    "troop_infantry": icon_troop_infantry,
    "troop_cavalry": icon_troop_cavalry,
    "troop_archer": icon_troop_archer,
    "troop_siege": icon_troop_siege,
    "status_idle": icon_status_idle,
    "status_marching": icon_status_marching,
    "status_garrison": icon_status_garrison,
    "status_recruiting": icon_status_recruiting,
    "status_healing": icon_status_healing,
    "status_low_morale": icon_status_low_morale,
    "status_returning": icon_status_returning,
    "status_locked": icon_status_locked,
}


def build_icon(icon_id: str) -> Image.Image:
    canvas = Image.new("RGBA", (ICON_SIZE * SCALE, ICON_SIZE * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw_badge(draw)
    PAINTERS[icon_id](draw)
    return canvas.resize((ICON_SIZE, ICON_SIZE), Image.Resampling.LANCZOS)


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build_preview(icon_paths: list[Path], out_path: Path) -> None:
    cell = 96
    columns = 4
    rows = (len(icon_paths) + columns - 1) // columns
    preview = Image.new("RGBA", (columns * cell + 24, rows * cell + 24), (245, 242, 235, 255))
    for index, path in enumerate(icon_paths):
        icon = Image.open(path).convert("RGBA")
        row, col = divmod(index, columns)
        x = 12 + col * cell + (cell - ICON_SIZE) // 2
        y = 12 + row * cell + (cell - ICON_SIZE) // 2
        preview.alpha_composite(icon, (x, y))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    preview.save(out_path)


def write_manifest(asset_root: Path, icon_paths: list[Path], manifest_path: Path) -> None:
    entries = []
    by_id = {spec["id"]: spec for spec in ICON_SPECS}
    for path in icon_paths:
        icon_id = path.stem.removeprefix("left_troop_rail_icon_").removesuffix("_v1")
        spec = by_id[icon_id]
        entries.append({
            "id": icon_id,
            "label": spec["label"],
            "category": spec["category"],
            "name": path.name,
            "relativePath": path.relative_to(asset_root).as_posix(),
            "targetPath": path.as_posix(),
            "extension": path.suffix,
            "width": ICON_SIZE,
            "height": ICON_SIZE,
            "sha256": sha256_file(path),
            "usage": USAGE_ID,
            "componentRole": "left_troop_rail_icon",
            "textBaked": False,
            "visualNotes": "small parchment badge icon with transparent outer bounds; designed for 22-36px display in left troop rail",
        })
    manifest = {
        "usageId": USAGE_ID,
        "version": 1,
        "generatedAt": "2026-06-01",
        "assetRoot": asset_root.as_posix(),
        "outputSize": [ICON_SIZE, ICON_SIZE],
        "displaySizeRecommendation": [22, 36],
        "style": {
            "surface": "clean white parchment token",
            "linework": "bronze/gold outline with muted Han military motifs",
            "avoid": ["image-only button contract", "baked text", "manchu frog button motif", "old hud_v1 assets"],
        },
        "icons": entries,
    }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def verify(manifest_path: Path) -> None:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    icons = manifest.get("icons", [])
    expected_ids = [spec["id"] for spec in ICON_SPECS]
    actual_ids = [entry.get("id") for entry in icons]
    missing = [icon_id for icon_id in expected_ids if icon_id not in actual_ids]
    if missing:
        raise SystemExit(f"missing icons in manifest: {missing}")
    for entry in icons:
        path = Path(entry["targetPath"])
        if not path.exists():
            raise SystemExit(f"missing icon file: {path}")
        image = Image.open(path).convert("RGBA")
        if image.size != (ICON_SIZE, ICON_SIZE):
            raise SystemExit(f"unexpected size for {path}: {image.size}")
        if image.getchannel("A").getbbox() is None:
            raise SystemExit(f"empty alpha for {path}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset-root", default=Path("godot-client/assets/themes/slgclient/current/ui/left_troop_rail"), type=Path)
    parser.add_argument("--preview-dir", default=Path("tmp/ui_left_troop_rail_icons_20260601"), type=Path)
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()

    manifest_path = args.asset_root / "left_troop_rail_icon_manifest_v1.json"
    if args.verify_only:
        verify(manifest_path)
        print(f"[{USAGE_ID}] verified {manifest_path}")
        return 0

    icon_dir = args.asset_root / "icons"
    icon_dir.mkdir(parents=True, exist_ok=True)
    icon_paths: list[Path] = []
    for spec in ICON_SPECS:
        icon = build_icon(spec["id"])
        out_path = icon_dir / f"left_troop_rail_icon_{spec['id']}_v1.png"
        icon.save(out_path)
        icon_paths.append(out_path)

    write_manifest(args.asset_root, icon_paths, manifest_path)
    verify(manifest_path)
    preview_path = args.preview_dir / "left_troop_rail_icon_preview_v1.png"
    build_preview(icon_paths, preview_path)
    print(f"[{USAGE_ID}] icons={len(icon_paths)}")
    print(f"[{USAGE_ID}] manifest={manifest_path}")
    print(f"[{USAGE_ID}] preview={preview_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
