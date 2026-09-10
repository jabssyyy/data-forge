# Evaluation guide

This guide maps the project to the **supplied Pathway PS.pdf**, rather than an inferred rubric. Page references below mean physical PDF pages: judging on page 11 (printed 09), deliverables on page 12 (printed 10), and the concept-summary guidance on pages 13–14. The original handout is retained locally as reference material.

The approved concept is **Sparse Non-Negative Activations**, listed on physical page 6. The central learning journey concerns the trained BDH memorize-to-repeat activity change. The memory lab is a supporting distinction between activity and context, not a second headline claim.

## Seven judging criteria — 100 points

The point values are the brief's rubric, not scores we award ourselves.

| Criterion | Points | Where to inspect | Boundary / defense question |
|---|---:|---|---|
| Technical correctness and depth | 25 | [Mechanism](https://jabssyyy.github.io/data-forge/#mechanism), [BDH implementation](../repo/bdh.js), [numerical tests](../repo/parity_test.js), [Transformer protocol](../repo/docs/transformer-protocol.md) | Explain `xy_sparse > 0`, target-aligned cross-entropy, shared depth weights and the excluded token-zero warm-up convention. The 3.10× value is a phase-mean ratio on one small checkpoint. |
| Technical ownership and live defense | 15 | [Component map and reproduction](../repo/README.md), [defense notes](../repo/docs/defense-notes.md), Python training and reference tensors in [probe](../repo/probe/) | Predict what layer 0, random weights or repeat count one will do, then show the code path. Team understanding must be demonstrated live; passing tests does not establish it. |
| Learning effectiveness | 15 | [Root README](../README.md), on-page guide and Questions, [sixty-second check below](#sixty-second-learning-check) | State learner prerequisites, reproduce the claim, and have the learner explain why the warm-up is a counterexample to a simple confidence interpretation. No learner-study score is claimed. |
| Interactive substrate and honesty | 15 | [Live artifact](https://jabssyyy.github.io/data-forge/), [app controller](../repo/app.js), [signal definitions](../repo/README.md#what-the-signals-mean) | Change a real variable and compare activity, model error and analytic expectation. Distinguish live inference, fixed weights, precomputed comparisons, synthetic input and playback. Speed depends on hardware; timing evidence is not a universal latency guarantee. |
| BDH or BDH CQ integration and evidence discipline | 10 | [Concept summary](concept-summary.pdf), [source ledger](../repo/docs/sources.md), [memory explanation](../repo/docs/memory-explainer.md) | BDH's product gate is central to the measurement. Identify the independent toy scale, published equations versus local measurements, native context versus hypothetical decay, and BDH-CQ's related but unimplemented role. |
| Craft, robustness, accessibility, and provenance | 10 | [Setup](../README.md#run-locally), [licenses](../repo/docs/licenses.md), keyboard guide, responsive light/dark UI, [verification index](verification.md) | Inspect load/failure states, readable labels, keyboard controls and phone-sized layouts. Retain sources and assistance disclosure; distinguish browser emulation from real-device testing. |
| One-page concept summary | 10 | [One-page PDF](concept-summary.pdf), [editable source](sources/concept-summary.md) | Self-contained mechanism, architecture comparison, evidence classification, strengths and limits, competitive context, maturity assessment, primary sources and accurate BDH/BDH-CQ roles. |
| **Total** | **100** | | |

## Required deliverables

| Requirement from the brief | Package location |
|---|---|
| Explorable artifact with a meaningful input/variable and observable consequence | [Public app](https://jabssyyy.github.io/data-forge/), [runnable source](../repo/) |
| Public URL without sign-in | https://jabssyyy.github.io/data-forge/ |
| Public source repository | https://github.com/jabssyyy/data-forge |
| Blog as a separate PDF | [blog.pdf](blog.pdf) |
| Readable one-page concept summary; approximately 500–950 words recommended | [concept-summary.pdf](concept-summary.pdf) |
| Complete README and setup instructions | [Package README](../README.md), [technical README](../repo/README.md) |
| Audience, prerequisites, learning objectives, architecture and major component roles | Both READMEs and the on-page guide |
| Live / precomputed / synthetic / animated distinctions | [Signal definitions](../repo/README.md#what-the-signals-mean), labels beside the figures |
| Reproduction instructions | [Numerical checks and offline training](../repo/README.md#reproduce-without-overwriting-evidence) |
| At least three primary papers from 2022–2026 directly relevant to the selected concept | BDH (2025), ReLU Strikes Back (2023), Spark Transformer (2025); [source ledger](../repo/docs/sources.md) and citations beside claims |
| Source and license record for code, data, weights, graphics, fonts and reused components | [Licenses and component inventory](../repo/docs/licenses.md), full retained notices |
| AI assistance and reused/forked work disclosed in README | [README disclosure](../README.md#research-and-provenance) |
| Substantive BDH/BDH-CQ module; independent model clearly identified | Mechanism, live BDH, memory lab, PDFs and provenance statements |
| Supporting video | [Three-minute narrated demo](demo/demo-final.mp4), [captions](demo/demo-final.srt); supporting material, not a substitute for the interactive artifact |

## Sixty-second learning check

1. **0–10 seconds:** read the preset claim and predict what repetition should do.
2. **10–25 seconds:** start the guide, add repetitions and read the trained layer-2 phase means: about 15.8% to 5.1%.
3. **25–40 seconds:** test layer 0, then untrained layer 2. The large reduction does not persist in either control.
4. **40–50 seconds:** compare prediction error with activity. The trained Transformer predicts this input better; both models use context. The predictable warm-up remains highly active.
5. **50–60 seconds:** explain back: what counts as active, what was held fixed, and what the observation does not prove.

Expected understanding: the measured BDH coordinate is a product of two nonnegative signals; both must be positive. Training and depth matter in this checkpoint. Fewer active coordinates alone do not establish better prediction, less compute, superior architecture or erased memory.

## Evidence discipline and remaining human responsibilities

- Published equations, developer-reported paper benchmarks, this local measurement and numerical agreement checks are distinct evidence levels.
- This artifact does not implement BDH-CQ, demonstrate natural-language competence or measure sparse-kernel speedups. It is not an official BDH checkpoint.
- No deployment partnership is presented as independent scientific validation. No numeric maturity score or benchmark win is invented.
- The team must conduct its live defense and own every major component and claim. We do not claim that repo organization proves technical ownership or educational effectiveness.
- Publishing the repo/site is separate from submitting the event portal or final ZIP. Keep API keys, local recording caches and private working notes out of that ZIP.
