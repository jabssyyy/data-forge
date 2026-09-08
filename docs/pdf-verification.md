# PDF verification — 2026-09-08

Generated with `python3 scripts/build_pdfs.py`, Python 3.12.4 and ReportLab 5.0.0. Editable Markdown remains beside each PDF. The generator enforces exactly one concept page and uses selectable text and clickable source links. Mathematical symbols unsupported by standard PDF fonts are rendered as explicit text (for example, “elementwise product”).

| Artifact | Pages | Visible Markdown words | Extracted PDF words, including footer | External link annotations |
|---|---:|---:|---:|---:|
| concept-summary.pdf | 1 | 729 | 714 | 5 |
| blog.pdf | 3 | 1,678 | 1,700 | 6 |

Word counting uses whitespace-delimited tokens. Markdown link destinations are excluded; labels, headings, table contents, and references count. Markdown punctuation/table delimiters produce a slightly different count from extracted PDF text. The extracted concept count includes all substantive text and references, comfortably inside 500–950; the blog is inside 1,200–1,800.

All four final pages were rendered with PyMuPDF and visually inspected: readable type, no clipped text or table columns, no blank/near-empty final page, usable source links, and visible independent-model disclosure. Concept body is 9.4 pt with 12.1 pt leading; references are 7.7 pt. Blog body is 10.5 pt with 14.7 pt leading. The concept uses one A4 page and the blog uses three A4 pages. No paper figures or external images are copied.

Optional verification tooling was installed outside the repository in `/private/tmp/dataforge-python-tools`; it is not required to regenerate the PDFs. Rendered inspection images were temporary review artifacts, not evidence of browser/mobile UI behavior. Source checks and provenance are in `sources.md` and `licenses.md`.
