# Baseline audit — 2026-09-08

The user authorized the full phase plan, including parallel agents and optional enhancements. The individual stop-after-phase instructions are superseded by that authorization. Work proceeds in this repository, preserving the numerical baseline.

## Evidence preserved

The starting commit is `a25bd355dae8489c6644d2ddb62d65a252d3bddf`. The original probe, JavaScript model, parity script, results, weights, and two reference fixtures have SHA-256 hashes and byte sizes in [baseline-evidence.json](baseline-evidence.json). No baseline model, weights, result, or reference fixture was regenerated in place.

The repository already existed, had an MIT license and README, and used `origin=https://github.com/jabssyyy/data-forge.git`. GitHub's public repository metadata confirmed public visibility and `has_pages=false` during the initial audit. The original README was incomplete and contained stale scientific copy. The master plan's missing-repository instructions are historical, not executable cleanup instructions.

## Numerical verification

`node parity_test.js` passed both trained and untrained fixtures before edits. Each compares 308 layer-token counts and 315,392 raw activation values:

| Gate | Trained | Untrained |
|---|---:|---:|
| Exact active-count mismatches | 0 | 0 |
| Exact zero-pattern disagreements | 0 | 0 |
| Scale-normalised activation error | 2.829e-7 | 4.843e-7 |
| Maximum CE error, bits | 1.171e-5 | 4.674e-7 |
| Token-0 active counts | 0 in each layer | 0 in each layer |

Node was v25.6.0; Python was 3.12.4; PyTorch 2.7.0 is available. Node timings are not browser/mobile performance claims.

The test originally reported CE error without bounding it, checked finiteness only for CE, and could pass after skipping one missing fixture. These gaps were closed: CE must differ by less than 1e-4 bits, raw values and logits must be finite, and either missing fixture fails the suite. Relative file reads now resolve against the script directory. Both models still pass. The numerical engine was not changed.

## Measurement contract

The canonical reference word is `mmgtfhhe`, drawn by `random.Random(99)` in the probe. The former UI default was `surprise`; its live numbers were not expected to reproduce the reference's exact percentages. The UI will start on the reference preset while allowing word edits.

An active neuron means `xy_sparse > 0`. Four heads of 256 neurons give a denominator of 1024, not 256. Raw JavaScript layout is `[layer][head*T*256 + token*256 + neuron]`.

Historical Python phase summaries include token 0. The UI already deliberately excludes it. We preserve both conventions explicitly rather than overwrite the original evidence:

| Layer-2 phase | Historical mean | Comparison/UI policy | Included positions |
|---|---:|---:|---|
| Warm-up | 18.1415% | 19.6533% | 1–12, excluding token 0 |
| Memorize | 15.7715% | 15.7715% | 13–20 |
| Repeat | 5.0834% | 5.0834% | 21–76 |

The reference memorize/repeat ratio remains 3.102572898799314. Exact index lists, denominators, trained and untrained summaries are in the evidence JSON. Repeat count 1 has no repeat observations and must show an unavailable mean/ratio.

CE is a separate alignment: predictor position `t` predicts target `t+1`; there are `T-1` values. `at_position` uses predictor phase; `of_target` uses target phase and is the displayed alignment. The first target position has no preceding model prediction in this sequence; the last predictor has no known next token. Activity's token-0 exclusion must not silently remove CE that predicts token 1. Training loss is in nats; displayed per-token CE is in bits.

## Decisions and source corrections

- Keep `bdh_probe.py` at the root, and fixtures at `probe/reference.json` and `probe/untrained_reference.json`.
- Keep the BDH-only headline exactly as requested. Warm-up remains a counterexample to a general activity/uncertainty relationship; cold-start is an untested hypothesis.
- Compare a bias-free ReLU Transformer hidden layer to BDH's gated product, without claiming algebra alone establishes a predictability cause.
- Count parameters rather than assuming matching budgets from shared weights: the requested conventional Transformer configuration has 71,680 versus BDH's 100,352.
- Document diagonal-0 versus diagonal-minus-1 masks, RoPE head dimensions, and the sampled data schedule. Equal helpers/seed alone do not imply equal minibatches.
- Use ReLU because it supports an informative exact-zero count, not because GELU's non-zero fraction is undefined.
- A fraction tolerance below 1/1024 effectively requires equal counts; it is not mathematically impossible. Keep explicit integer count and zero-pattern gates.
- Preserve historical documents as history; current README, artifact, evidence reports, and PDFs use verified source titles and measured numbers. Scientific source verification is recorded in `sources.md`.

## Reproduction safeguards

Full reruns go to isolated output paths; the shipped baseline files remain intact. Model initialization is reseeded by `build_model`. The training sampler consumes the global Torch RNG after that initialization, which matters when replaying data for another architecture. No instruction to move or delete files, initialize Git, or stage everything was executed.
