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
| 7 — Concept PDF | Complete | One page714 extracted words; visually checked |
| 8 — Blog PDF | Complete | Three pages1700 extracted words; visually checked |
| 9 — Deployment | Public preview verified; Pages pending | Immutable public release preview works without sign-in; Pages needs owner enablement |
| 10 — Final checks | Local and public preview checks complete; real phone pending | Browser, PDFs, fresh-clone training and public preview verified |
| 11 — Live Transformer | Complete locally | Both parity suites and actual mask/RoPE/layout mutations pass |
| 12 — Dual grids | Complete locally |616 token/layer/weight states checked for both models |

Original scientific data is immutable during this execution. Baseline hashes are in baseline-evidence.json. Latest decisions and final validation outcomes will be recorded here before handoff. No public deployment or real-phone check is claimed yet.

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
