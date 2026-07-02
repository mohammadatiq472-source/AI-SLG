from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


USAGE_ID = "left_troop_rail_card_skin_v1_2026_06_03"
OUTPUT_SIZE = (408, 152)
SCALE = 3
SLICE_MARGIN = 32
CARD_DIR = Path("godot-client/assets/themes/slgclient/current/ui/left_troop_rail/cards")
MANIFEST_PATH = Path("godot-client/assets/themes/slgclient/current/ui/left_troop_rail/left_troop_rail_card_skin_manifest_v1.json")

PAPER = (245, 238, 213, 236)
PAPER_LIT = (255, 249, 226, 245)
PAPER_DARK = (188, 158, 101, 220)
INK = (54, 43, 30, 226)
GOLD = (214, 168, 74, 238)
GREEN = (65, 104, 74, 230)
RED = (142, 74, 52, 220)
DISABLED = (161, 151, 128, 168)


CARD_SPECS = [
    {
        "id": "normal",
        "name": "left_troop_rail_card_normal_v1.png",
        "accent": GREEN,
        "paper": PAPER,
        "edge": PAPER_DARK,
        "alpha": 1.0,
    },
    {
        "id": "marching",
        "name": "left_troop_rail_card_marching_v1.png",
        "accent": GOLD,
        "paper": (250, 238, 202, 242),
        "edge": (205, 144, 61, 230),
        "alpha": 1.0,
    },
    {
        "id": "selected",
        "name": "left_troop_rail_card_selected_v1.png",
        "accent": (238, 190, 82, 250),
        "paper": PAPER_LIT,
        "edge": (229, 174, 70, 246),
        "alpha": 1.0,
    },
    {
        "id": "disabled",
        "name": "left_troop_rail_card_disabled_v1.png",
        "accent": DISABLED,
        "paper": (210, 204, 186, 152),
        "edge": (126, 112, 86, 150),
        "alpha": 0.82,
    },
]


def s(value: float) -> int:
    return round(value * SCALE)


def box(coords: tuple[float, float, float, float]) -> tuple[int, int, int, int]:
    return (s(coords[0]), s(coords[1]), s(coords[2]), s(coords[3]))


def rgba(color: tuple[int, int, int, int], alpha_scale: float = 1.0) -> tuple[int, int, int, int]:
    return (color[0], color[1], color[2], max(0, min(255, round(color[3] * alpha_scale))))


def draw_line(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: tuple[int, int, int, int], width: float) -> None:
    draw.line([(s(x), s(y)) for x, y in points], fill=fill, width=max(1, s(width)), joint="curve")


def draw_paper_grain(card: Image.Image, mask: Image.Image, alpha_scale: float) -> None:
    grain = Image.new("RGBA", card.size, (0, 0, 0, 0))
    pixels = grain.load()
    width, height = card.size
    for y in range(0, height, 3):
        for x in range(0, width, 3):
            seed = (x * 73856093) ^ (y * 19349663)
            if seed % 11 == 0:
                pixels[x, y] = rgba((116, 87, 42, 18), alpha_scale)
            elif seed % 13 == 0:
                pixels[x, y] = rgba((255, 250, 224, 18), alpha_scale)
    card.alpha_composite(Image.composite(grain, Image.new("RGBA", card.size, (0, 0, 0, 0)), mask))


def draw_card(spec: dict[str, object]) -> Image.Image:
    width, height = OUTPUT_SIZE
    canvas = Image.new("RGBA", (width * SCALE, height * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    alpha_scale = float(spec["alpha"])
    paper = rgba(spec["paper"], alpha_scale)  # type: ignore[arg-type]
    edge = rgba(spec["edge"], alpha_scale)  # type: ignore[arg-type]
    accent = rgba(spec["accent"], alpha_scale)  # type: ignore[arg-type]

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(box((8, 10, width - 6, height - 4)), radius=s(10), fill=(24, 18, 10, 72))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(s(3.0))))

    body_mask = Image.new("L", canvas.size, 0)
    mask_draw = ImageDraw.Draw(body_mask)
    mask_draw.rounded_rectangle(box((5, 5, width - 7, height - 9)), radius=s(9), fill=255)
    draw.rounded_rectangle(box((5, 5, width - 7, height - 9)), radius=s(9), fill=paper, outline=edge, width=s(2.2))
    draw.rounded_rectangle(box((12, 12, width - 14, height - 16)), radius=s(5), outline=rgba((255, 249, 220, 108), alpha_scale), width=s(1.0))

    draw_paper_grain(canvas, body_mask, alpha_scale)
    draw = ImageDraw.Draw(canvas)

    # Left portrait well, sized so runtime portrait can sit cleanly on top.
    draw.rounded_rectangle(box((24, 23, 119, 129)), radius=s(7), fill=rgba((84, 63, 39, 62), alpha_scale), outline=rgba((91, 68, 39, 180), alpha_scale), width=s(1.6))
    draw.rounded_rectangle(box((29, 28, 114, 124)), radius=s(5), outline=rgba((255, 244, 207, 106), alpha_scale), width=s(1.0))
    draw.rectangle(box((121, 27, 124, 125)), fill=rgba((93, 66, 35, 80), alpha_scale))

    # Top command ribbon and right folded-corner cue.
    draw.polygon(
        [(s(width - 98), s(14)), (s(width - 31), s(14)), (s(width - 18), s(27)), (s(width - 31), s(40)), (s(width - 98), s(40)), (s(width - 88), s(27))],
        fill=rgba(accent, 0.76),
    )
    draw.line(
        [(s(width - 94), s(40)), (s(width - 30), s(40)), (s(width - 18), s(28))],
        fill=rgba((62, 41, 24, 128), alpha_scale),
        width=s(1.0),
    )

    # Text lane separators are decorative only; labels remain real Godot text.
    draw.rounded_rectangle(box((142, 34, width - 46, 60)), radius=s(4), fill=rgba((117, 83, 41, 32), alpha_scale))
    draw.rounded_rectangle(box((142, 73, width - 32, 92)), radius=s(4), fill=rgba((255, 248, 221, 44), alpha_scale))
    draw.rounded_rectangle(box((142, 108, width - 38, 120)), radius=s(4), fill=rgba((81, 68, 43, 48), alpha_scale))

    # Bottom strength-track trough and military paper accents.
    draw.rounded_rectangle(box((142, 122, width - 34, 132)), radius=s(4), fill=rgba((76, 55, 33, 72), alpha_scale))
    draw.rounded_rectangle(box((145, 124, width - 110, 130)), radius=s(3), fill=rgba(accent, 0.52))
    draw_line(draw, [(36, height - 16), (94, height - 16), (108, height - 24)], rgba((206, 174, 103, 132), alpha_scale), 1.4)
    draw_line(draw, [(width - 116, height - 18), (width - 44, height - 18)], rgba((206, 174, 103, 120), alpha_scale), 1.2)
    draw_line(draw, [(width - 30, 51), (width - 30, height - 31)], rgba((101, 75, 42, 86), alpha_scale), 1.0)

    resized = canvas.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
    return resized


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    CARD_DIR.mkdir(parents=True, exist_ok=True)
    cards = []
    for spec in CARD_SPECS:
        image = draw_card(spec)
        output_path = CARD_DIR / str(spec["name"])
        image.save(output_path)
        cards.append(
            {
                "id": spec["id"],
                "name": spec["name"],
                "relativePath": f"cards/{spec['name']}",
                "targetPath": str(output_path).replace("\\", "/"),
                "extension": ".png",
                "width": OUTPUT_SIZE[0],
                "height": OUTPUT_SIZE[1],
                "sha256": sha256_file(output_path),
                "usage": USAGE_ID,
                "componentRole": "left_troop_rail_card_skin",
                "textBaked": False,
                "sliceMargin": SLICE_MARGIN,
                "visualNotes": "dedicated parchment slot-card skin for StyleBoxTexture nine-slice use; labels and values remain real Godot UI text",
            }
        )

    manifest = {
        "usageId": USAGE_ID,
        "version": 1,
        "generatedAt": "2026-06-03",
        "assetRoot": "godot-client/assets/themes/slgclient/current/ui/left_troop_rail",
        "outputSize": list(OUTPUT_SIZE),
        "displaySizeRecommendation": [204, 76],
        "sliceMargin": SLICE_MARGIN,
        "style": {
            "surface": "dedicated parchment slot card with portrait well and decorative metric lanes",
            "runtimePolicy": "use as StyleBoxTexture nine-slice; no baked labels, no extra controls",
        },
        "cards": cards,
    }
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "manifest": str(MANIFEST_PATH), "cards": len(cards)}, ensure_ascii=True))


if __name__ == "__main__":
    main()
