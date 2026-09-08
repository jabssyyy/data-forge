# probe.md — Figure 14 Reproduction Probe

**Created:** 2026-09-06
**Purpose:** the experiment that confirmed Direction A is buildable. Self-contained: question, method, code, results, what it proves, what it doesn't.

---

## 1. The question this answered

> Does BDH really activate fewer neurons when the input is predictable — and does it still do that in a model small enough for us to train?

This was the single blocker on committing to Direction A. If the effect didn't reproduce, our headline claim would have been unverified and we'd have been shipping a wrong claim into the 25-point "technical correctness" criterion.

**Answer: YES. Confirmed 2026-09-06, and re-confirmed on a clean reproducible rerun 2026-09-08.**

The 2026-09-08 rerun is the one we ship: the earlier script did not reproduce its own results file (wrong config values). All numbers in this document are from that rerun (`results.json`). They differ slightly from the 2026-09-06 run (`results_small.json`) — the differences are recorded in §4 and are not reconciled or adjusted.

## 2. Why an earlier attempt failed (important context)

An earlier external review trained a BDH on **tiny Shakespeare** (the repo's default dataset), repeated some text, and saw activity stay flat (21.4 -> 21.5 -> 20.4 -> 20.2%). Conclusion drawn: effect may not be real.

**That was the wrong experiment.** Reading BDH paper Section 6.4 directly revealed the paper's Figure 14 model was **not trained on natural language at all** — it was trained on a purpose-built synthetic task. Testing a Shakespeare-trained model on repetition is a different experiment entirely.

Two further traps we avoided:
- **Wrong variable.** The paper's "y" is the GATED product (`y = relu(ln(a_ast) @ decoder_y) * x`, Appendix E). In `bdh.py` that is **`xy_sparse` (line 136)**, NOT `y_sparse` (line 135, the ungated half).
- **Wrong aggregation.** The effect is **per-layer**, concentrated in layer 2. Averaging across layers washes it out.

## 3. Method (BDH paper Section 6.4 recipe)

**The synthetic corpus.** Not English. A made-up stream with a fixed structure:
- 13-letter **warm-up** (same every cycle)
- a fresh **random 8-letter word**, repeated **8 times**
- cycle length = 13 + 8x8 = **77 letters**, then a new random word and repeat

The word is random, so its FIRST appearance is unpredictable; appearances 2-8 are perfectly predictable. That contrast is the whole experiment.

**Model config**
| | Paper | Ours | Why |
|---|---|---|---|
| neurons n | 65,536 | **1,024** | 64x shrink — no GPU (1 CPU core, 3GB RAM) |
| dim d | 256 | 32 | shrink |
| layers L | 4 | **4** | matched |
| tokenizer | Latin letters | 26 letters | matched |
| training | synthetic task | synthetic task | matched |

Training: AdamW, lr 3e-3, batch 4, seqlen 154 (2 cycles), 2200 steps, ~4 min on one CPU core. ~0.1M params.
Final loss **0.4964** against a theoretical floor of **~0.34** (the 8 random letters are genuinely unpredictable: 8 x ln(26) / 77). So the model learned the structure close to optimally.

**Measured:** fraction of neurons with a non-zero entry in `xy_sparse`, per layer, per token.

## 4. Results

All figures from the 2026-09-08 rerun (`results.json`).

### Per-layer (% of neurons active)
| Layer | Warm-up | First presentation (new) | Repeats (predictable) | Ratio |
|---|---|---|---|---|
| 0 | 10.17 | 12.84 | 13.91 | **0.92x — NO EFFECT** |
| 1 | 14.82 | 14.94 | 7.62 | 1.96x |
| **2** | 18.14 | **15.77** | **5.08** | **3.10x** |
| 3 | 18.80 | 16.15 | 8.47 | 1.91x |

### Difference from the 2026-09-06 run (reported, not reconciled)
Same config, same protocol; the runs differ only in RNG consumption, because the rerun reseeds immediately before model construction and adds the reference repo's `nn.Embedding` init. Nothing was tuned to bring these closer.

| Layer | Ratio 09-06 | Ratio 09-08 |
|---|---|---|
| 0 | 1.00x | 0.92x |
| 1 | 1.89x | 1.96x |
| **2** | **3.32x** | **3.10x** |
| 3 | 2.27x | 1.91x |

The layer-2 effect and the layer-0 null both survive. Layer 3 moved most (2.27x -> 1.91x), and layers 1 and 3 swapped rank. Treat per-layer ordering below layer 2 as unstable at this scale; treat "strongest in layer 2, absent in layer 0" as the reproducible part.

### Decay across the 8 presentations (layer 2)
| Presentation | % active |
|---|---|
| 1st (brand new) | **15.77** |
| 2nd | 6.31 |
| 3rd | 5.04 |
| 4th | 5.08 |
| 5th | 4.71 |
| 6th | 4.58 |
| 7th | 4.77 |
| 8th | 5.09 |

One exposure drops activity ~60%; it then settles at ~4.6-5.1%.

### Match to the paper
| | Paper | Ours | Match? |
|---|---|---|---|
| Effect strongest in | layer 2 | layer 2 | ✅ |
| Direction | drops on repetition | drops on repetition | ✅ |
| Ratio | ~1.6-3.0x implied | 3.10x | ✅ comparable |
| Absolute (new -> repeat) | 4.0-7.5% -> ~2.5% | 15.8% -> 5.1% | ⚠️ higher, expected at 64x fewer neurons |

### Model cross-entropy by phase (bits per token)
Answers build.md §13 Q2. Two alignments are reported because they disagree at phase boundaries: `at_position` indexes by the token making the prediction (aligns with the activation series), `of_target` indexes by the token being predicted (aligns with oracle surprisal).

| Alignment | Warm-up | Memorize | Repeat |
|---|---|---|---|
| at_position | 0.361 | 4.713 | 0.780 |
| of_target | 0.113 | 5.130 | 0.766 |

Oracle surprisal for comparison: warm-up 0 bits, novel letters log2(26) = 4.70 bits, repeats 0 bits.

**The model has learned the fixed warm-up almost perfectly (0.113 bits) — yet layer-2 activity is at its highest there (18.14%).** See §6.1: this falsifies the explanation previously given for that gap.

## 5. What this proves — and what it does NOT

**Proves:**
- The surprise-driven sparsity effect is real and reproducible from the public `pathwaycom/bdh` code.
- It survives a **64x shrink** onto a single CPU core — not a fragile, compute-hungry phenomenon.
- It is **layer-localised**, matching the paper's report that layer 2 carries it.

**Does NOT prove:**
- Anything about absolute sparsity levels at full scale (ours run ~3x higher).
- Anything about BDH on natural language — this is a synthetic task by design.
- Anything about BDH-CQ (no public checkpoint; all BDH-CQ numbers are cited, never run).

## 6. THE LIMITATION (this is the teaching gold)

**Layer 0 shows no effect whatsoever: 12.84% memorize vs 13.91% repeat — a ratio of 0.92x.**

Surprise-driven sparsity is not a property of "the network." It is a property of *where in the network you look*. Early layers just process letters; they neither know nor care whether the sequence is predictable. The effect emerges only in middle/upper layers.

Note the direction: at 0.92x, layer 0 activity is marginally *higher* on repeats than on the new word. On the 2026-09-06 run it was 1.00x. Say "no effect in layer 0", not "slightly inverted in layer 0" — a 0.92x on one run at n=1024 does not support a directional claim.

This is a better lesson than the headline claim, and it satisfies the rubric's requirement for a disclosed limitation. A learner who switches to layer 0 and watches the meter stay flat understands the mechanism more deeply than one who only sees layer 2 drop.

## 6.1 THE SECOND LIMITATION — measured 2026-09-08, and it breaks our old explanation

Warm-up is where the model is *most* confident and layer 2 is *most* active:

| Phase | Oracle surprisal | Model cross-entropy (of_target) | Layer-2 active |
|---|---|---|---|
| Warm-up | 0 bits | **0.113 bits** | **18.14%** |
| Memorize | 4.70 bits | 5.130 bits | 15.77% |
| Repeat | 0 bits | 0.766 bits | 5.08% |

build.md §9 Limitation 7 explains the warm-up gap as *"activity tracks the model's uncertainty, not the oracle's."* **This measurement falsifies that explanation.** The model's uncertainty during warm-up is 0.113 bits — lower than during repeats (0.766 bits) — yet warm-up activity is 3.6x higher than repeat activity. Activity is not tracking the model's uncertainty either.

What survives: activity is high during warm-up for a reason that is *not* surprisal of any kind — most plausibly state re-establishment at the start of a cold sequence (§7: we measure one cycle from cold, so the model is rebuilding context it will later carry). That remains an untested hypothesis and must be labeled as one.

What this costs: nothing in the headline claim, which is scoped to the memorize -> repeat transition precisely because of this gap.

**Resolved 2026-09-08:** build.md §9 Limitation 7 has been rewritten to the measured version — "during warm-up, layer-2 activity is highest despite both oracle and model being confident; the most plausible explanation is state re-establishment at the start of a cold sequence, untested and labelled as such." Any artifact copy must use that wording, not the old one.

## 7. Known protocol gap (fix in the final build)

We measured **a single cycle from a cold start**; the paper measures across **repeating cycles**. With no prior context, the model can't anticipate the warm-up, so our warm-up figures are inflated (18.14% in layer 2 — higher than the first word presentation). Fix by measuring the 2nd or 3rd cycle instead of the 1st.

**Deliberately not fixed in the 2026-09-08 rerun.** That rerun existed to check the build.md §4.3 table; changing the measurement protocol at the same time would have made the comparison meaningless. This is now the highest-value open experiment, because §6.1 makes it load-bearing: if warm-up activity is state re-establishment, measuring cycle 2 or 3 should lower it. That is a falsifiable prediction and it is currently untested.

## 8. Provenance / honesty labels (required by the PS)

- Model code is faithful to `pathwaycom/bdh` `bdh.py` (MIT), with a capture hook added for `xy_sparse` and the config shrunk.
- **Must be labeled an independent, shrunk reimplementation for teaching — NOT an official BDH model.** (PS: "Any toy model or independent reimplementation must be identified as such.")
- All numbers above are OUR measurements, live. Paper figures are cited reported results.
- Evidence label: this is an independent partial reproduction of a developer-reported result, at reduced scale.

## 9. Reproduce it

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu

# trained run: measurements + weight export
python bdh_probe.py --out results.json --export-weights weights_trained.json

# falsification control: random-init weights, no training
python bdh_probe.py --untrained --export-weights weights_untrained.json
```

The trained run takes a few minutes on CPU; the untrained export takes ~2 seconds. Config is at the top of the file. Output: `results.json` (measurements, ~8 KB) and the two weight files (~1.4-1.5 MB each; schema in build.md §4.4).

`results_small.json` is the superseded 2026-09-06 run, kept for the comparison in §4.

Every run reprints the parameter-count check at n_layer=2 vs n_layer=4. Both must read 100352 — that is the shared-weights property being re-verified rather than remembered.

---

## 10. The code

The script is `bdh_probe.py` in this directory. It is not duplicated here: the previous
version of this section embedded a full copy that drifted out of sync with the file
(different config values), which is how the reproducibility failure went unnoticed.
Read the file.

Its header documents, in order: the measured variable, the shared-weights property with
three independent confirmations, the paper/code name mapping, and the four intentional
deviations from `pathwaycom/bdh`.

The part that matters is the layer loop and the capture hook:

```python
for _level in range(cfg.n_layer):      # _level unused: SAME weights every layer
    x_latent = x @ self.encoder                   # B, nh, T, N
    x_sparse = F.relu(x_latent)                   # B, nh, T, N

    yKV = self.attn(Q=x_sparse, K=x_sparse, V=x)  # B, nh, T, D
    yKV = self.ln(yKV)

    y_latent = yKV @ self.encoder_v               # B, nh, T, N
    y_sparse = F.relu(y_latent)                   # ungated left factor
    xy_sparse = x_sparse * y_sparse               # <-- PAPER'S y (bdh.py:136)

    if capture:
        nz = (xy_sparse > 0).float()              # B, nh, T, N
        caps.append(nz.mean(dim=(0, 1, 3)).detach().clone())   # -> (T,)

    xy_sparse = self.drop(xy_sparse)
    yMLP = xy_sparse.transpose(1, 2).reshape(B, 1, T, N * nh) @ self.decoder
    y = self.ln(yMLP)
    x = self.ln(x + y)
```

Two lines carry the whole experiment. `xy_sparse = x_sparse * y_sparse` is the paper's
`y` from Definition 4 (p.18): `y := ( D_y LN(a*) )^+ (*) x`, where `(*)` is elementwise —
so the paper's `y` is the *gated* product, and `y_sparse` alone (the ungated left factor)
is the wrong variable. The capture line counts non-zeros over the head and neuron axes
only, leaving one value per token.

## 11. Raw results (results.json)

**Regenerated 2026-09-08 from the actual output of `bdh_probe.py`.** The previous version of
this section documented keys `per_layer_summary` and `layer2_series` that the script never
emitted; the real keys are below. `results_small.json` is the earlier (2026-09-06) run and is
superseded by `results.json`.

### Top-level keys

| key | contents |
|---|---|
| `config` | BDHConfig fields: n_layer, n_embd, dropout, n_head, mlp_internal_dim_multiplier, vocab_size |
| `n_total` | total neurons across heads = mlp_internal_dim_multiplier x n_embd |
| `seed` | RNG seed for corpus, init and training |
| `train` | steps, batch, seqlen, lr |
| `param_count_check` | parameter totals at n_layer=2 and n_layer=4 (must be equal) |
| `loss_hist` | [[step, loss], ...] every 100 steps plus the final step |
| `labels` | 77 phase labels, one per token: warmup / memorize / repeat |
| `sequence` | the 77 measured token ids |
| `word` | the 8-letter random word for this cycle |
| `warmup` | the fixed 13-letter warm-up |
| `per_layer` | "0".."3", each with `warmup`, `memorize`, `repeat` (phase means) and `series` (77 per-token values) |
| `cross_entropy` | `series_bits` (76 values), `at_position`, `of_target` |

Phase labels: tokens 0-12 warm-up, 13-20 first presentation, 21-76 repeats.

### Measured values

```
n_total: 1024    seed: 0
train:   steps 2200, batch 4, seqlen 154, lr 0.003
param_count_check: n_layer=2 -> 100352, n_layer=4 -> 100352  (equal: weights shared across layers)
final loss (step 2199): 0.4964

per_layer, fraction of the 1024 neurons non-zero in xy_sparse:
  layer   warmup   memorize    repeat     ratio
      0    10.17%     12.84%    13.91%     0.92x
      1    14.82%     14.94%     7.62%     1.96x
      2    18.14%     15.77%     5.08%     3.10x
      3    18.80%     16.15%     8.47%     1.91x

cross_entropy, bits per token:
  at_position  warmup  0.361   memorize  4.713   repeat  0.780
  of_target    warmup  0.113   memorize  5.130   repeat  0.766
```

### Layer-2 per-token series (the claim curve)

```json
[0.0, 0.1875, 0.1895, 0.1836, 0.166, 0.2168, 0.1846, 0.167, 0.1562, 0.2314, 0.2197, 0.2607, 0.1953, 0.1807, 0.1367, 0.1562, 0.1787, 0.1875, 0.1797, 0.1396, 0.1025, 0.0615, 0.0547, 0.0664, 0.0664, 0.0713, 0.0605, 0.0566, 0.0674, 0.0439, 0.0459, 0.0508, 0.0586, 0.0527, 0.043, 0.0459, 0.0625, 0.0381, 0.0518, 0.0547, 0.0596, 0.0537, 0.0439, 0.0439, 0.0605, 0.0352, 0.0391, 0.0488, 0.0557, 0.0537, 0.043, 0.0439, 0.0576, 0.0361, 0.0361, 0.0469, 0.0547, 0.0508, 0.043, 0.042, 0.0566, 0.0391, 0.042, 0.0488, 0.0596, 0.0547, 0.042, 0.0439, 0.0518, 0.04, 0.0381, 0.0576, 0.0596, 0.0566, 0.0479, 0.0449, 0.0625]
```

### Model cross-entropy per token, bits (curve 2)

Index t is the position making the prediction, so entry t is -log2 p(token t+1); 76 values.

```json
[1.2559, 0.0543, 0.0035, 0.0028, 0.0086, 0.0025, 0.0008, 0.0123, 0.0028, 0.003, 0.0045, 0.0031, 3.3371, 5.2923, 5.4241, 5.2048, 5.0801, 4.3781, 5.0962, 7.2282, 0.0033, 0.0156, 0.127, 0.2955, 0.2381, 0.0149, 0.0176, 4.6958, 0.0004, 0.0357, 0.064, 0.1303, 0.1853, 0.0058, 0.006, 8.8215, 0.0004, 0.2098, 0.0159, 0.223, 0.1102, 0.0071, 0.0211, 6.7342, 0.0004, 0.2275, 0.0471, 0.6883, 0.1186, 0.0081, 0.0669, 4.2166, 0.0005, 0.2325, 0.1067, 0.0372, 0.0319, 0.0096, 0.1171, 7.5629, 0.0008, 0.1524, 0.0868, 0.4226, 0.0507, 0.0078, 0.0837, 3.8355, 0.0011, 0.2536, 0.0194, 0.1315, 0.0785, 0.0106, 0.0551, 2.2635]
```

*(Full per-token series for all four layers are in `results.json` under `per_layer[l].series`.)*
