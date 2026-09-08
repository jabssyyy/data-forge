#!/usr/bin/env python3
"""Render the link-preview image (og-preview.png) from the shipped measurements.

The curve drawn here is the real layer-2 active-neuron series from
results.json, not a decorative shape. Run from the repository root:

    python3 scripts/build_og_image.py

Requires Pillow (see requirements-docs.txt).
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "og-preview.png"

W, H = 1200, 630
SCALE = 2  # draw large, downsample once: cheap antialiasing for the curve

PAPER = (252, 251, 248)
INK = (20, 18, 14)
INK2 = (86, 81, 74)
INK3 = (133, 127, 117)
RULE = (227, 223, 216)
ACCENT = (42, 120, 214)
ACCENT_WASH = (222, 233, 247)

WARMUP_LEN = 13
WORD_LEN = 8


def load_font(names, size):
    """Prefer a real serif/sans on the host; fall back to Pillow's default."""
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


SERIF = ["georgia.ttf", "Georgia.ttf", "DejaVuSerif.ttf", "times.ttf"]
SERIF_B = ["georgiab.ttf", "Georgia Bold.ttf", "DejaVuSerif-Bold.ttf", "timesbd.ttf"]
SANS = ["segoeui.ttf", "Helvetica.ttf", "DejaVuSans.ttf", "arial.ttf"]
MONO = ["consola.ttf", "Menlo.ttc", "DejaVuSansMono.ttf", "cour.ttf"]


def main():
    results = json.loads((ROOT / "results.json").read_text(encoding="utf-8"))
    layer2 = results["per_layer"]["2"]
    series = layer2["series"]
    memorize = layer2["memorize"]
    repeat = layer2["repeat"]

    img = Image.new("RGB", (W * SCALE, H * SCALE), PAPER)
    d = ImageDraw.Draw(img)
    s = SCALE

    f_title = load_font(SERIF_B, 66 * s)
    f_claim = load_font(SANS, 25 * s)
    f_stat = load_font(MONO, 42 * s)
    f_label = load_font(MONO, 17 * s)
    f_foot = load_font(SANS, 19 * s)

    # left rule, echoing the page's figure separators
    d.rectangle([0, 0, 10 * s, H * s], fill=ACCENT)

    x0, y0 = 68 * s, 58 * s
    d.text((x0, y0), "SPARSE NON-NEGATIVE ACTIVATIONS", font=f_label, fill=INK3)
    d.text((x0, y0 + 34 * s), "Sparsity is not", font=f_title, fill=INK)
    d.text((x0, y0 + 108 * s), "a budget.", font=f_title, fill=ACCENT)

    claim_lines = [
        "In a trained BDH, the active-neuron",
        "fraction in layer 2 falls roughly 3x",
        "the moment the next letter becomes",
        "predictable. Same weights, same input",
        "length, no sparsity setting touched.",
    ]
    for row, line in enumerate(claim_lines):
        d.text((x0, y0 + (196 + row * 33) * s), line, font=f_claim, fill=INK2)

    # ---- the measured curve, plotted from results.json ------------------
    px, py = 664 * s, 132 * s
    pw, ph = 456 * s, 236 * s
    top = max(series) if series else 1.0
    top = top * 1.12

    def sx(i):
        return px + (i / (len(series) - 1)) * pw

    def sy(v):
        return py + ph - (v / top) * ph

    # memorize band
    d.rectangle(
        [sx(WARMUP_LEN), py, sx(WARMUP_LEN + WORD_LEN - 1), py + ph],
        fill=(238, 236, 231),
    )
    for k in range(5):
        gy = py + ph - (k / 4) * ph
        d.line([px, gy, px + pw, gy], fill=RULE, width=1 * s)

    points = [(sx(i), sy(v)) for i, v in enumerate(series)]
    d.polygon(
        points + [(sx(len(series) - 1), py + ph), (sx(0), py + ph)],
        fill=ACCENT_WASH,
    )
    d.line(points, fill=ACCENT, width=3 * s, joint="curve")

    # the two plateaus: the ratio, on the curve it comes from
    for value, i0, i1 in (
        (memorize, WARMUP_LEN, WARMUP_LEN + WORD_LEN - 1),
        (repeat, WARMUP_LEN + WORD_LEN, len(series) - 1),
    ):
        d.line([sx(i0), sy(value), sx(i1), sy(value)], fill=INK, width=2 * s)

    d.text((px, py + ph + 18 * s), "TOKEN  0", font=f_label, fill=INK3)
    d.text(
        (px + pw - 62 * s, py + ph + 18 * s),
        "%d" % (len(series) - 1),
        font=f_label,
        fill=INK3,
    )

    # ---- the two numbers ------------------------------------------------
    ny = 440 * s
    d.text((x0, ny), "%.2f%%" % (memorize * 100), font=f_stat, fill=INK)
    d.text((x0, ny + 52 * s), "MEMORIZING", font=f_label, fill=INK3)

    d.text((x0 + 230 * s, ny), "%.2f%%" % (repeat * 100), font=f_stat, fill=ACCENT)
    d.text((x0 + 230 * s, ny + 52 * s), "ON REPEATS", font=f_label, fill=INK3)

    d.text(
        (x0 + 450 * s, ny),
        "%.2fx" % (memorize / repeat),
        font=f_stat,
        fill=INK,
    )
    d.text((x0 + 450 * s, ny + 52 * s), "RATIO", font=f_label, fill=INK3)

    d.line([x0, 552 * s, (W - 68) * s, 552 * s], fill=RULE, width=1 * s)
    d.text(
        (x0, 566 * s),
        "Live in the browser  |  independent reimplementation, not an official BDH model",
        font=f_foot,
        fill=INK3,
    )

    img.resize((W, H), Image.LANCZOS).save(OUT, "PNG", optimize=True)
    print("wrote %s (%d bytes)" % (OUT.relative_to(ROOT), OUT.stat().st_size))


if __name__ == "__main__":
    main()
