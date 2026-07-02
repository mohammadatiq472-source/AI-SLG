from __future__ import annotations

import argparse
import math
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageChops, ImageDraw, ImageFilter


SOURCE_ICON_ACTION_ORDER = [
    "ai_hub",
    "chat",
    "battle_report",
    "generals",
    "recruit",
    "settings",
    "skill_library",
    "interior",
    "alliance",
]
UTILITY_ACTION_ORDER = ["mail", "activity", "help"]
ACTION_ORDER = SOURCE_ICON_ACTION_ORDER + ["ai_switch"] + UTILITY_ACTION_ORDER

BACKGROUND_NAMES = [
    "mountains",
    "clouds",
    "dragon",
    "waves",
    "city_wall",
    "tech",
    "bamboo",
    "compass",
    "blank",
]

BACKGROUND_FOR_ACTION = {
    "ai_hub": "tech",
    "ai_switch": "tech",
    "chat": "clouds",
    "battle_report": "waves",
    "generals": "dragon",
    "recruit": "city_wall",
    "settings": "compass",
    "skill_library": "mountains",
    "interior": "bamboo",
    "alliance": "blank",
    "mail": "clouds",
    "activity": "dragon",
    "help": "compass",
}

OUTPUT_SIZE = (920, 860)
ICON_MAX_BOX = (455, 350)
ICON_CENTER_Y = 292
MOTIF_BOX = (118, 96, 802, 558)
MASTER_BACKGROUND_INDEX = 8
USAGE_ID = "mainline_command_button_scroll_component_pipeline_poc_2026_06_01"


def alpha_bbox(image: Image.Image, threshold: int = 16) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > threshold else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError("image has no visible alpha content")
    return bbox


def crop_visible(image: Image.Image, padding: int = 0, threshold: int = 16) -> Image.Image:
    left, top, right, bottom = alpha_bbox(image, threshold)
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom))


def remove_small_alpha_components(image: Image.Image, threshold: int = 16, min_pixels: int = 180, keep_ratio: float = 0.018) -> Image.Image:
    alpha = image.getchannel("A")
    width, height = image.size
    visible = bytearray(1 if alpha.getpixel((x, y)) > threshold else 0 for y in range(height) for x in range(width))
    visited = bytearray(width * height)
    components: list[list[int]] = []

    for start in range(width * height):
        if not visible[start] or visited[start]:
            continue
        stack = [start]
        visited[start] = 1
        component: list[int] = []
        while stack:
            current = stack.pop()
            component.append(current)
            x = current % width
            y = current // width
            neighbors = []
            if x > 0:
                neighbors.append(current - 1)
            if x + 1 < width:
                neighbors.append(current + 1)
            if y > 0:
                neighbors.append(current - width)
            if y + 1 < height:
                neighbors.append(current + width)
            for neighbor in neighbors:
                if visible[neighbor] and not visited[neighbor]:
                    visited[neighbor] = 1
                    stack.append(neighbor)
        components.append(component)

    if not components:
        return image
    largest = max(len(component) for component in components)
    keep_threshold = max(min_pixels, round(largest * keep_ratio))
    keep = bytearray(width * height)
    for component in components:
        if len(component) >= keep_threshold:
            for index in component:
                keep[index] = 255

    mask = Image.frombytes("L", image.size, bytes(keep)).filter(ImageFilter.MaxFilter(3))
    cleaned = image.copy()
    cleaned.putalpha(ImageChops.multiply(cleaned.getchannel("A"), mask))
    return crop_visible(cleaned, padding=8, threshold=threshold)


def split_grid(image: Image.Image, columns: int, rows: int) -> list[Image.Image]:
    cells: list[Image.Image] = []
    for row in range(rows):
        for column in range(columns):
            left = round(column * image.width / columns)
            right = round((column + 1) * image.width / columns)
            top = round(row * image.height / rows)
            bottom = round((row + 1) * image.height / rows)
            cells.append(image.crop((left, top, right, bottom)))
    return cells


def resize_exact(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return image.resize(size, Image.Resampling.LANCZOS)


def resize_inside(image: Image.Image, max_size: tuple[int, int]) -> Image.Image:
    scale = min(max_size[0] / image.width, max_size[1] / image.height)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(size, Image.Resampling.LANCZOS)


def paste_center(base: Image.Image, overlay: Image.Image, center: tuple[int, int]) -> None:
    left = round(center[0] - overlay.width / 2)
    top = round(center[1] - overlay.height / 2)
    base.alpha_composite(overlay, (left, top))


def arc_points(center: tuple[int, int], radius: tuple[int, int], start_deg: float, end_deg: float, steps: int = 48) -> list[tuple[float, float]]:
    cx, cy = center
    rx, ry = radius
    return [
        (
            cx + math.cos(math.radians(start_deg + (end_deg - start_deg) * index / steps)) * rx,
            cy + math.sin(math.radians(start_deg + (end_deg - start_deg) * index / steps)) * ry,
        )
        for index in range(steps + 1)
    ]


def add_arrowhead(draw: ImageDraw.ImageDraw, tip: tuple[float, float], tangent_deg: float, fill: tuple[int, int, int, int], outline: tuple[int, int, int, int]) -> None:
    tip_x, tip_y = tip
    back_deg = math.radians(tangent_deg + 180.0)
    side_deg = math.radians(tangent_deg + 90.0)
    back_x = tip_x + math.cos(back_deg) * 30
    back_y = tip_y + math.sin(back_deg) * 30
    side_x = math.cos(side_deg) * 15
    side_y = math.sin(side_deg) * 15
    points = [
        (tip_x, tip_y),
        (back_x + side_x, back_y + side_y),
        (back_x - side_x, back_y - side_y),
    ]
    draw.polygon(points, fill=outline)
    inner_points = [
        (tip_x, tip_y),
        (back_x + side_x * 0.68, back_y + side_y * 0.68),
        (back_x - side_x * 0.68, back_y - side_y * 0.68),
    ]
    draw.polygon(inner_points, fill=fill)


def build_ai_switch_icon(ai_hub_icon: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", ICON_MAX_BOX, (0, 0, 0, 0))
    base_icon = resize_inside(ai_hub_icon, (310, 268))
    paste_center(canvas, base_icon, (ICON_MAX_BOX[0] // 2, 178))
    draw = ImageDraw.Draw(canvas)
    center = (ICON_MAX_BOX[0] // 2, 176)
    radius = (188, 138)
    dark = (58, 43, 28, 230)
    bronze = (147, 110, 62, 240)
    gold = (214, 176, 101, 255)
    pale = (244, 226, 172, 210)
    top_arc = arc_points(center, radius, 206, 334)
    bottom_arc = arc_points(center, radius, 26, 154)
    for points in [top_arc, bottom_arc]:
        draw.line(points, fill=dark, width=19, joint="curve")
        draw.line(points, fill=bronze, width=13, joint="curve")
        draw.line(points, fill=gold, width=8, joint="curve")
        draw.line(points, fill=pale, width=3, joint="curve")
    add_arrowhead(draw, top_arc[-1], 334 + 90, gold, dark)
    add_arrowhead(draw, bottom_arc[-1], 154 + 90, gold, dark)
    return crop_visible(canvas, padding=10)


def draw_soft_highlight(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    left, top, right, bottom = box
    draw.arc((left, top, right, bottom), 208, 332, fill=(244, 226, 172, 190), width=5)
    draw.arc((left + 8, top + 8, right - 8, bottom - 8), 210, 328, fill=(255, 248, 219, 130), width=2)


def build_mail_icon() -> Image.Image:
    canvas = Image.new("RGBA", ICON_MAX_BOX, (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    dark = (58, 43, 28, 238)
    bronze = (139, 98, 52, 246)
    gold = (214, 176, 101, 255)
    paper = (242, 226, 184, 255)
    seal = (150, 47, 35, 245)
    box = (76, 78, 379, 252)
    draw.rounded_rectangle(box, radius=26, fill=paper, outline=dark, width=13)
    draw.rounded_rectangle((box[0] + 10, box[1] + 10, box[2] - 10, box[3] - 10), radius=20, outline=gold, width=5)
    draw.line([(92, 94), (228, 182), (363, 94)], fill=bronze, width=12)
    draw.line([(92, 238), (190, 168)], fill=bronze, width=8)
    draw.line([(363, 238), (266, 168)], fill=bronze, width=8)
    draw.ellipse((204, 150, 256, 202), fill=seal, outline=dark, width=7)
    draw.line([(216, 176), (244, 176)], fill=(244, 209, 132, 220), width=5)
    draw_soft_highlight(draw, box)
    return crop_visible(canvas, padding=18)


def build_activity_icon() -> Image.Image:
    canvas = Image.new("RGBA", ICON_MAX_BOX, (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    dark = (58, 43, 28, 238)
    bronze = (139, 98, 52, 246)
    gold = (214, 176, 101, 255)
    green = (69, 105, 78, 248)
    red = (153, 54, 39, 230)
    center = (228, 174)
    for radius, fill, width in [(142, dark, 0), (130, gold, 0), (116, bronze, 0), (98, green, 0)]:
        draw.ellipse((center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius), fill=fill)
    draw.ellipse((center[0] - 84, center[1] - 84, center[0] + 84, center[1] + 84), outline=(241, 221, 165, 230), width=6)
    for angle_index in range(12):
        angle = math.radians(angle_index * 30)
        x1 = center[0] + math.cos(angle) * 104
        y1 = center[1] + math.sin(angle) * 104
        x2 = center[0] + math.cos(angle) * 122
        y2 = center[1] + math.sin(angle) * 122
        draw.line((x1, y1, x2, y2), fill=dark, width=5)
    draw.polygon([(228, 78), (255, 152), (332, 152), (270, 198), (292, 274), (228, 229), (164, 274), (186, 198), (124, 152), (201, 152)], fill=(237, 203, 122, 255), outline=dark)
    draw.ellipse((194, 140, 262, 208), fill=red, outline=dark, width=8)
    draw.ellipse((211, 157, 245, 191), fill=(255, 229, 151, 210))
    return crop_visible(canvas, padding=18)


def build_help_icon() -> Image.Image:
    canvas = Image.new("RGBA", ICON_MAX_BOX, (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    dark = (58, 43, 28, 238)
    bronze = (139, 98, 52, 246)
    gold = (214, 176, 101, 255)
    paper = (242, 226, 184, 255)
    green = (69, 105, 78, 248)
    box = (98, 54, 356, 294)
    draw.rounded_rectangle(box, radius=42, fill=paper, outline=dark, width=13)
    draw.rounded_rectangle((box[0] + 14, box[1] + 14, box[2] - 14, box[3] - 14), radius=32, outline=gold, width=6)
    draw.ellipse((170, 86, 286, 202), fill=green, outline=dark, width=10)
    draw.arc((192, 102, 264, 178), 205, 32, fill=(246, 218, 139, 255), width=16)
    draw.line((238, 164, 226, 198), fill=(246, 218, 139, 255), width=15)
    draw.ellipse((218, 220, 244, 246), fill=bronze, outline=dark, width=5)
    draw_soft_highlight(draw, box)
    return crop_visible(canvas, padding=18)


def add_icon_shadow(icon: Image.Image) -> Image.Image:
    alpha = icon.getchannel("A")
    shadow_alpha = alpha.filter(ImageFilter.GaussianBlur(7)).point(lambda value: int(value * 0.34))
    shadow = Image.new("RGBA", (icon.width + 24, icon.height + 24), (0, 0, 0, 0))
    shadow.paste((58, 43, 28, 255), (12, 14), shadow_alpha)
    shadow.alpha_composite(icon, (8, 4))
    return shadow


def blend_motif(master: Image.Image, variant: Image.Image, opacity: float) -> Image.Image:
    output = master.copy()
    region = MOTIF_BOX
    master_region = output.crop(region)
    variant_region = variant.crop(region)
    blended_region = Image.blend(master_region, variant_region, opacity)
    output.paste(blended_region, region, blended_region.getchannel("A"))
    return output


def write_preview(composites: Iterable[Path], out_path: Path) -> None:
    images = [Image.open(path).convert("RGBA") for path in composites]
    cell_w, cell_h = OUTPUT_SIZE
    gap = 36
    columns = 3
    rows = max(1, math.ceil(len(images) / columns))
    preview = Image.new("RGBA", (cell_w * columns + gap * (columns + 1), cell_h * rows + gap * (rows + 1)), (245, 242, 235, 255))
    for index, image in enumerate(images):
        row, column = divmod(index, columns)
        x = gap + column * (cell_w + gap)
        y = gap + row * (cell_h + gap)
        preview.alpha_composite(image, (x, y))
    preview.save(out_path)


def save_image(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--background-sheet-alpha", required=True, type=Path)
    parser.add_argument("--icon-sheet-alpha", required=True, type=Path)
    parser.add_argument("--runtime-dir", default=Path("godot-client/assets/themes/slgclient/current/ui/command_buttons"), type=Path)
    parser.add_argument("--component-dir", default=Path("godot-client/assets/themes/slgclient/current/ui/command_buttons/components"), type=Path)
    parser.add_argument("--preview-dir", default=Path("tmp/ui_icon_text_command_poc_20260601/componentized_scroll_pipeline"), type=Path)
    args = parser.parse_args()

    background_sheet = Image.open(args.background_sheet_alpha).convert("RGBA")
    icon_sheet = Image.open(args.icon_sheet_alpha).convert("RGBA")

    background_cells = [crop_visible(cell, padding=8) for cell in split_grid(background_sheet, 3, 3)]
    icon_cells = [remove_small_alpha_components(crop_visible(cell, padding=8)) for cell in split_grid(icon_sheet, 3, 3)]

    master = resize_exact(background_cells[MASTER_BACKGROUND_INDEX], OUTPUT_SIZE)
    normalized_backgrounds: dict[str, Image.Image] = {}
    for index, name in enumerate(BACKGROUND_NAMES):
        variant = resize_exact(background_cells[index], OUTPUT_SIZE)
        opacity = 0.42 if name != "blank" else 0.0
        background = blend_motif(master, variant, opacity) if name != "blank" else master.copy()
        normalized_backgrounds[name] = background
        save_image(background, args.component_dir / "backgrounds" / f"mainline_command_button_scroll_bg_{name}_v1.png")

    normalized_icons: dict[str, Image.Image] = {}
    for action_id, icon_cell in zip(SOURCE_ICON_ACTION_ORDER, icon_cells):
        icon = resize_inside(icon_cell, ICON_MAX_BOX)
        normalized_icons[action_id] = icon
        save_image(icon, args.component_dir / "icons" / f"mainline_command_button_icon_{action_id}_v1.png")
    normalized_icons["ai_switch"] = build_ai_switch_icon(normalized_icons["ai_hub"])
    save_image(normalized_icons["ai_switch"], args.component_dir / "icons" / "mainline_command_button_icon_ai_switch_v1.png")
    utility_builders = {
        "mail": build_mail_icon,
        "activity": build_activity_icon,
        "help": build_help_icon,
    }
    for action_id, builder in utility_builders.items():
        normalized_icons[action_id] = builder()
        save_image(normalized_icons[action_id], args.component_dir / "icons" / f"mainline_command_button_icon_{action_id}_v1.png")

    composite_paths: list[Path] = []
    for action_id in ACTION_ORDER:
        background_name = BACKGROUND_FOR_ACTION[action_id]
        composite = normalized_backgrounds[background_name].copy()
        icon = add_icon_shadow(normalized_icons[action_id])
        paste_center(composite, icon, (OUTPUT_SIZE[0] // 2, ICON_CENTER_Y))
        out_path = args.runtime_dir / f"mainline_command_button_{action_id}_scroll_component_v1.png"
        save_image(composite, out_path)
        composite_paths.append(out_path)

    preview_path = args.preview_dir / "composite_scroll_component_v1_preview.png"
    write_preview(composite_paths, preview_path)
    print(f"usage_id={USAGE_ID}")
    print(f"output_size={OUTPUT_SIZE[0]}x{OUTPUT_SIZE[1]}")
    print(f"runtime_dir={args.runtime_dir}")
    print(f"component_dir={args.component_dir}")
    print(f"preview={preview_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
