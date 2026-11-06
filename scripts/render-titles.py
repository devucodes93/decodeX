"""
Render section/page titles as images in the Pricedown typeface.

Why images: the Pricedown files in design-fonts/ are covered by the
Typodermic *Desktop* EULA, which allows fixed artwork (PNG/JPG/outlined SVG)
but NOT webfont embedding or serving/sharing the font file. So the font stays
in the git-ignored design-fonts/ folder, and only the rendered PNGs are
published.

Usage (from the project root):
    python scripts/render-titles.py

Outputs:
    public/assets/titles/<slug>.png   transparent PNGs
    src/data/titleArt.json            manifest used by <TitleArt>

To add or change a title: edit TITLES below and re-run. The key must match
the heading text used in the code exactly.
"""

import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "design-fonts" / "pricedown" / "Pricedown Bl.otf"
OUT_DIR = ROOT / "public" / "assets" / "titles"
MANIFEST = ROOT / "src" / "data" / "titleArt.json"

# key (exact heading text in code) -> lines to render
TITLES = {
    "About the challenge": ["About the challenge"],
    "Inside the mission": ["Inside the mission"],
    "What the event aims to do.": ["What the event", "aims to do"],
    "Eligibility & event format": ["Eligibility &", "event format"],
    "Who organises the event": ["Who organises", "the event"],
    "A Signal Processing Based CTF Challenge.": ["A signal processing", "based CTF challenge"],
    "In collaboration with": ["In collaboration with"],
    "Frequently asked questions": ["Frequently asked", "questions"],
    "Register for the challenge": ["Register for", "the challenge"],
    "Register for the challenge.": ["Register for", "the challenge"],
    "Sponsors and partners": ["Sponsors and", "partners"],
    "Results": ["Results"],
    "Page not found": ["Page not found"],
    "DecodeX 2026": ["DecodeX 2026"],
    "Mission Briefing": ["Mission Briefing"],
    "Mission Schedule": ["Mission Schedule"],
    "Crew Allies": ["Crew Allies"],
}

# Optional per-title overrides of the default title look, e.g.
#   "Some title": {"fill": (r, g, b, a), "stroke": 5, "shadow": (7, 7)}
STYLES: dict = {}

# Look: cream fill, heavy black outline, hard drop shadow (classic crime-caper
# title treatment), matching the site's cream/ink palette.
SIZE = 170            # font px (renders at ~2x display size for crisp retina)
STROKE = 9            # outline width px
SHADOW = (7, 8)       # hard shadow offset px
LINE_GAP = 0.92       # line height as a multiple of font size
FILL = (246, 235, 227, 255)
INK = (18, 15, 16, 255)
PAD = 24


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def render(lines: list[str], font: ImageFont.FreeTypeFont, style=None) -> Image.Image:
    style = style or {}
    fill = style.get("fill", FILL)
    STROKE = style.get("stroke", globals()["STROKE"])
    SHADOW = style.get("shadow", globals()["SHADOW"])
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    boxes = [probe.textbbox((0, 0), ln, font=font, stroke_width=STROKE) for ln in lines]
    widths = [b[2] - b[0] for b in boxes]
    line_h = int(SIZE * LINE_GAP)
    asc_pad = boxes[0][1]

    w = max(widths) + PAD * 2 + SHADOW[0]
    h = line_h * (len(lines) - 1) + (boxes[-1][3] - asc_pad) + PAD * 2 + SHADOW[1]
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    for i, (ln, b) in enumerate(zip(lines, boxes)):
        x = PAD - b[0]
        y = PAD - asc_pad + i * line_h
        # Hard shadow (filled + stroked so it is as fat as the outlined text)
        if SHADOW != (0, 0):
            d.text((x + SHADOW[0], y + SHADOW[1]), ln, font=font, fill=INK,
                   stroke_width=STROKE, stroke_fill=INK)
        d.text((x, y), ln, font=font, fill=fill, stroke_width=STROKE, stroke_fill=INK)

    return img.crop(img.getbbox())


def main() -> None:
    if not FONT.exists():
        raise SystemExit(f"Font not found: {FONT}")
    font = ImageFont.truetype(str(FONT), SIZE)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest = {}
    for key, lines in TITLES.items():
        name = slug(" ".join(lines)) or "title"
        if key in STYLES:
            name += "-badge"
        img = render(lines, font, STYLES.get(key))
        path = OUT_DIR / f"{name}.png"
        img.save(path, optimize=True)
        manifest[key] = {
            "src": f"/assets/titles/{name}.png",
            "w": img.width,
            "h": img.height,
            "lines": len(lines),
        }
        print(f"{path.relative_to(ROOT)}  {img.width}x{img.height}")

    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
