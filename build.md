# build.md — "Sparsity is not a budget"

**DataForge 2026 · Pathway Track · Topic #22 (Sparse Non-Negative Activations)**
**Last updated:** 2026-09-08
**Changelog:** v1 — initial build specification

**Purpose of this file:** the single source of truth for *what gets built*. Decisions and event context live in `context-dataforge.md`; company/PS/BDH research lives in `pathway.md`; the probe experiment lives in `probe.md`.

> **Timing note.** The system clock reads 8 Sep 2026 and the Unstop stage ends 8 Sep 11:59 PM IST. Jabin has confirmed he is managing the deadline. This plan is therefore written in **hours of work**, not calendar days, so it can be compressed or spread as needed. Critical path is Phase 1 → 2 → 3; Phases 4–5 are writing and can overlap.

---

## 1. The claim (locked)

> **In a trained BDH, the fraction of active neurons in layer 2 falls roughly 3× the moment the next letter becomes predictable — with the same weights, the same input length, and no sparsity setting touched anywhere.**

**Why this is falsifiable:** a learner can attempt to break it — find predictable input where activity stays high, or find the setting that "caused" the drop. They will fail in layer 2 (the claim holds) and succeed in layer 0 (the claim's boundary). Both outcomes teach.

**Scope of the claim — state this explicitly in the artifact.** The claim is about the **memorize → repeat** transition. It is *not* a claim that activity tracks oracle surprisal everywhere; see §9, Limitation 7, which is the artifact's central honest gap.

**Source:** BDH paper (arXiv 2509.26507) §6.4 + Fig. 14. Reported there: layer 2 shows 4.0–7.5% non-zero during memorization, ~2.5% during repetition, at n=65536.

---

## 2. Audience, prerequisites, objectives

**Audience (one person, named):** a data scientist or DL student who has trained a neural network and knows what an activation is, but has never read a post-Transformer paper.

**Assumed:** activation, ReLU, layer, next-token prediction, cross-entropy loss.
**Explicitly NOT assumed:** attention math, RoPE, linear attention, Hebbian learning, state-space models.

This definition is load-bearing — it is what licenses cutting RoPE frequency buckets (Fig. 14b) from scope.

**Learning objectives.** After 60 seconds the learner can:
1. State the claim in their own words.
2. Predict what happens to the meter when they raise the repeat count.
3. Name one place the claim fails (layer 0) and one place truth and measurement diverge (warm-up).
4. Point to the single equation that causes the effect.

---

## 3. The artifact — full spec

One page. No router, no tabs except the sandbox. Opens mid-run with no Run button (PS: "Catchy").

### 3.1 Layout (top to bottom)

| Region | Content |
|---|---|
| **Claim bar** | The one sentence from §1, always visible. |
| **Main chart** | Three curves over token position (x-axis = token 0…T). |
| **Controls** | Four controls, described below. |
| **Mechanism panel** | Definition 4, one equation, three sentences. |
| **Honesty panel** | The seven disclosures from §9, always visible (not a collapsed accordion). |
| **Sandbox tab** | Free letter entry, clearly labelled off-distribution. |
| **Footer** | Sources, licenses, AI disclosure link, repo link. |

### 3.2 The three curves (this is the "truth beside estimate" requirement)

| # | Curve | Definition | Live or computed? |
|---|---|---|---|
| 1 | **Oracle surprisal** (truth) | Analytic, from the generating process: warm-up letters = 0 bits (deterministic); the 8 novel letters = log₂(26) = 4.70 bits each; every repeated letter = 0 bits. | Computed in JS from the sequence definition. No model involved. |
| 2 | **Model cross-entropy** | Per-token −log p(next token) from the trained model, in bits. | Live, from the JS model. |
| 3 | **Active neuron fraction** (the claim) | Fraction of the n=1024 neurons with a non-zero entry in `xy_sparse` at the selected layer. | Live, from the JS model. |

Curve 1 is the ground truth. Curve 3 is the claim. Curve 2 explains where curve 3 departs from curve 1. **Every gap between these curves is a teaching moment, not an error.**

### 3.3 The four controls (and nothing else)

| Control | Range | Maps to | Why it earns its place |
|---|---|---|---|
| **Layer** | 0, 1, 2, 3 | which layer's `xy_sparse` is measured | Breaks the claim on demand (layer 0). |
| **Repeat count** | 1–8 | number of times the 8-letter word repeats | The learner *causes* the drop themselves. |
| **The word** | 8 letters, a–z | the memorized "fact" | Proves it isn't one cherry-picked string. |
| **Trained / untrained** | toggle | swaps in randomly-initialised weights | **The falsification control.** Proves the effect is learned, not a geometric artifact of ReLU. |

The trained/untrained toggle is the highest-value control on the page. It pre-empts the sharpest judge question ("how do you know that's not just ReLU on repeated input?").

Sequence length: T = 13 + 8 × repeats, so T ∈ [21, 77]. One cycle maximum. This keeps every recompute under ~200 ms.

### 3.4 Sandbox (PS: "guide, then sandbox")

A second view where the learner types an arbitrary letter string. Must carry a permanent label: *"Off-distribution. This model was trained only on the 13-letter warm-up + repeated-word protocol. Behaviour here is not evidence for or against the claim."* Honest, and it satisfies the sandbox requirement without inviting an overclaim.

### 3.5 Mechanism panel — the BDH module

Not bolted on. This panel explains *why the meter moves*, so deleting it would leave the artifact a mystery.

Show **Definition 4** of the BDH paper:

```
y(t,l) := ( D_y · LN( a*(t,l) ) )⁺  ⊙  x(t,l)
```

Three sentences, beginner language:
1. `y` is the vector we count non-zeros in. It is two non-negative vectors multiplied element by element.
2. `x` is the neuron's own activation; the left factor is what the recurrent state reads out. Both must be non-zero for the neuron to count as active — it behaves like a gate that needs two switches on.
3. When the state already predicts the next token, the readout collapses toward zero and the gate closes. **There is no sparsity hyperparameter anywhere in that line.** A Transformer FFN has no equivalent gate — its activation count doesn't know whether the model is surprised.

Also state plainly: `xy_sparse` in `pathwaycom/bdh` (line ~136) is the paper's `y`. The variable named `y_sparse` in that code is only the left factor, before the gate.

---

## 4. The substrate — model, training, export

### 4.1 Locked config

```python
n_layer = 4
n_embd  = 32          # paper: 256   (SHRUNK, disclosed)
n_head  = 4
mlp_internal_dim_multiplier = 32     # paper: 256  (SHRUNK, disclosed)
vocab_size = 32       # 26 letters + spare
# derived: N per head = 256, n_total = 1024 neurons (paper: 65536 → 64× shrink)
```

**Parameter count: 100,352.** Raw float32 size = 392 KB, but the shipped format is JSON nested lists (§4.4), which measures **1.41 MB** for `weights_trained.json` and **1.49 MB** for `weights_untrained.json` — **~2.9 MB total**. Format stays JSON for this build; do not switch mid-build. **The README loading section must state this figure** (see §7).

### 4.2 Corpus (BDH §6.4 protocol, verbatim)

- 13-letter warm-up, **fixed across every cycle**.
- Then a fresh random 8-letter word, repeated 8×.
- Cycle length = 13 + 8·8 = **77 letters**.
- Alphabet: 26 Latin letters, one letter per token.

### 4.3 Training run — MUST be rerun clean

The shipped `bdh_probe.py` does **not** reproduce `results_small.json`. This is a reproducibility failure and it is the first thing to fix.

| | current script | run that produced the results | **fix to** |
|---|---|---|---|
| `n_embd` | 64 | 32 | **32** |
| `mlp_mult` | 64 | 32 | **32** |
| `n_total` | 4096 | 1024 | **1024** |
| `steps` | 1200 | 2200 | **2200** |
| `batch` | 8 | 4 | **4** |
| `seqlen` | 154 | 154 | **154** |

Also fix, in the same pass:
- Hardcoded output path `/home/claude/probe/results.json` → CLI arg or `./results.json`.
- `nn.Buffer` requires PyTorch ≥ 2.5 → use `register_buffer` for portability.
- Add `--export-weights` to dump `weights.json`.
- Add `--untrained` to dump a random-init weight file for the toggle.
- `probe.md` §11 documents JSON keys (`per_layer_summary`, `layer2_series`) that do not exist in the actual output (`per_layer` → `series`). Regenerate that section from the real file.

**Target numbers to confirm on rerun** (from the previous clean run — treat as expected, not guaranteed):

| layer | warm-up | memorize | repeat | ratio |
|---|---|---|---|---|
| 0 | 11.68% | 12.93% | 12.98% | **1.00×** |
| 1 | 18.13% | 17.66% | 9.35% | 1.89× |
| **2** | **21.44%** | **15.86%** | **4.77%** | **3.32×** |
| 3 | 19.04% | 13.61% | 5.99% | 2.27× |

If the rerun lands materially off these, **report the new numbers** — do not retrofit the old ones.

> **Outcome (2026-09-08): the rerun did land off these, and the new numbers were shipped.**
> Measured: layer 0 = 0.92×, layer 1 = 1.96×, **layer 2 = 3.10×** (15.77% → 5.08%), layer 3 = 1.91×,
> final loss 0.4964. The table above is the *pre-rerun expectation* and is kept only as history —
> `results.json` is the shipped evidence. Nothing was retrofitted.

### 4.4 Weight export format

```json
{
  "config":     {"n_layer":4,"n_embd":32,"n_head":4,"mlp_mult":32,"vocab_size":32,"n_total":1024},
  "embed":      [32][32],          // vocab × D
  "encoder":    [4][32][256],      // heads × D × N
  "encoder_v":  [4][32][256],
  "decoder":    [1024][32],        // (heads*N) × D
  "lm_head":    [32][32],          // D × vocab
  "warmup":     [13 ints],         // the fixed warm-up letters
  "provenance": {"trained_steps":2200,"seed":0,"final_loss":0.4964}
}
```

Ship two files: `weights_trained.json` and `weights_untrained.json`.

---

## 5. The JavaScript forward pass — exact spec

This is the part that makes the artifact *live* rather than a replay. It must be a faithful port. Any deviation is a technical-correctness penalty.

**Per layer, per forward pass** (D=32, nh=4, N=256, T≤77). `x` is shared across heads (in the PyTorch code `x` carries a head dim of size 1 and broadcasts).

```
x = LN(embed[tokens])                       // (T, D)

for l in 0..3:
    for each head h:
        x_latent[h] = x @ encoder[h]        // (T,D)@(D,N) -> (T,N)
        x_sparse[h] = relu(x_latent[h])

        QR[h] = rope(x_sparse[h])           // KR == QR  (the code sets K = Q)
        scores[h] = strict_lower_tri(QR[h] @ QR[h]^T)   // (T,T), tril(diagonal=-1)
        attnV[h]  = scores[h] @ x           // (T,T)@(T,D) -> (T,D)
        yKV[h]    = LN(attnV[h])
        y_sparse[h] = relu(yKV[h] @ encoder_v[h])       // (T,N)

        xy_sparse[h] = x_sparse[h] * y_sparse[h]        // <-- THE MEASURED VARIABLE

    // measurement for curve 3, at the selected layer only:
    //   active_fraction[t] = mean over (h, N) of (xy_sparse[h][t][:] > 0)

    concat = reshape(xy_sparse, (T, nh*N))              // heads concatenated
    yMLP   = concat @ decoder                           // (T, 1024)@(1024,D) -> (T,D)
    x      = LN(x + LN(yMLP))

logits = x @ lm_head                                    // (T, vocab)
// curve 2: cross_entropy[t] = -log2( softmax(logits[t])[ token[t+1] ] )
```

**RoPE detail (must match exactly):**
```
quantize(i) = floor(i/2)*2
freqs[i]    = 1 / ( 2^16 ^ ( quantize(i)/N ) ) / (2π)      for i in 0..N-1
phase[t][i] = ((t * freqs[i]) mod 1) * 2π
rope(v)[t][i]     = v[t][i]*cos(phase) - v[t][i+1]*sin(phase)   // i even
rope(v)[t][i+1]   = v[t][i+1]*cos(phase) + v[t][i]*sin(phase)   // i odd
```
(This is the `v_rot = stack(-v[1::2], v[::2])` interleave from the PyTorch source, written out.)

**LayerNorm:** parameter-free, no bias, no affine — mean/std over the last dim (D), matching `nn.LayerNorm(D, elementwise_affine=False, bias=False)`.

**Compute budget:** ~58M multiply-adds for T=77 across all four layers. With `Float32Array` and flat loops this is 100–300 ms. **No WebGL, no WASM, no ONNX runtime — plain JS is fast enough.** Adding a runtime would be over-engineering and a load-time risk.

**Known artifact to handle:** attention is `tril(diagonal=-1)`, strictly below the diagonal, so token 0 attends to nothing → `a = 0` → `y = 0` → **token 0 always reads exactly 0.0% active in every layer.** Either trim token 0 from the plotted range or annotate it. Do not silently average it into the warm-up figure.

---

## 6. Build phases

| # | Phase | Output | Est. |
|---|---|---|---|
| **1** | Fix + rerun the probe | corrected `bdh_probe.py`, fresh `results.json`, `weights_trained.json`, `weights_untrained.json` | 45 min (≈4 min of it is training) |
| **2** | JS model port + numerical parity check | `bdh.js`, parity test vs PyTorch output | 2–3 h |
| **3** | The page — layout, 3 curves, 4 controls, panels, sandbox | `index.html` + `app.js` + `style.css` | 3–4 h |
| **4** | README + reproduction instructions + license/AI disclosure | `README.md` | 1 h |
| **5** | One-page concept summary PDF (500–950 words) | `concept-summary.pdf` | 1.5 h |
| **6** | Deploy to GitHub Pages, test on a phone, submit | public URL | 45 min |

**Parity check in Phase 2 is non-negotiable.** Run the same 77-token sequence through PyTorch and through the JS port; per-layer active fractions must agree to ~1e-4. Without this, "live computation" is an unverified claim.

---

## 7. Deliverables checklist (straight from PS p.10)

- [ ] Public artifact URL, opens with no sign-in → **GitHub Pages** (static, no backend, nothing to go down during judging)
- [ ] Public source repository
- [ ] One-page concept summary as PDF (500–950 words)
- [ ] Complete README — claim, learner, prerequisites, objectives, architecture, role of each component, **which parts are live / precomputed / synthetic / animated**, how to reproduce, credits, licenses
- [ ] README **loading section** states the real payload: ~2.9 MB of JSON weights across two files (1.41 MB trained + 1.49 MB untrained), not the 392 KB raw-float32 figure
- [ ] Setup instructions for the Python probe
- [ ] ≥3 primary papers 2022–2026, cited *beside* the claims they support:
  - Kosowski, Uznański, Chorowski, Stamirowska, Bartoszkiewicz — *The Dragon Hatchling*, arXiv **2509.26507** (2025)
  - Herrmann, Csordás, Schmidhuber — *Measuring In-Context Computation Complexity via Hidden State Prediction*, arXiv **2503.13431** (2025) — cited by BDH §6.4 for exactly this point
  - You et al. — *Spark Transformer: Reactivating Sparsity in FFN and Attention*, arXiv **2506.06644** (2025)
  - (optional 4th) Engdahl et al. — *BDH-CQ*, arXiv **2608.09888** (2026)
- [ ] Source + license record for code, weights, fonts, graphics
- [ ] AI assistance disclosure

**BDH-CQ placement — one sentence, in the one-pager, no more:** *"BDH-CQ (Engdahl et al., 2026) is a later reasoning system in the same architectural family; the sparse-activation property demonstrated here is a BDH result and does not depend on BDH-CQ."* The PS explicitly rewards saying a system has no direct role over inventing a connection (p.12).

---

## 8. Repo layout

```
/
├── index.html            # the artifact
├── app.js                # UI, charts, controls
├── bdh.js                # the forward pass port
├── weights_trained.json
├── weights_untrained.json
├── probe/
│   ├── bdh_probe.py      # corrected, reproducible
│   ├── results.json      # regenerated
│   └── README.md         # how to rerun
├── README.md
├── concept-summary.pdf
└── LICENSE
```

---

## 9. Disclosed limitations — all seven, visible in the artifact

1. **Layer 0 shows no effect.** Framed as *confirming* the paper, which states the effect appears in "higher layers" (§6.4) — **not** as our own discovery.
2. **64× neuron shrink** (65536 → 1024). Our absolute activity levels run roughly **2–3×** the paper's — memorize 15.77% against the paper's 4.0–7.5%, repeat 5.08% against ~2.5% — so the *ratio* is what reproduces, not the absolute percentages.
3. **Synthetic task only.** This says nothing about BDH on natural language. See §11.
4. **Token 0 always reads 0.0%**, a consequence of `tril(diagonal=-1)` — a code artifact, not a finding.
5. **Independent shrunk reimplementation**, faithful to `pathwaycom/bdh` with a measurement hook added. **Not an official BDH model** (PS requires this label explicitly).
6. **BDH-CQ is cited, never run.** No public checkpoint exists.
7. **During warm-up, layer-2 activity is highest despite both oracle and model being confident.** The most plausible explanation is state re-establishment at the start of a cold sequence — but this is untested and labelled as such. **This is the artifact's central honest gap** — the PS says "the gap is often the lesson," and this is that gap. The claim in §1 is scoped to the memorize → repeat transition precisely because of this.

   *Measured 2026-09-08 (supersedes the earlier wording, which said activity tracks the model's uncertainty — that is falsified):* warm-up model cross-entropy is **0.113 bits**, lower than the repeat phase's 0.766 bits, yet warm-up layer-2 activity is **18.14%** against 5.08% on repeats. Activity tracks neither the oracle's uncertainty nor the model's.

---

## 10. Live defense — the questions to have answers for

| Judge asks | Answer |
|---|---|
| "Isn't that just ReLU on repeated input?" | Flip the trained/untrained toggle. Untrained shows no drop. The effect is learned. |
| "Is this live or precomputed?" | Live. The forward pass runs in `bdh.js`; change the word and it recomputes. Only the weights are shipped as data. |
| "Which variable are you measuring?" | `xy_sparse`, which is the paper's `y` in Definition 4. The variable literally named `y_sparse` in the repo is only the pre-gate factor. |
| "Why does layer 0 do nothing?" | The paper says the effect is in higher layers. We confirm that; we don't claim to have found it. |
| "Why is warm-up the highest, if it's predictable?" | Limitation 7. Activity tracks the model's uncertainty, not the oracle's. That gap is deliberately on screen. |
| "Is this an official BDH model?" | No. Independent reimplementation at 1/64th scale, labelled as such throughout. |
| "How do I reproduce it?" | `python probe/bdh_probe.py` — one command, CPU only, about four minutes. |

---

## 11. The closing story (for the Round 2 pitch)

> *"We first tried this on Shakespeare and got a flat line. We nearly concluded the effect wasn't real. Then we read Section 6.4 and found the model in Figure 14 was never trained on language at all — it was trained on a purpose-built synthetic task. The effect was real; our data was wrong."*

True, memorable, and it demonstrates exactly the behaviour the 25-point technical-correctness criterion is testing: a team that went to the primary source instead of trusting or dismissing a claim.

---

## 12. The fence — what we are deliberately NOT building

> **Superseded in part. `BUILD-PLAN.md` §14 is the current fence.** Two items below were
> later re-authorised by explicit decision and **are in the shipped artifact**. This section
> is retained as the original reasoning, not as a description of what was built. See the
> correction log (§14) and `docs/execution-status.md`.

- **RoPE frequency buckets** (Fig. 14b) — requires explaining RoPE to an audience defined as not knowing RoPE. *(Still fenced. Not built.)*
- **A second contrast model** (tiny Transformer) — originally killed on time risk. **RE-AUTHORISED AND BUILT.** See `prompt-transformer-comparison.md` for the decision and `docs/transformer-protocol.md` / `docs/transformer-results.md` for the protocol and measurements. It ships as a *contextualizing control*, never as part of the claim, which remains BDH-only. Trained layer 2 gives 1.581590×, random 0.998273×; parameter counts, attention operators/masks, RoPE widths and residual paths all differ, so no ranking is claimed.
- **Wiring / synaptic-state visualisation** — originally excluded on the grounds that no honest wiring diagram exists to draw (shared, dense weights). **RE-AUTHORISED AND BUILT** as a separate memory lab: a centered projection of the computed context state, explicitly *not* the paper's σ and not a semantic neuron graph, plus a hypothetical λ=0.96 decay intervention labelled as an intervention. See `docs/memory-explainer.md`.
- **Direction B** (synaptic memory / Figs. 12–13) — needs Europarl-scale bilingual data and a from-scratch recurrent-state reimplementation. *(Still fenced. Not built.)*
- **Direction C** (KV-cache comparison) — two models to train and instrument. *(Still fenced. Not built.)*
- Training in the browser · 3D neuron graphics · a general "BDH playground" · any second topic · any backend. *(Still fenced. Not built.)*

**Test for any new idea:** does it help the learner reproduce the claim or find its boundary? If not, it's decoration.

---

## 13. Open empirical questions (resolve in Phase 1, do not assume)

1. Does the rerun reproduce the layer-2 ratio at ~3.3×, or does it shift? Report what comes out.
2. What does model cross-entropy (curve 2) actually do during warm-up? If the model has *learned* the fixed warm-up, curve 2 should be low there while curve 3 is high — which sharpens Limitation 7 into a clean lesson. **Measure it; don't assume it.**
3. Does the untrained model show a genuinely flat curve 3, or some residual structure? Either result is publishable in the honesty panel; the flat result is stronger.

---

## 14. Correction log

- **"fact" wording.** The paper writes *"8 repetitions of an 8-letter random word ('fact')"* and later *"fact introduction"*, *"fact memorization effect"*. "fact" is the paper's **name for the memorized item**, not a literal example word — the word is random, and "fact" is four letters, not eight. An earlier note in this project called it a literal example; that was wrong. Use "the memorized word" or "the fact" in all copy.
- **`xy_sparse` vs `y_sparse`.** Confirmed against Definition 4 in the paper, not just the source code: `y := (D_y·LN(a*))⁺ ⊙ x`. The `⊙ x` gate means the code's `xy_sparse` is the paper's `y`.
- **Layer-0 framing.** Changed from "our discovered limitation" to "confirms the paper's own statement about higher layers."

### Fence reversals — recorded 2026-09-08

- **The tiny Transformer contrast model was un-fenced and built.** §12 said "killed on time risk"; the shipped artifact contains one. This document contradicted the artifact for the life of the build and has now been corrected in place. The decision record is `prompt-transformer-comparison.md`; the current fence is `BUILD-PLAN.md` §14, which never listed this item. The claim itself was not widened — it is still BDH-only, and the Transformer is labelled a control.
- **Wiring/state visualisation was un-fenced and built** as the memory lab, superseding the "no honest wiring diagram exists" reasoning. It ships with explicit boundaries: a centered projection of computed context, not the paper's σ, not semantic neurons, and a λ=0.96 decay path labelled a hypothetical intervention rather than native forgetting.
- **Limitation 2's multiplier corrected.** "Roughly 3× the paper's absolute levels" was never measured; the shipped numbers give 15.77% vs 4.0–7.5% (≈2.7×) and 5.08% vs ~2.5% (≈2.0×). Restated as 2–3× with both comparisons shown.
- **Stale fence numbers removed.** §12 quoted "15.9% → 4.8%" from the superseded 2026-09-06 run. The shipped figures are 15.77% → 5.08%.
