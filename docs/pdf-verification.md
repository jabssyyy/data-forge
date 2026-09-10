# PDF verification, 2026-09-08

Generated with `python3 scripts/build_pdfs.py`, ReportLab 5.0.0. Editable Markdown remains beside each PDF. Both documents are set black on white in the standard PDF fonts: Times-Roman and Times-Bold for text, Courier for code. No font is embedded or redistributed, and no accent colour, page rule, or tinted table fill is used. Text is selectable and source links are clickable. Mathematical symbols the standard fonts cannot draw are rendered as explicit text (for example, “elementwise product”).

| Artifact | Pages | Visible Markdown words | Extracted PDF words, including footer | External link annotations |
|---|---:|---:|---:|---:|
| concept-summary.pdf | 1 | 714 | 698 | 6 |
| blog.pdf | 3 | 1,693 | 1,712 | 7 |

Word counting uses whitespace-delimited tokens. Markdown link destinations are excluded; labels, headings, table contents, and references count. Markdown punctuation/table delimiters produce a slightly different count from extracted PDF text. The extracted concept count includes all substantive text and references, comfortably inside 500–950; the blog is inside 1,200–1,800.

All four final pages were rendered with PyMuPDF and visually inspected: readable type, no clipped text or table columns, no blank/near-empty final page, usable source links, and visible independent-model disclosure. Concept body is 9.4 pt with 12.1 pt leading; references are 7.7 pt. Blog body is 10.5 pt with 14.7 pt leading. The concept uses one A4 page and the blog uses three A4 pages. No paper figures or external images are copied.

Optional verification tooling was installed outside the repository in `/private/tmp/dataforge-python-tools`; it is not required to regenerate the PDFs. Rendered inspection images were temporary review artifacts, not evidence of browser/mobile UI behavior. Source checks and provenance are in `sources.md` and `licenses.md`.

These regenerated PDFs include the authorized projected-memory explanation and explicit hypothetical decay intervention. All four regenerated pages were extracted, rendered, and visually inspected after that addition. They do not claim browser verification or public release of the new lab.

Requirements-image audit added Mirzadeh et al. (2023), ensuring three recent primary papers directly address activation sparsity. PDFs regenerated and all four pages visually inspected again; table above records the final counts.

## Encoding defect found and fixed, 2026-09-10

The generator read its Markdown with `read_text()` and no encoding, so it
decoded as whatever the platform default was. On a cp1252 machine every
multi-byte character arrived as two Latin-1 characters before the substitution
table could see it, and the page rendered `3x` as `3A-`, `Csordas` with a
mangled accent, and the gated-product symbol as two stray glyphs. The defect
was invisible to the checks in place: PyMuPDF extraction returned the intended
characters, so text extraction and word counts looked correct while the
rendered page did not. It affected the previously published PDFs.

The read is now explicitly UTF-8, and `assert_encodable` fails the build if any
character that reaches the page cannot be drawn by the standard fonts, naming
the character and its code point. A silent rendering fault is now a build
error. Accented Latin-1 characters are no longer substituted, so cited names
such as Csordas keep their spelling.

The one-page limit is now met by searching for the largest type size that fits
rather than by a hand-tuned constant, because the prose changes as the project
does. The briefing currently sets at 0.96 of the base size. Both documents were
re-rendered and inspected after the change.
