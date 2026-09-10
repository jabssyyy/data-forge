# Sparsity Is Not a Budget

An interactive educational resource for **DataForge 2026 — Pathway Track**, on **Sparse Non-Negative Activations**.

**Claim:** On our shipped synthetic-task checkpoint, trained BDH layer 2 uses 15.77% positive activations on a word's first appearance and 5.08% on repetitions: a 3.10× reduction without an explicit activation budget. This is a within-model observation, not a claim that BDH outperforms Transformers.

**[Open the live artifact](https://jabssyyy.github.io/data-forge/)** · **[Evaluation guide](documentation/evaluation-guide.md)** · **[Concept summary PDF](documentation/concept-summary.pdf)** · **[Blog PDF](documentation/blog.pdf)** · **[Narrated demo](documentation/demo/demo-final.mp4)**

## Start here

The intended learner knows ReLU, next-token prediction and basic cross-entropy. After using the resource, they should be able to reproduce the activity change, challenge it with layer-zero and untrained controls, distinguish prediction quality from activity, and explain the BDH gate and the limits of the experiment.

In about sixty seconds: open the preset, start the guide, add repetitions, inspect the layer-2 ratio, then try layer 0 and untrained weights. Ask: **does lower activity mean better predictions, less computation, or erased memory?** The answer is not established by activity counts; the page shows why.

## Package layout

| Folder | Contents |
|---|---|
| [`repo/`](repo/) | Runnable application, checkpoints, measurements, training code, numerical references, tests, build scripts and technical README |
| [`documentation/`](documentation/) | Required PDFs, editable document copies, exact judging rubric with evidence links, live-defense material and the three-minute demo |

The PDFs also remain in `repo/docs/` because the live app links to those downloads. GitHub Pages publishes the application at the same public URL. Internal prompts, credentials, old exports and recording caches are excluded from Git and the submission.

## Run locally

Requires Python 3 for a static HTTP server. The browser application has no installation or build step.

```sh
cd repo
python3 -m http.server 8000
```

On Windows, `python -m http.server 8000` also works when Python is installed under that command. Open **http://localhost:8000**. Optional Google Fonts have system fallbacks. The browser fetches the bundled JSON checkpoints; it does not train a model.

## Architecture and evidence

| Component | Role / evidence type |
|---|---|
| `repo/index.html`, `app.js`, styles and `ui.js` | Guided experiment, chart, token inspection, controls, keyboard access and sandbox |
| `repo/bdh.js`, `transformer.js` | **Live** Float32 forward passes for the selected input and fixed weights |
| `repo/weights_*.json` | **Precomputed** trained or seed-0 random parameters; fixed during browser inference |
| `repo/results*.json` | **Precomputed** canonical measurements and offline control results |
| Sequence generator and oracle | **Synthetic** letter task with **analytic** expected surprisal, shown beside model cross-entropy |
| Token playback | **Animation of computed states**, not new training or fresh inference per frame |
| `repo/memory.js`, `memory-lab.js`, `graph-view.js` | Measured projection of contextual state; optional decay is explicitly hypothetical |
| `repo/bdh_probe.py`, `probe/` | Offline training, deterministic schedules and reference tensors |
| `repo/*test.js`, `scripts/` | Numerical parity, interaction checks and reproducible build tooling |

Both models use context. On the canonical trained input, the Transformer has lower mean prediction error: 0.638 versus BDH's 1.122 bits. Different parameters, attention rules and activation mechanisms prevent a controlled architecture-wide ranking. The gate is a mechanism; its existence alone is not causal proof of the repetition effect. This is an **independent small reimplementation, not an official BDH model**. BDH-CQ is discussed as related research and is not implemented here.

## Verify and reproduce

From `repo/`, with Node.js installed:

```sh
node parity_test.js
node transformer_parity_test.js
node memory_test.js
python3 scripts/build_site.py
```

The parity suites check shipped Python reference tensors, including exact activity counts and zero patterns. They do not retrain the model. Training, PDF-generation dependencies, commands, component details and cross-platform reproduction limits are in the [technical README](repo/README.md). GitHub Actions repeats numerical checks and publishes the allowlisted site.

## Research and provenance

Three primary papers from the brief's 2022–2026 window directly support the selected topic:

- Kosowski et al. (2025), [The Dragon Hatchling](https://arxiv.org/abs/2509.26507): nonnegative gated activity; Definition 4 and the synthetic experiment in §6.4/Figure 14.
- Mirzadeh et al. (2023), [ReLU Strikes Back](https://arxiv.org/abs/2310.04564): empirical activation sparsity in ReLU language models. Its efficiency results are not measured speedups of this demo.
- You et al. (2025), [Spark Transformer](https://arxiv.org/abs/2506.06644): explicit top-k sparsity as a contrasting design, not a property of every Transformer.

See the [source ledger](repo/docs/sources.md) for locations, additional sources and claim boundaries, and [licenses and provenance](repo/docs/licenses.md) for code, data, weights, graphics, fonts and reused components.

**Assistance disclosure:** Claude and OpenAI Codex assisted planning, implementation, research cross-checking, documentation and automated verification. The demo uses an ElevenLabs-generated George voice. The team is responsible for the implementation and claims.

Project attribution: Anton Gilchrist, Jabin Joseph, and Dev Arjun. Project code uses the [MIT license](LICENSE); the [upstream Pathway MIT notice](repo/docs/upstream-bdh-LICENSE.txt) is retained. Original research and third-party fonts retain their own attribution and licenses.
