#!/usr/bin/env python3
"""Generate both deliverables from editable Markdown. Run from repository root.

Set black on white. No accent colour, no rules across the head of the page, no
tinted table headers. Hierarchy is carried by size, weight and space, the way a
printed paper carries it. The document should look like something a person
typeset, and it should not borrow anyone's brand: this is an independent
probe, not an official model, and dressing it in a sponsor's identity would
imply an affiliation the project spends its whole length denying.

Only the 14 standard PDF fonts are used, so nothing is embedded and no font is
redistributed. Those fonts encode WinAnsi, which is Latin-1 plus a handful of
extras, so anything outside that range is rewritten to an ASCII equivalent
before it reaches the page. `assert_encodable` turns a leftover into a build
failure, because the alternative is a deliverable that renders as mojibake and
extracts as clean text, which is exactly the fault that hid here before.
"""
from pathlib import Path
import re
from html import escape
from reportlab.platypus import (
    BaseDocTemplate,
    PageTemplate,
    Frame,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor, black
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parents[1]

INK = black
GREY = HexColor("#565656")
RULE = HexColor("#000000")

FOOTER = "DataForge / independent BDH probe / September 2026"

# Characters the standard fonts cannot draw, and what to print instead. Latin-1
# accents are NOT in this table: WinAnsi covers them, so cited names keep their
# spelling.
UNPRINTABLE = {
    "⊙": "(elementwise product)",  # circled dot operator
    "×": "x",
    "→": " to ",
    "−": "-",
    "≈": "approximately ",
    "≤": "<=",
    "≥": ">=",
    "≠": "!=",
    "λ": "lambda",
    "ρ": "rho",
    "σ": "sigma",
    "Ł": "L",
    "ł": "l",
    "ń": "n",
    "ś": "s",
    "ř": "r",
    "‑": "-",
    " ": " ",
}


def assert_encodable(text, where):
    """Fail the build rather than ship a page of replacement glyphs."""
    for char in text:
        try:
            char.encode("cp1252")
        except UnicodeEncodeError:
            raise RuntimeError(
                "%s contains %r (U+%04X), which the standard PDF fonts cannot "
                "draw. Add it to UNPRINTABLE in scripts/build_pdfs.py."
                % (where, char, ord(char))
            )


def inline(s):
    for bad, good in UNPRINTABLE.items():
        s = s.replace(bad, good)
    s = escape(s)
    s = re.sub(
        r"\[([^\]]+)\]\((https?://[^)]+)\)",
        r'<link href="\2" color="#000000"><u>\1</u></link>',
        s,
    )
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', s)
    return s


ALLOWED_COLOURS = {"#000000", "#565656"}
ALLOWED_FONTS = {"Times-Roman", "Times-Bold", "Times-Italic", "Courier"}


def verify_style(name):
    """Read the finished PDF back and confirm it is still black on white.

    The point of this pass is that a restyle is easy to half-apply: the
    generator can say one thing while the shipped file says another, and a
    reader opening the published copy sees whatever was last built. Requires
    PyMuPDF; skipped with a notice when it is absent so the build still runs.
    """
    try:
        import pymupdf
    except ImportError:
        print(f"{name}: style check skipped, PyMuPDF not installed")
        return

    doc = pymupdf.open(str(ROOT / "docs" / f"{name}.pdf"))
    colours, fonts = set(), set()
    for page in doc:
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                for span in line["spans"]:
                    colours.add("#%06x" % span["color"])
                    fonts.add(span["font"])
    doc.close()

    stray = sorted(colours - ALLOWED_COLOURS)
    if stray:
        raise RuntimeError(
            f"{name}.pdf paints {stray}, which is not black or the one grey. "
            "The deliverables are set black on white."
        )
    unexpected = sorted(fonts - ALLOWED_FONTS)
    if unexpected:
        raise RuntimeError(f"{name}.pdf uses unexpected fonts {unexpected}")
    print(f"{name}: style ok, colours={sorted(colours)} fonts={sorted(fonts)}")


def build(name, compact, scale=1.0):
    # Explicit encoding. Without it this reads as cp1252 on Windows and every
    # multi-byte character becomes two Latin-1 characters on the page.
    source = (ROOT / "docs" / f"{name}.md").read_text(encoding="utf-8")

    size, lead = (10.0, 12.6) if compact else (10.6, 14.4)
    if compact:
        size, lead = size * scale, lead * scale
    styles = {
        "p": ParagraphStyle(
            "body",
            fontName="Times-Roman",
            fontSize=size,
            leading=lead,
            textColor=INK,
            spaceAfter=5 * scale if compact else 8.5,
        ),
        "h1": ParagraphStyle(
            "title",
            fontName="Times-Bold",
            fontSize=21 if compact else 30,
            leading=24 if compact else 34,
            textColor=INK,
            spaceAfter=4 if compact else 8,
        ),
        "h2": ParagraphStyle(
            "section",
            fontName="Times-Bold",
            fontSize=11.2 * scale if compact else 14.5,
            leading=13.5 * scale if compact else 19,
            textColor=INK,
            spaceBefore=8 * scale if compact else 13,
            spaceAfter=3,
        ),
        "ref": ParagraphStyle(
            "reference",
            fontName="Times-Roman",
            fontSize=8.5 * scale if compact else 10,
            leading=10.6 * scale if compact else 13.5,
            textColor=GREY,
            spaceAfter=2.5,
        ),
        "cell": ParagraphStyle(
            "cell",
            fontName="Times-Roman",
            fontSize=8.9 * scale if compact else 10,
            leading=11 * scale if compact else 13,
            textColor=INK,
        ),
        "cellhead": ParagraphStyle(
            "cellhead",
            fontName="Times-Bold",
            fontSize=8.6 if compact else 10,
            leading=10.8 if compact else 13,
            textColor=INK,
        ),
    }

    w, h = A4
    margin = 38 if compact else 52
    doc = BaseDocTemplate(
        str(ROOT / "docs" / f"{name}.pdf"),
        pagesize=A4,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=42,
        bottomMargin=36,
        title=source.splitlines()[0][2:],
        author="DataForge project",
    )

    def footer(c, d):
        c.setFont("Times-Roman", 8)
        c.setFillColor(GREY)
        c.drawString(margin, 22, FOOTER)
        c.drawRightString(w - margin, 22, str(d.page))

    doc.addPageTemplates(
        PageTemplate(
            id="main",
            frames=[
                Frame(
                    margin,
                    36,
                    w - 2 * margin,
                    h - 78,
                    leftPadding=0,
                    rightPadding=0,
                    topPadding=0,
                    bottomPadding=0,
                )
            ],
            onPage=footer,
        )
    )

    # check what will actually reach the page, after the substitutions
    sanitized = source
    for bad, good in UNPRINTABLE.items():
        sanitized = sanitized.replace(bad, good)
    assert_encodable(sanitized, f"{name}.md")

    blocks = re.split(r"\n\s*\n", source.strip())
    flow = []
    for block in blocks:
        if block.startswith("|"):
            rows = []
            for line in block.splitlines():
                if re.match(r"^\|[\s:|\-]+$", line):
                    continue
                style = styles["cellhead"] if not rows else styles["cell"]
                rows.append(
                    [
                        Paragraph(inline(cell.strip()), style)
                        for cell in line.strip("|").split("|")
                    ]
                )
            table = Table(
                rows,
                colWidths=[(w - 2 * margin) / len(rows[0])] * len(rows[0]),
                hAlign="LEFT",
            )
            # Booktabs: a rule above the header, a rule under it, a rule at the
            # foot. No verticals, no fills.
            table.setStyle(
                TableStyle(
                    [
                        ("LINEABOVE", (0, 0), (-1, 0), 0.9, RULE),
                        ("LINEBELOW", (0, 0), (-1, 0), 0.4, RULE),
                        ("LINEBELOW", (0, -1), (-1, -1), 0.9, RULE),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 0),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ]
                )
            )
            flow.extend([Spacer(1, 4), table, Spacer(1, 9)])
            continue

        key = (
            "h1"
            if block.startswith("# ")
            else "h2"
            if block.startswith("## ")
            else "ref"
            if re.match(r"^\[\d\]", block)
            else "p"
        )
        text = re.sub(r"^#+ ", "", block).replace("\n", " ")
        flow.append(Paragraph(inline(text), styles[key]))

    doc.build(flow)

    visible = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", source)
    visible = re.sub(r"^\|[\s:|\-]+$", "", visible, flags=re.M)
    print(f"{name}: source-visible words={len(visible.split())}; pages={doc.page}")
    return doc.page


def build_concept():
    """Set the briefing at the largest size that still fits one page.

    The page limit is a hard requirement and the prose changes as the project
    does, so picking a point size by hand means rediscovering the fit by trial
    every time a sentence is added. Search it instead, largest first, and take
    the first size that lands on one page.
    """
    for step in range(0, 15):
        scale = 1.06 - step * 0.02
        pages = build("concept-summary", True, scale)
        if pages == 1:
            print(f"concept-summary: fitted at scale {scale:.2f}")
            return
    raise RuntimeError("Concept briefing does not fit one page at any tested size")


if __name__ == "__main__":
    build_concept()
    verify_style("concept-summary")
    build("blog", False)
    verify_style("blog")
