# Sparsity Is Not a Budget

> **In a trained BDH, the fraction of active neurons in layer 2 falls roughly 3× the moment the next letter becomes predictable — with the same weights, the same input length, and no sparsity setting touched anywhere.**

[Public source repository](https://github.com/jabssyyy/data-forge) · [Open the public demo](https://rawcdn.githack.com/jabssyyy/data-forge/68780b82834ae3d51334bab8a54c23a43d48719d/index.html) · [Concept PDF](docs/concept-summary.pdf) · [Blog PDF](docs/blog.pdf)

The public demo is an immutable release snapshot served by githack; first-time visitors click its “Open the page” confirmation. No sign-in is required. Both live models and PDF downloads were checked in an unauthenticated browser. GitHub Pages deployment awaits the repository owner enabling **Settings → Pages → Source: GitHub Actions**; then rerun the deployment workflow. [Release checks](docs/submission-checklist.md).

A static educational instrument for DataForge's locally specified Pathway topic, sparse nonnegative activations. **Not an official BDH model.** This independent, small synthetic-task implementation follows [Kosowski et al., *The Dragon Hatchling: The Missing Link between the Transformer and Models of the Brain* (2025)](https://arxiv.org/abs/2509.26507), especially Definition 4 and §6.4. It does not establish a result about natural language or BDH-CQ.

Start with the trained layer-2 preset, inspect a token's 1,024 neurons, then try layer 0 and random weights. The guide uses those real controls. You can change the word, repeat count, layer, and weight set; token playback inspects computed arrays. This is for students and practitioners who understand ReLU, next-token prediction, and cross-entropy. The learning objectives are to predict repetition behavior, identify counterexamples, and connect the measurement to the gate.

## Run locally

No build step, backend, browser training, or JavaScript dependencies are required.

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. Serve through HTTP so relative JSON fetches work. Browser computation uses `Float32Array` in `bdh.js`; `app.js`, `index.html`, and `style.css` provide the controls and charts. Default inference starts after weights load. Google Fonts is optional, with system font fallbacks.

## Component map

| Component | Role |
|---|---|
| `index.html`, `style.css`, `app.js` | Accessible static page, controls, guide, chart, dual grids, data table, caching and playback |
| `bdh.js`, `transformer.js` | Local forward passes using exported weights; no browser training |
| `memory.js` | Reconstructs centered BDH context projections and verifies their attention read |
| `memory-lab.js`, `graph-view.js`, their CSS | Memory controls, signed graph and edge inspector, selected-token interpretation, hypothetical decay comparison |
| `bdh_probe.py`, `probe/tiny_transformer.py` | Offline synthetic training, random controls, measurements and exports |
| `weights*.json`, `results*.json`, `probe/*reference.json` | Fixed checkpoints, canonical measurements and Python reference tensors |
| `parity_test.js`, `transformer_parity_test.js`, `memory_test.js` | Numerical agreement, failure-detection and state-reconstruction checks |
| `scripts/browser*_check.cjs`, `scripts/memory_browser_check.cjs` | Browser interaction and viewport verification; separate from numerical validation |
| `scripts/build_pdfs.py`, `docs/*.md` | Editable deliverables, references, licenses, reproducible PDF exports and evidence |
| `scripts/build_site.py`, `.github/workflows/pages.yml` | Static release allowlist and GitHub Pages build/deployment workflow |

## What the signals mean

| Label | Meaning |
|---|---|
| LIVE | Browser-computed BDH activity/CE and Transformer activity for current inputs |
| ANALYTIC | Oracle surprisal under the known generator: 0 bits for fixed/repeated letters, log2(26) ≈ 4.70 bits for novel random letters |
| SYNTHETIC | Fixed warm-up and repeated random-letter task; a typed English-looking word remains a synthetic input |
| PRECOMPUTED | Trained/random exported weights and the separate offline Transformer evaluation |
| ANIMATED | Playback through already computed token activations; no fresh inference on each frame |

The dashed Transformer activity curve and two synchronized grids use the same token, layer, sequence, and trained/random selection. BDH grid cells represent `xy_sparse > 0`, with four heads of 256 coordinates in head-major order. Their positions imply no semantic correspondence or synaptic wiring. Transformer cells independently represent `ReLU hidden > 0`; cell positions imply no cross-model neuron correspondence. Selecting a token changes the view into the computed tensor; changing sequence or weights requires inference.

## Evidence and boundaries

The shipped seed-0 baseline uses n=1,024, d=32, four layers, four heads, vocabulary 32, and weights shared across depth: **100,352 parameters**. Training is 2,200 AdamW steps, batch four, sequence length 154, learning rate 0.003. The canonical word is `mmgtfhhe`; each evaluation contains 13 warm-up letters followed by eight copies of this word (77 tokens).

| Baseline measurement | Memorize | Repeat | Ratio |
|---|---:|---:|---:|
| Trained BDH, layer 2 | 15.7715% | 5.0834% | 3.102573× |
| Trained BDH, layer 0 | 12.8418% | 13.9056% | 0.923501× |
| Random BDH, layer 2 | 24.8291% | 23.9798% | 1.035416× |

Activity means exclude structurally silent token 0: warm-up/memorize/repeat denominators are 12/8/56. Original `results.json` includes token 0 in warm-up: 18.1415%; the visible convention gives 19.6533%. Neither convention changes the memorize/repeat ratio. Repeat count one has no repeat mean or ratio. Layers are zero-indexed.

Cross-entropy has separate alignment: predictor t scores target t+1, giving 76 known predictions. Training loss is in nats; chart CE is in bits and phase summaries use target phase. Warm-up target CE is **0.112845 bits**, lower than repeat's **0.766147 bits**, despite higher activity. This falsifies a simple account that activity tracks model uncertainty everywhere. Cold-start state establishment is an **untested hypothesis**. [Herrmann, Csordás, and Schmidhuber, *Measuring In-Context Computation Complexity via Hidden State Prediction* (2025)](https://arxiv.org/abs/2503.13431) provides relevant caution about next-token loss as a computation metric; we do not implement its PHi metric.

Further limitations: one seed and one canonical cold cycle; 64× fewer neurons than the paper's Figure 14 model; synthetic rather than natural-language training; layer 0 lacks the comparable drop; browser execution recomputes full causal sequences without a persistent state cache; counts do not measure sparse-kernel speedups, energy, or interpretable synaptic state. The paper reports different absolute percentages at a different scale; the local observation is not a replication of every paper condition.

## Mechanism and Transformer control

Definition 4 gives **y = ReLU(D_y LN(a*)) ⊙ x**. Both nonnegative factors must be positive for a coordinate to be active. In code, D_x=`encoder`, D_y=`encoder_v`, E=`decoder`, and measured y=`xy_sparse`. This structural rule does not prove a confidence-driven causal explanation.

[Mirzadeh et al., *ReLU Strikes Back: Exploiting Activation Sparsity in Large Language Models* (2023)](https://arxiv.org/abs/2310.04564) empirically study ReLU activation sparsity in language models and ways to exploit it. Their efficiency results are not speedups measured by this demo. Together with BDH (2025) and Spark Transformer (2025), this supplies three recent primary papers directly studying the selected sparsity concept; Herrmann is additional context.

The simplified bias-free ReLU hidden activation `h=ReLU(zW1)` is compared with the product. The complete original Transformer FFN includes output projection and biases; see [Vaswani et al. (2017), equation 2](https://arxiv.org/html/1706.03762v7#S3.SS3). [You et al., *Spark Transformer: Reactivating Sparsity in FFN and Attention* (2025)](https://arxiv.org/abs/2506.06644) uses explicit top-k sparsity; this is one design, not a property of every Transformer and not our control architecture.

**Offline training and PRECOMPUTED evaluation table:** one trained and one random ReLU Transformer, d=32, four shared depths/heads, hidden width 1,024, parameter-free LayerNorm, 71,680 parameters. The sole 2,200-step seed-0 run passes the predeclared predictive-comparability gate: evaluation CE 0.638092 bits and target-repeat CE 0.123844 bits. Trained layer 2 averages 1.9775% versus 1.2503% activity, ratio 1.581590×; random layer 2 gives 0.998273×. The Transformer also becomes sparser here. Different parameter counts, attention operators/masks, RoPE widths (8 versus 256), and residual paths prevent isolating gating as the cause. The sampled schedule replays baseline code; historical batch indices were not archived independently. See [protocol](docs/transformer-protocol.md) and [results](docs/transformer-results.md). Fixed offline results do not follow sandbox controls. Separately, `transformer.js` computes a LIVE activity curve and grid using the same current inputs as BDH. Both trained and random Transformer ports pass exact count/zero-pattern and numerical parity via `node transformer_parity_test.js`; this does not remove the experimental confounds.

[Engdahl et al., *BDH-CQ: In-Context Learning with Recurrent Latent Reasoning* (2026)](https://arxiv.org/abs/2608.09888) describes a later system. This probe neither implements nor evaluates it; no checkpoint availability claim is made.

## A separate memory lab

The memory graph answers a different question from the activity grid: what projected context is available to read before this token? Trained weights stay fixed; context accumulates during a sequence; an inactive neuron does not imply a deleted memory. Signed edges are a centered projection of the computed BDH working state for a selected head, before the final normalization scale and gate. They are not literal paper sigma, semantic concepts, or learned weight changes. The selected 12-by-12 view shows a subset; absent edges may simply be filtered out.

The lab compares the actual model (lambda=1) with an explicitly **hypothetical fading-memory intervention** (lambda=0.96), recomputing all heads and layers with unchanged weights. The original checkpoint has no native decay gate. Compare measured prediction error: discounting earlier input can help or hurt, and a changing edge is not proof of selective erasure. The original sparsity chart remains the unmodified model. [Memory explanation and exact equations](docs/memory-explainer.md).

Numerical verification passes 64 weight/layer/head/decay cases with maximum normalized read error 3.00e-7. Lambda=1 instrumentation preserves baseline logits, activations, and counts exactly. Run `node memory_test.js`; see [measurement evidence](docs/memory-verification.json). This numerical verification is separate from browser interaction testing and scientific claims about forgetting.

## Reproduce without overwriting evidence

Tested tools: Python 3.12.4, PyTorch 2.7.0, Node 25.6.0. Install training dependencies into an environment of your choice; PDF dependencies are separate.

```sh
python3 -m pip install -r requirements.txt
node parity_test.js
node transformer_parity_test.js
mkdir -p /tmp/dataforge-reproduction
python3 bdh_probe.py --out /tmp/dataforge-reproduction/results.json --export-weights /tmp/dataforge-reproduction/weights_trained.json --dump-reference /tmp/dataforge-reproduction/reference.json
python3 bdh_probe.py --untrained --export-weights /tmp/dataforge-reproduction/weights_untrained.json --dump-reference-untrained /tmp/dataforge-reproduction/untrained_reference.json
```

The untrained command exports random weights/reference only: it does not write an `--out` measurement file. The trained command performs the complete training run. Historical project records estimate about four minutes on one CPU core; this is not a new runtime measurement or a browser timing guarantee. Uncompressed BDH weights total **2,895,138 bytes** (trained 1,405,607; random 1,489,531). Mobile timing depends on device and input length.

Parity requires exact active counts and zero patterns, finite values/logits, scale-normalised activation error below 1e-4, and CE error below 1e-4 bits. Both baseline fixtures pass; missing fixtures fail. Numerical details and hashes are in [baseline audit](docs/baseline-audit.md). Running parity checks shipped evidence; it does not itself retrain the model. A fresh clone of the original public commit was retrained on the current macOS ARM/Python 3.12.4/PyTorch 2.7.0 environment: its layer-2 ratio was about 3.37× rather than the shipped 3.10×, with final minibatch loss 0.4628 nats. Training is not bit-identical across platforms/runtime settings; the original evidence remains unchanged. See [reproduction record](docs/reproduction-check.json).

Transformer reproduction commands and schedule-output caveats are in [its results report](docs/transformer-results.md). To avoid all incidental outputs touching shipped data, run training in an isolated repository copy. Contract tests:

```sh
python3 -m unittest discover -s probe -p test_tiny_transformer.py
```

## Deliverables, sources, and credits

- [One-page concept PDF](docs/concept-summary.pdf) · [editable source](docs/concept-summary.md)
- [Investigation blog PDF](docs/blog.pdf) · [editable source](docs/blog.md)
- [Verified source ledger](docs/sources.md), [licenses and AI disclosure](docs/licenses.md), [execution status](docs/execution-status.md)

Regenerate both PDFs from the repository root:

```sh
python3 -m pip install -r requirements-docs.txt
python3 scripts/build_pdfs.py
```

The generator uses editable Markdown, linked references, and standard PDF fonts. PDF counts and visual checks are recorded in [PDF verification](docs/pdf-verification.md).

Existing project attribution names Jabin M, Anton, and Dev. Historical notes credit Claude assistance; this build additionally uses Codex and parallel helper agents for implementation, source checking, documentation, and tests. These are recorded automated checks, not a claim of unrecorded human verification. Project code is [MIT licensed](LICENSE); the [upstream BDH notice](docs/upstream-bdh-LICENSE.txt) is retained. Official current event rules and external submission completion are not established by local deliverables alone.

The supplied requirements image is mapped to evidence and remaining release checks in [requirements-audit.md](docs/requirements-audit.md). The image itself is not a project asset and is not included in the release.
