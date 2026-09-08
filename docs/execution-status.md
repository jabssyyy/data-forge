# Execution status

User authorization: execute the entire PHASE-PROMPTS.md plan, use parallel helper agents, and improve the UI thoroughly. Phase-boundary pauses are superseded. Scientific validity and truthful completion checks remain binding.

| Phase | Status | Evidence / work |
|---|---|---|
| 0 — Baseline | Complete | baseline-audit.md; preserved hashes; strengthened parity |
| 1 — Equations | Complete | Verified structural comparison and claim-adjacent citations |
| 2 — Transformer offline | Complete | Predeclared gate passed, trained1.581590× / random0.998273× |
| 3 — BDH grid | Complete | Every cell from raw verified product; synchronized scrubbing |
| 4 — Guide | Complete | Canonical1→8, layer0, restored layer2 untrained; manual cancellation |
| 5 — UI craft | Complete locally | Light/dark,380/768/1440px, keyboard/loading fixes, browser-verification.json |
| 6 — Documentation | Complete | README, requirements, sources/licenses/AI disclosure |
| 7 — Concept PDF | Complete | One page700 extracted words; visually checked |
| 8 — Blog PDF | Complete | Three pages1715 extracted words; visually checked |
| 9 — Deployment | Public preview verified; Pages pending | Immutable public release preview works without sign-in; Pages needs owner enablement |
| 10 — Final checks | Local and public preview checks complete; real phone pending | Browser, PDFs, fresh-clone training and public preview verified |
| 11 — Live Transformer | Complete locally | Both parity suites and actual mask/RoPE/layout mutations pass |
| 12 — Dual grids | Complete locally |616 token/layer/weight states checked for both models |
| 13 — Memory graph and interpretation | Complete locally | 64 numerical cases; native/decay graph, histories, measured prediction interpretation; release-package browser checks |
| 14 — Supplied image requirements | Complete locally | requirements-audit.md; three directly relevant recent primary papers, README component inventory, complete disclosures |

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
