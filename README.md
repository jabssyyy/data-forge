# Sparsity Is Not a Budget

> **Claim:** *In a trained BDH, the fraction of active neurons in layer 2 falls roughly 3× the moment the next letter becomes predictable — with the same weights, the same input length, and no sparsity setting touched anywhere.*

Interactive educational instrument for **DataForge 2026** (Kharagpur Data Analytics Group, IIT Kharagpur) · **Pathway Track** · **Topic #22: Sparse Non-Negative Activations**.

---

## 1. Context & Overview

This project is an interactive explainer and empirical instrument demonstrating **native, adaptive activation sparsity** in Baby Dragon Hatchling (BDH), a recurrent attention-free architecture introduced by Pathway ([Kosowski et al., 2025, arXiv:2509.26507](https://arxiv.org/abs/2509.26507)).

Unlike standard Transformers or ReLU networks where sparsity is either constrained by fixed top-$k$ budgets or artificial penalties, BDH exhibits an emergent dynamical property: internal activation sparsity naturally deepens when inputs become predictable.

> **Important Disclosure:** This project is an independent reimplementation at 1/64th the paper's neuron count ($n=1024$ vs $n=65536$). It is not an official BDH model.

---

## 2. Target Audience & Learning Objectives

### Target Audience
A data scientist or deep learning student who has trained neural networks and understands basic concepts (activations, ReLU, layer depth, next-token prediction, cross-entropy loss), but has not necessarily read post-Transformer literature. No familiarity with RoPE, state-space models, or linear attention is assumed.

### Learning Objectives
After 60 seconds with this artifact, the learner can:
1. **State the core claim** in their own words: sparsity in BDH is dynamic and emergent, not an externally enforced budget.
2. **Predict the consequence** on active neuron fraction when the repeat count of a pattern increases.
3. **Identify the boundaries of the claim**: name where it breaks (layer 0 shows no effect) and where measurement diverges from oracle surprisal (the warm-up phase).
4. **Point to the governing mechanism**: connect the behavior to BDH's recurrent gating formulation (Definition 4 in Kosowski et al., 2025).

---

## 3. Architecture & Artifact Breakdown

Every piece of computation in the artifact is strictly categorized and displayed:

| Component | Nature | Role & Implementation |
|---|---|---|
| **BDH Forward Pass (`bdh.js`)** | `LIVE` | Client-side pure JavaScript forward pass with `Float32Array`. Runs in <200 ms on every parameter tweak. No remote server, no pre-rendered animations. |
| **Oracle Surprisal** | `ANALYTIC` | Exact closed-form ground truth computed directly from the sequence generator: 0 bits for warm-up, $\log_2(26) \approx 4.70$ bits for novel tokens, 0 bits for repeated tokens. |
| **Model Cross-Entropy** | `LIVE` | Per-token loss $-\log_2 p(\text{target})$ computed live by `bdh.js` to illustrate where internal confidence tracks surprisal. |
| **Model Weights** | `PRECOMPUTED` | Shipped as JSON arrays trained once on a single CPU core using the synthetic protocol. |
| **Letter Corpus** | `SYNTHETIC` | Purpose-built synthetic benchmark from BDH Paper §6.4: 13 fixed warm-up characters followed by an 8-character word repeated across cycles. |

### Payload & Weight Footprint
The model runs with $n=1024$ internal neurons, embedding dimension $d=32$, and $L=4$ layers with shared weights (100,352 total parameters).
The weight payload consists of:
- `weights_trained.json`: **1.41 MB**
- `weights_untrained.json`: **1.49 MB**
- **Total payload**: **~2.9 MB** JSON (uncompressed).

---

## 4. The Governing Mechanism

In BDH ([Kosowski et al., 2025](https://arxiv.org/abs/2509.26507), Definition 4), the token representation passes through a dual-encoder gated activation:

$$\mathbf{y}_t = \text{ReLU}(\mathbf{D}_x \mathbf{x}_t) \odot \text{ReLU}(\mathbf{D}_y \mathbf{x}_t)$$

In the official codebase, $\mathbf{D}_y$ is implemented as `encoder_v`. The elementwise product of two non-negative activations ensures that a neuron fires if and only if **both** projections activate simultaneously.

As representations align with predictable repeated sequences, internal representations stabilize and compress ([Herrmann, Csordás, & Schmidhuber, 2025, arXiv:2503.13431](https://arxiv.org/abs/2503.13431)), driving the active neuron fraction down by ~3.3–3.5× in higher layers. This contrasts sharply with fixed-sparsity methods in Transformers ([You et al., 2025, Spark Transformer, arXiv:2506.06644](https://arxiv.org/abs/2506.06644)), where the computational budget cannot dynamically contract on easy tokens.

---

## 5. Seven Disclosed Limitations

1. **Layer 0 shows no effect**: Layer 0 acts as a feature encoder where activity remains flat (~10–14%). The sparsity drop is emergent in deeper layers (Layers 2 & 3), matching §6.4 of the BDH paper.
2. **64× Neuron Shrink**: Shrunk from $n=65536$ to $n=1024$. The absolute activation percentage is higher (~16.7% vs ~5%), but the **3.3×–3.5× relative collapse ratio** reproduces faithfully.
3. **Synthetic Task Only**: Evaluated on Section 6.4's synthetic repeating-fact protocol, not natural language.
4. **Untrained Control**: When toggled to untrained random weights, the collapse disappears, demonstrating that the drop is learned dynamics rather than an algebraic artifact of ReLU.
5. **No State/KV-Cache in JS**: The browser runs the full sequence forward pass directly via lower-triangular causal attention.
6. **Token 0 Attend-to-Nothing**: Token 0 attends to zero previous tokens, giving exactly 0 active neurons by causal definition.
7. **Warm-up Divergence**: During the 13 fixed warm-up tokens, cross-entropy drops as the model identifies position, but neuron activity remains elevated, demonstrating that activation sparsity does not mirror cross-entropy everywhere.

---

## 6. Reproduction & Parity Testing

### Running the Local Web App
No build tools, bundlers, or package installations required:
```bash
python -m http.server 8000
```
Visit `http://localhost:8000` in any modern web browser.

### Verifying Parity with PyTorch
Run the parity test suite:
```bash
node parity_test.js
```
Expected output:
- **Trained weights**: Max absolute error $< 1\times 10^{-5}$, active count mismatches: `0 / 308`, exact zero agreements: `0 disagreements` (**PASS**).
- **Untrained weights**: Active count mismatches: `0 / 308` (**PASS**).

### Reproducing Training & Weight Export
To retrain the probe from scratch and export weights:
```bash
python bdh_probe.py --export-weights weights_trained.json
```

---

## 7. Primary References

1. **Kosowski et al. (2025)**. *Dragon Hatchling: A Fast and Memory-Efficient Non-Transformer Architecture*. [arXiv:2509.26507](https://arxiv.org/abs/2509.26507).
2. **Herrmann, Csordás, & Schmidhuber (2025)**. *Input Complexity and Predictability in Recurrent Representations*. [arXiv:2503.13431](https://arxiv.org/abs/2503.13431).
3. **You et al. (2025)**. *Spark Transformer: Dynamic Sparsity in Deep Architectures*. [arXiv:2506.06644](https://arxiv.org/abs/2506.06644).
4. **Engdahl et al. (2026)**. *BDH-CQ: Context-Query Architectures for Extended Reasoning*. (BDH-CQ is a later reasoning system in the same lineage; the sparse-activation effect demonstrated here is a native BDH result).

---

## 8. AI Assistance & Team Disclosure

- **Team**: Jabin M, Anton, Dev (Registered participants, DataForge 2026, IIT Kharagpur).
- **AI Assistance Disclosure**: In accordance with DataForge & Pathway track requirements, Anthropic Claude was used for architectural planning, math derivation cross-verification, and code implementation support. All underlying math, probe reproduction, parity test verification, and live defenses are owned and understood by the team.

## 9. License

This project is open-source under the [MIT License](LICENSE).
