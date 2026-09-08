#!/usr/bin/env python3
"""Measure every ink and series colour against the surface it is drawn on.

Colour is load-bearing on this page: the reader is asked to tell curves apart
and to read numbers off an axis. This resolves the tokens the way the cascade
does, computes WCAG 2.1 contrast ratios for both themes, and fails if anything
falls under its threshold.

    python3 scripts/contrast_check.py

style.css declares each palette more than once. The later declaration wins, so
the effective light palette is the last bare `:root` block and the effective
dark palette is the last `[data-theme="dark"]` block. Reading only the first
block would measure colours the page never renders, so this walks all of them
in order and keeps the last value seen for each token.

Text inks are held to 4.5:1 (WCAG AA, normal text). Series hues are graphical
objects and are held to 3:1 (WCAG AA, non-text contrast).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "style.css"
OUT = ROOT / "docs" / "contrast-verification.json"

TEXT_MIN = 4.5
GRAPHIC_MIN = 3.0

TEXT_TOKENS = ["--ink", "--ink-2", "--ink-3", "--accent-ink", "--warn-ink"]
GRAPHIC_TOKENS = ["--accent", "--s-act", "--s-ce", "--s-oracle"]

BLOCK = re.compile(r"([^{}]+)\{([^{}]*)\}")
HEX = re.compile(r"(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;")


def channel(value):
    value = value / 255.0
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def luminance(colour):
    colour = colour.lstrip("#")
    r, g, b = (int(colour[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def ratio(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def resolve(css):
    """Walk every rule in order, keeping the last value each theme declares."""
    light, dark = {}, {}
    for match in BLOCK.finditer(css):
        selector = " ".join(match.group(1).split())
        body = match.group(2)
        if not HEX.search(body):
            continue
        declarations = dict(HEX.findall(body))
        # a bare :root, with no dark qualifier anywhere in the selector
        if selector.endswith(":root") and "dark" not in selector:
            light.update(declarations)
        elif "data-theme=\"dark\"" in selector or "data-theme='dark'" in selector:
            dark.update(declarations)
        elif ":root:not([data-theme=\"light\"])" in selector:
            dark.update(declarations)
    return light, dark


def main():
    css = CSS.read_text(encoding="utf-8")
    light, dark = resolve(css)

    report = {"themes": {}, "failures": [], "passed": False}

    for theme, palette in (("light", light), ("dark", dark)):
        surface = palette.get("--surface")
        if not surface:
            report["failures"].append("%s: no --surface token resolved" % theme)
            continue
        rows = {}
        for token in TEXT_TOKENS + GRAPHIC_TOKENS:
            if token not in palette:
                continue
            value = palette[token]
            measured = round(ratio(value, surface), 2)
            threshold = TEXT_MIN if token in TEXT_TOKENS else GRAPHIC_MIN
            rows[token] = {
                "colour": value,
                "ratio": measured,
                "threshold": threshold,
                "passes": measured >= threshold,
            }
            if measured < threshold:
                report["failures"].append(
                    "%s %s %s is %.2f:1 against %s, needs %.1f:1"
                    % (theme, token, value, measured, surface, threshold)
                )
        report["themes"][theme] = {"surface": surface, "tokens": rows}

    # a light surface that resolved dark means a palette block was clobbered
    light_surface = report["themes"].get("light", {}).get("surface")
    if light_surface and luminance(light_surface) < 0.5:
        report["failures"].append(
            "light theme resolved to a dark surface (%s): a :root block is wrong"
            % light_surface
        )
    dark_surface = report["themes"].get("dark", {}).get("surface")
    if dark_surface and luminance(dark_surface) > 0.5:
        report["failures"].append(
            "dark theme resolved to a light surface (%s)" % dark_surface
        )

    report["passed"] = not report["failures"]

    for theme, data in report["themes"].items():
        print("%s, against surface %s" % (theme, data["surface"]))
        for token, row in data["tokens"].items():
            print(
                "  %-13s %s  %6.2f:1  needs %.1f  %s"
                % (
                    token,
                    row["colour"],
                    row["ratio"],
                    row["threshold"],
                    "ok" if row["passes"] else "FAIL",
                )
            )
        print()

    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if report["failures"]:
        for failure in report["failures"]:
            print("FAIL:", failure)
        return 1
    print("All measured colours clear their thresholds.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
