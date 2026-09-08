# Execution status

User authorization: execute the entire PHASE-PROMPTS.md plan, use parallel helper agents, and improve the UI thoroughly. Phase-boundary pauses are superseded. Scientific validity and truthful completion checks remain binding.

| Phase | Status | Evidence / work |
|---|---|---|
| 0 · Baseline | Complete | baseline-audit.md; preserved hashes; strengthened parity |
| 1 · Equations | Complete | Verified structural comparison and claim-adjacent citations |
| 2 · Transformer offline | Complete | Predeclared gate passed, trained1.581590× / random0.998273× |
| 3 · BDH grid | Complete | Every cell from raw verified product; synchronized scrubbing |
| 4 · Guide | Complete | Canonical1→8, layer0, restored layer2 untrained; manual cancellation |
| 5 · UI craft | Complete locally | Light/dark,380/768/1440px, keyboard/loading fixes, browser-verification.json |
| 6 · Documentation | Complete | README, requirements, sources/licenses/AI disclosure |
| 7 · Concept PDF | Complete | One page700 extracted words; visually checked |
| 8 · Blog PDF | Complete | Three pages1715 extracted words; visually checked |
| 9 · Deployment | Public preview verified; Pages pending | Immutable public release preview works without sign-in; Pages needs owner enablement |
| 10 · Final checks | Local and public preview checks complete; real phone pending | Browser, PDFs, fresh-clone training and public preview verified |
| 11 · Live Transformer | Complete locally | Both parity suites and actual mask/RoPE/layout mutations pass |
| 12 · Dual grids | Complete locally |616 token/layer/weight states checked for both models |
| 13 · Memory graph and interpretation | Complete locally | 64 numerical cases; native/decay graph, histories, measured prediction interpretation; release-package browser checks |
| 14 · Supplied image requirements | Complete locally | requirements-audit.md; three directly relevant recent primary papers, README component inventory, complete disclosures |
| 15 · Interface pass | Complete locally; browser suites pass | Serif/sans/mono type system, warm paper surfaces, motion tied to real state changes, page furniture in `ui.js`/`ui.css`, link-preview card, em dashes removed from every shipped file |

Original scientific data is immutable during this execution. Baseline hashes are in baseline-evidence.json. Latest decisions and final validation outcomes will be recorded here before handoff. The earlier public preview is verified; GitHub Pages enablement and real-phone checks remain pending. The later memory expansion has separate integration/release gates below.

## Execution decisions

The user requested the entire plan without phase stops. Model and UI agents therefore implemented optional live comparison in parallel with the documentation agent; required PDFs/README retained dedicated resources. The final release includes both live models and a separately fixed offline comparison table.

Training preservation: all original probe, model, result, weights and reference hashes still match the initial audit. A fresh clone of the original public commit retrained successfully, yielding3.365854× at layer2 and0.462849 nats final minibatch loss on macOSARM/Python3.12.4/Torch2.7.0. This differs from the shipped baseline and is disclosed rather than overwritten.

Browser checks passed in Chrome152: both grids across616 fixture states, guide states, fixed offline table, playback, sequence shrink, sandbox96, reduced motion and unavailable-weight behavior. All six viewport/theme combinations had no overflow or page errors. Real phone testing remains unperformed.

Release: `python3 scripts/build_site.py` assembles only approved static assets and documents. GitHub workflow uses official Pages actions. The public repository is verified; Pages was disabled and its enable endpoint returned404 under a login with push=true/admin=false. Owner enablement has been requested while release preparation continues.

## Published source and CI

Release commit `68780b82834ae3d51334bab8a54c23a43d48719d` was pushed to `origin/main` and independently verified with `git ls-remote`. [GitHub Actions run34220031391](https://github.com/jabssyyy/data-forge/actions/runs/34220031391) passed both model verification suites and the static assembly step on Ubuntu. It failed at `actions/configure-pages@v5` because Pages is not enabled. Public site publication is therefore pending the repository owner setting Pages source to GitHub Actions. Code and PDFs are already in the public source repository.

The independent browser edge suite additionally passed delayed/stale fetch selection, initial model selection, Transformer retry recovery, and keyboard radio navigation, with zero page errors (`browser-edge-check.json`). The exact `_site` package was tested under a project subpath, including the compact baseline summary used by the offline table; its full browser suite passed.

## Verified public preview

https://rawcdn.githack.com/jabssyyy/data-forge/68780b82834ae3d51334bab8a54c23a43d48719d/index.html serves the exact implementation release. A clean unauthenticated Chrome context used the host’s normal “Open the page” confirmation; no cookie/header bypass was used. Both live models, trained/random selection, four offline comparison rows and PDF downloads worked with zero page errors. See public-preview-check.json. Anonymous PDF downloads from GitHub also match local SHA-256 hashes (public-pdf-verification.json). The preview is an immutable third-party snapshot, not a claim that GitHub Pages is enabled.

## Authorized memory and teaching expansion

The later user request authorizes a measured memory graph and more explicit interpretation, superseding the earlier no-wiring fence. `bdh.js` optional instrumentation, `memory.js`, and `memory_test.js` expose a centered projected context graph and a separate hypothetical lambda=0.96 decay intervention. Native lambda=1 remains unchanged; this is not literal paper sigma or a semantic-neuron graph. `docs/memory-explainer.md` records time alignment, stable subset selection, exact equations, and inference limits.

Engine verification: 64 combinations of trained/random weights, lambda1/.96, four layers and heads; maximum normalized attention/read error2.9962e-7. Gate/product errors below1e-4; captured lambda1 logits, activations, and counts exactly preserved. Evidence in `memory-verification.json`. README and editable concept/blog sources now explain the lab; PDFs regenerated with updated counts in `pdf-verification.md`. Memory browser verification passed on both the workspace and the exact built static package: fixed graph selection, prediction alignment, playback, full-model decay isolated from the baseline, rapid-switch cancellation, unavailable-model recovery, keyboard access, and both node columns visible at320/390/1440px in both themes. Existing grid regression also passed616states and the four loading/keyboard edge checks. See memory-browser-verification.json. The expansion is now publicly verified; see the release record below.

## Supplied requirements image audit

`requirements-audit.md` maps every supplied requirement to implementation/evidence and remaining release gates. README gained a complete component-role table and direct repository link; licenses gained explicit code/data/weights/graphics/fonts/reused-component coverage. Mirzadeh et al.2023 was verified as a third directly relevant activation-sparsity primary paper alongside BDH2025 and Spark2025; README and both PDFs cite its supported claim. The page includes the new claim-adjacent citation; its local resource links and anchors all resolve in the static package. Public release confirmation is recorded below. Final local PDFs: concept1page700words, blog3pages1715words.

The submission image audit is complete locally. Native model parity and64memory cases pass; both PDFs were regenerated and inspected. The user reference JPEG is excluded from the source release.

## Verified memory release

Implementation commit `67e4736b5ffc1e676d124868e78caa9ae349ab00` is pushed to origin/main and independently checked with git ls-remote. The updated [public demo](https://rawcdn.githack.com/jabssyyy/data-forge/67e4736b5ffc1e676d124868e78caa9ae349ab00/index.html) was checked in a clean unsigned-in browser through the normal host confirmation. Both models, native graph, full-model decay, random-weight controls, and both PDF downloads pass with zero page errors. Public PDF hashes match the locally inspected files. Receipts: public-preview-check.json and public-pdf-verification.json.

[Public CI run34227442243](https://github.com/jabssyyy/data-forge/actions/runs/34227442243) passed numerical verification (including64memory cases) and static assembly on Ubuntu, then failed at Pages configuration because owner enablement remains outstanding. The working public preview fulfills the supplied artifact-URL requirement. No event-portal submission or real-phone test is claimed.

## Interface pass, 2026-09-08

The page was reworked for character and for the interaction affordances a
reader expects, without touching any model code, weight file, or measurement.

Type moved from a single geometric sans to three roles: Newsreader for prose
headings, Public Sans for the interface, IBM Plex Mono for every measured
number. Surfaces moved from cool grey to warm paper. Each substituted colour
holds relative luminance within about 0.002 of the value it replaced, so the
series-versus-surface contrast ratios recorded at the top of `style.css`
still hold. Panels lost their shadows and most of their corner radius, badges
became squared instrument tags, the generated-looking "01 / SECTION" rules
became figure captions, and the wide-tracked capital kickers became sentence
case.

Motion was added only where something real changed: curves fade up and the
two phase-mean plateaus draw left to right when a new measurement lands,
readout values tick when the number they show actually moves, and grid cells
transition so scrubbing reads as a field settling. All of it animates arrays
that have already been computed and none of it triggers inference. Every
animation is disabled under `prefers-reduced-motion`.

`ui.js` and `ui.css` add page furniture: collapsing section menu, reading
progress indicator, keyboard shortcuts, copy buttons, toasts, back-to-top, an
expandable question list, skeleton and empty states, and a privacy note. The
note states the truth, which is that the page sets no cookies, loads no
analytics, and keeps two values in `localStorage`. No consent banner is shown
because there is nothing to consent to, and no password field was added
because the page has no account system. Every keyboard shortcut dispatches the
same event its control would, so `app.js` remains the single path into the
model.

`og-preview.png` is generated by `scripts/build_og_image.py` from the shipped
`results.json` layer-2 series. The curve and the three numbers on the card are
measurements, not illustration.

Em dashes were removed from every shipped file: the page, all browser
JavaScript, the README, and every document under `docs/`. Sentences were
rewritten rather than having the glyph swapped. The historical planning notes
at the repository root still contain them and were left untouched.

Verification after the pass: `parity_test.js`, `transformer_parity_test.js`
and the 64-case `memory_test.js` all pass unchanged; `index.html` parses with
118 unique ids, no duplicates, and every anchor and ARIA reference resolving;
`scripts/build_site.py` assembles the release including the three new assets;
both PDFs regenerate at one and three pages. The Playwright suites in
`scripts/` have not been re-run against this pass.

## Reading pass, 2026-09-08

A second interface pass, on the instruction that this is a teaching tool and
should be held to product standards rather than treated as a demo.

Type. The three roles were rebuilt around reading rather than density.
Literata carries prose headings, Atkinson Hyperlegible Next carries the
interface, Atkinson Hyperlegible Mono carries every measured number. The
Atkinson faces were commissioned by the Braille Institute of America for
letter distinction at reading sizes, which is the correct brief for a page
whose whole purpose is reading values off a chart. Every declared size was
scaled and floored: body is 18px, and nothing visible renders below 13px.
Subscripts inside equations are exempt, because a subscript is smaller than
its parent by definition. The chart's own axis and annotation type, which is
baked into the SVG as attributes, was raised to match.

Surfaces. The dark theme was rebuilt to be subtler: a neutral ground rather
than a warm cast, and text at 13.8:1 rather than near-white on near-black.
`scripts/contrast_check.py` now resolves the tokens the way the cascade does,
because style.css declares each palette more than once and the later block
wins. Reading only the first block had been measuring colours the page never
rendered. Every text ink now clears 4.5:1 and every series hue clears 3:1
against its own surface, in both themes, and the check fails the build if that
stops being true. It also catches a light theme that resolves to a dark
surface, which is exactly the fault it found on its first run.

Chrome. The small boxed chips are gone: an evidence label is now a word at 14px
with a colour mark, not a container. The copy button was removed. Every link
that leaves the page opens in a new tab with rel=noopener, static links in the
markup and runtime-inserted links through a mutation observer, each carrying a
visually hidden note for screen readers. Control labels were renamed to name
the thing rather than instruct: "Try memory decay" became "Memory decay",
"Retry live control" became "Retry", "Keys" became "Shortcuts".

Zoom. Both figures zoom. The activity chart stretches its token axis from 100%
to 400% and scrolls, with Ctrl or Cmd and the wheel as the pointer gesture, and
opens full screen. The memory graph zooms and pans over its own drawing by
moving the SVG viewBox. Neither touches a node position, an edge width, or a
computed value: the viewport moves, the measurement does not.

Verification: `scripts/ui_check.cjs` passes 13 checks with zero page errors,
including the 13px floor, the outbound-link rule, and an assertion that the
canonical 3.10x ratio is unchanged after zooming. `browser_check.cjs` (616 grid
states), `memory_browser_check.cjs` (8 groups including node and edge keyboard
activation and 320px overflow in both themes) and `browser_edge_check.cjs` (4
checks, run twice for stability) all pass. `parity_test.js`,
`transformer_parity_test.js` and the 64-case `memory_test.js` are unchanged and
pass. A 320px overflow introduced by the new figure captions was found by the
memory suite and fixed by letting the caption wrap.

## Rendered contrast, 2026-09-08

Reported by the user: the oracle series was invisible in dark mode. The cause
was the inactive legend state, not the hue. In sandbox mode there is no
generating process, so no oracle curve is drawn and its legend entry was
marked inactive with `opacity: 0.34` across the whole row. Composited, that
put the green at 1.93:1 on the dark ground and 1.51:1 on the light one, so the
entry explaining why the curve was missing was itself unreadable in both
themes. The inactive state now changes colour instead of fading: text and mark
drop to --ink-3, measured at 4.5:1 dark and 5.02:1 light, and the row says
"not plotted here".

`scripts/contrast_check.py` could not have caught this: it measures declared
colour tokens, and the token was fine. `scripts/ui_check.cjs` now also
measures rendered contrast, compositing each legend label through its
inherited opacity onto the page background, in sandbox mode and in both
themes. On its first run that new check immediately found a second fault of
the same family: the LIVE labels were drawing --s-act as text at 4.27:1 in
light mode. A series hue is measured as a graphical object at 3:1, but the
moment it becomes a word it has to clear 4.5:1. The swatch now carries the
series hue and the label stays ink, so both bars are met.

The reader-facing link to `requirements-audit.md` was removed from the page.
The audit is submission bookkeeping about a supplied requirements image, not
teaching material, and it stays in the repository as evidence rather than
sitting in the resources a learner is offered. Lowest rendered legend contrast
is now 4.57:1.
