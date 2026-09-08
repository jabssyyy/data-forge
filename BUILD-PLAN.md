# BUILD-PLAN.md — master execution document

**Project:** "Sparsity is not a budget" · DataForge 2026 · Pathway Track · Topic #22
**Last updated:** 2026-09-08

---

## 0. How to use this document

This file is self-contained. An assistant reading it cold has everything needed to
generate the remaining prompts and execute them — no other file is required,
though `build.md` and `probe.md` carry deeper background.

**Read §1–§5 before writing any code.** §6 onward is the work.

**Precedence:** this file supersedes `build.md` §6 (phases) and §7 (deliverables).
Everything else in `build.md` still stands — the JS forward-pass spec in §5 is
still authoritative and has been verified against the reference repo.

---

## 1. Working rules — binding on anyone executing this

1. **Never adjust a measured number toward an expected one.** This project has
   twice shipped a number that differed from the plan (layer 0 came out 0.92×
   against an expected 1.00×; the rerun gave 3.10× against 3.32×). Both were
   shipped as measured. Continue that.
2. **Every claim on the page must be traceable** to the BDH paper, the
   `pathwaycom/bdh` source, or this project's own measured output. Nothing from
   memory.
3. **The team must defend every line live.** Write code that can be traced and
   explained. Prefer explicit loops over dense one-liners.
4. **No unverified computation is presented as live.** Anything computed offline
   is labelled PRECOMPUTED, as prominently as the number it carries.
5. **Do not add features.** The fence in §12 is deliberate and was arrived at by
   elimination, not by running out of ideas.
6. **If the plan looks wrong, say so and argue it.** Do not silently deviate.

---

## 2. The claim (locked — do not reword)

> **In a trained BDH, the fraction of active neurons in layer 2 falls roughly 3×
> the moment the next letter becomes predictable — with the same weights, the
> same input length, and no sparsity setting touched anywhere.**

Scoped deliberately to the **memorize → repeat** transition. It is *not* a claim
that activity tracks surprisal everywhere — see Limitation 7, which is the
artifact's central honest gap.

The claim is about **BDH only**. Any Transformer comparison is a contextualizing
control, not part of the claim. This is what makes every possible comparison
outcome shippable.

**Source:** BDH paper, arXiv 2509.26507, §6.4 + Figure 14. Reported there: layer 2
shows 4.0–7.5% non-zero during memorization, ~2.5% during repetition, at n=65536.

---

## 3. Audience, prerequisites, objectives

**Audience (one named person):** a data scientist or DL student who has trained a
neural network and knows what an activation is, but has never read a
post-Transformer paper.

**Assumed:** activation, ReLU, layer, next-token prediction, cross-entropy.
**Not assumed:** attention math, RoPE, linear attention, Hebbian learning, SSMs.

This is load-bearing. It is what licenses cutting RoPE frequency buckets
(Figure 14b) from scope.

**Learning objectives.** After 60 seconds the learner can:
1. State the claim in their own words.
2. Predict what happens to the meter when they raise the repeat count.
3. Name one place the claim fails (layer 0) and one place truth and measurement
   diverge (warm-up).
4. Point to the single equation that causes the effect.

---

## 4. Verified state — every number, as measured

All figures from the clean rerun of 2026-09-08. Deterministic under the fixed
seed: a repeat run was bit-identical.

### 4.1 Model

| | |
|---|---|
| Config | `n_layer=4, n_embd=32, n_head=4, mlp_mult=32` |
| Derived | N/head = 256, **n_total = 1024 neurons** (paper: 65536 → 64× shrink) |
| Parameters | **100,352** — identical at `n_layer=2` and `n_layer=4` |
| Training | AdamW, lr 3e-3, 2200 steps, batch 4, seqlen 154, ~4 min on one CPU core |
| Final loss | **0.4964** against a theoretical floor of ~0.34 |
| Weight files | `weights_trained.json` 1.41 MB · `weights_untrained.json` 1.49 MB |

**Weights are shared across all four layers.** The layer loop never indexes them.
Confirmed three ways: identical param count at n_layer ∈ {2,4,6,12}; the paper
(p.18) gives the trainable set as 3nd + 2|Ω|d with no factor of L; and the export
schema already assumes it. **This is the strongest fact in the project** — the
layer control changes behaviour with literally the same weights, which kills
"you configured layer 2 differently" before it can be asked.

### 4.2 Trained model — fraction of neurons active

| Layer | Warm-up | Memorize | Repeat | Ratio |
|---|---|---|---|---|
| 0 | 10.17% | 12.84% | 13.91% | **0.92× — no effect** |
| 1 | 14.82% | 14.94% | 7.62% | 1.96× |
| **2** | **18.14%** | **15.77%** | **5.08%** | **3.10×** |
| 3 | 18.80% | 16.15% | 8.47% | 1.91× |

Layer-2 decay across the 8 presentations:
15.77 → 6.31 → 5.04 → 5.08 → 4.71 → 4.58 → 4.77 → 5.09

Per-layer ordering below layer 2 is unstable at n=1024. Only **"strongest in
layer 2, absent in layer 0"** is treated as reproducible. Layer 0 at 0.92× is
reported as *no effect*, never as an inversion — the sample does not support a
directional claim.

### 4.3 Untrained control (the falsification control)

| Layer | Warm-up | Memorize | Repeat | Ratio |
|---|---|---|---|---|
| 0 | 22.18% | 23.65% | 23.41% | 1.01× |
| 1 | 22.73% | 24.82% | 23.85% | 1.04× |
| 2 | 22.55% | 24.83% | 23.98% | 1.04× |
| 3 | 22.75% | 25.43% | 24.88% | 1.02× |

Trained layer 2 = 3.10×. Untrained = 1.04×. **The drop is learned, not
geometric.** This is the measured answer to "isn't that just ReLU on repeated
input?"

### 4.4 Cross-entropy by phase (answers the truth-vs-model question)

| Phase | Oracle surprisal | Model CE (of_target) | Layer-2 active |
|---|---|---|---|
| Warm-up | 0 bits | **0.113 bits** | **18.14%** |
| Memorize | 4.70 bits | 5.130 bits | 15.77% |
| Repeat | 0 bits | 0.766 bits | 5.08% |

Two alignments are reported because they disagree at phase boundaries:
`at_position` indexes by the position making the prediction (aligns with the
activation series); `of_target` indexes by the token being predicted (aligns with
oracle surprisal).

**This table falsified an earlier explanation. See Limitation 7.**

### 4.5 JS parity — the verification that makes "live" defensible

| Gate | Trained | Untrained |
|---|---|---|
| Active-count match, per layer per token | 0 mismatches / 308 | 0 / 308 |
| Zero/non-zero pattern (which neurons fired) | 0 disagreements / 315,392 | 0 / 315,392 |
| Scale-normalised error max\|a−b\| / max\|ref\| | 2.83e-7 | 4.84e-7 |
| Token 0 active | [0,0,0,0] | [0,0,0,0] |
| Cross-entropy max abs error | 1.17e-5 bits | 4.67e-7 bits |

End-to-end: JS phase means match PyTorch to 0.00e+0 on all twelve cells, because
the integer counts agree exactly. Layer 2 = 3.103× in both.

**Why the error gate is scale-normalised, not elementwise-relative:** `xy_sparse`
is a product of two ReLU outputs, so a value just above threshold is a dot product
that nearly cancelled — it carries the absolute rounding error of the
full-magnitude computation that produced it. Dividing by it measures cancellation,
not disagreement. Elementwise relative error is 1.4e-5 for |ref| > 0.1 and only
degrades on 63 of 33,250 non-zero values (0.19%). Any two float32 implementations
with different summation order behave this way. The gates are the well-posed
quantities.

**Negative controls** — each suspect was deliberately broken to prove the test
is not passing vacuously:

| Mutation | Zero-mismatches | Count-mismatches | Scale err |
|---|---|---|---|
| baseline | 0 | 0 of 308 | 2.8e-7 |
| RoPE interleave sign flipped | 13,068 | 290 of 308 | 3.5e-1 |
| LayerNorm eps removed | 4,151 | 178 of 308 | 7.9e-1 |
| head-concat → j*nh+h | 26,981 | 227 of 308 | 9.1e-1 |

Note the LayerNorm row: removing eps does **not** give an obviously broken page.
`relu` is written `acc > 0 ? acc : 0`, and `NaN > 0` is false, so every NaN
silently becomes 0 — producing 4,151 wrongly-dead neurons and a plausible-looking,
wrong artifact. That is why eps is a gate, not a code comment.

**Performance:** 160 ms at T=77 on the real UI path. Well under the <1s requirement.

### 4.6 Paper ↔ repo name mapping (a judge with both open will check this)

| Paper | Repo variable |
|---|---|
| D_x | `encoder` |
| D_y | `encoder_v` |
| E | `decoder` |

The measured variable is `xy_sparse` (the gated product), **not** `y_sparse`
(only the left factor). Confirmed from Definition 4, p.18:
`y(t,l) := (D_y · LN(a*(t,l)))⁺ ⊙ x(t,l)`.

---

## 5. Repository decision

**Work in the existing folder. Do not start from scratch.**

Rebuilding would discard the parity-verified `bdh.js`, the deterministic probe,
the exported weights, and the reference fixtures — 6–9 hours to arrive exactly
where the project already is, while re-opening the three bugs the parity test
had to chase down (RoPE interleave, LayerNorm eps, head-concat order).

It would also break the reproducibility lineage: "one command from a fresh clone
gives these exact numbers" depends on `bdh_probe.py`, `results.json`, and the
weight files being the same generation. Drift between script and results is the
exact failure this project already had once and fixed.

**Historical setup recipe — superseded by the 2026-09-08 audit. Do not execute this against the existing repository:**

```bash
mkdir -p probe docs
mv *_reference.json probe/
rm -f bdh_probe.py.orig
git init && git add -A && git commit -m "verified baseline: parity passing, 3.10x"
```

That commit is deadline insurance. Whatever happens next, there is a working,
verified artifact to fall back to.

---

## 6. Current file inventory

**Verified and working:**
`bdh_probe.py` · `results.json` · `weights_trained.json` · `weights_untrained.json`
`bdh.js` · `parity_test.js` · `trained_reference.json` · `untrained_reference.json`
`index.html` · `app.js` · `style.css`

**Page currently has:** claim bar · three curves (oracle surprisal / model CE /
active fraction) · four controls (layer, repeat count, word, trained-untrained) ·
mechanism panel with Definition 4 · seven-item honesty panel · sandbox tab ·
provenance footer.

**Missing entirely:** git repo · public URL · README · one-pager PDF · **blog PDF**
· license record · Transformer comparison · neuron grid · guided walkthrough.

---

## 7. Deliverables — the required path

| # | Deliverable | Status | Est. |
|---|---|---|---|
| 1 | Interactive artifact with integrated BDH module | ✅ built, local | — |
| 2 | Public artifact URL, opens with no sign-in | ❌ | 30 m |
| 3 | Public source repository | ❌ | 20 m |
| 4 | **Blog PDF** | ❌ | 2 h |
| 5 | One-page concept summary PDF (500–950 words) | ❌ | 1.5 h |
| 6 | Complete README | ❌ | 1 h |
| 7 | Setup instructions | ❌ | 15 m |
| 8 | Three primary papers cited beside claims | ⚠️ page only | 15 m |
| 9 | Source + license record | ❌ | 20 m |
| 10 | AI / asset disclosure | ⚠️ page only | 15 m |

**Required total ≈ 6.5 hours. Nothing below ships without this.**

The blog PDF and the one-pager are **two separate documents** (PS p.10 lists the
blog; p.11 specifies the one-pager). They have different jobs — see §10.

---

## 8. Enhancements, in value order

| # | Enhancement | Why it earns its place | Est. |
|---|---|---|---|
| E1 | **Guided walkthrough** | The PS says "guide, then sandbox." There is currently no guide — a visitor lands on three curves and four controls with no idea what to do. Biggest remaining gap in Learning effectiveness (15 pts) | 1.5 h |
| E2 | **Neuron grid** | The visceral moment. Reuses verified `bdh.js`, no new computation | 2 h |
| E3 | **Transformer equation panel** | Answers "how is this different from a Transformer" at zero risk | 45 m |
| E4 | **Transformer trained + measured** | A real measured comparison; PS explicitly permits labelled precomputed results | 1 h |
| E5 | **UI craft pass** | Craft, robustness, accessibility (10 pts) | 1.5 h |
| E6 | Transformer JS port + parity → live curve | Live side-by-side | 3 h |
| E7 | Dual neuron grids | The full playground | 3 h |

---

## 9. Execution order — and the one hard rule

```
STEP 0   git init + folder cleanup (§5)              20 m
STEP 1   E3  Equation comparison panel               45 m
STEP 2   E4  Train Transformer, get the number        1 h
STEP 3   E2  Neuron grid                              2 h
STEP 4   E1  Guided walkthrough                     1.5 h
STEP 5   E5  UI craft pass                          1.5 h
──────── HARD CUTOVER — documentation starts now ────────
STEP 6       Repo + GitHub Pages deploy              50 m
STEP 7       README + setup + licenses + disclosure 1.5 h
STEP 8       One-pager PDF                          1.5 h
STEP 9       Blog PDF                                 2 h
STEP 10      Final check (§13)                       30 m
```

**HARD RULE: when four hours of available time remain, stop building and start
documenting — whatever state the artifact is in.**

A half-polished artifact with complete documentation scores. A beautiful artifact
with no README and no PDFs is an *incomplete submission*, not a lower-scoring one.

E6 and E7 come after documentation, never before. E6 is the largest time sink on
the list and its outcome is uncertain; E4 already delivers an honest measured
comparison without it.

---

## 10. Specs for the remaining work

### 10.1 E3 — Transformer equation comparison

No new model, no computation. A comparison of published equations, labelled as
exactly that.

```
Transformer FFN:    h = relu(x · W₁)
                    One ReLU. A single threshold. Nothing multiplies it.

BDH (Definition 4): y = (D_y · LN(a*))⁺ ⊙ x
                    Two non-negative factors, multiplied. Either at zero
                    closes the gate.
```

Then one plain paragraph: a Transformer FFN neuron fires when a single weighted
sum clears zero; a BDH neuron fires only when two separate non-negative signals
are both positive — its own activation, and what the recurrent state reads out.
The second factor is where predictability enters. Neither equation contains a
sparsity hyperparameter.

Label: `STRUCTURAL COMPARISON — PUBLISHED EQUATIONS, NOT A MEASUREMENT`
Sources: Definition 4, arXiv 2509.26507 p.18 · Vaswani et al. 2017, eq. 2.

Do not imply anything empirical about a Transformer's activation count here.
That is E4's job.

### 10.2 E4 — Trained Transformer, measured

Build `probe/tiny_transformer.py`. Goal is a controlled comparison, not a good
language model.

**Matched config — each must equal the BDH probe's setting:**

| Setting | Value | Reason |
|---|---|---|
| `d_model` | 32 | same width |
| `n_layer` | 4 | same depth |
| `n_head` | 4 | same |
| `vocab_size` | 32 | same |
| `d_ff` | **1024** | matches BDH's 1024 measured neurons, so "fraction active" denominators are identical and the neuron grids are visually comparable |
| activation | **ReLU, never GELU** | GELU produces no exact zeros; "fraction non-zero" would be undefined. A judge catches this instantly |
| LayerNorm | parameter-free | removes a confound |
| positional | RoPE on Q and K, reusing `get_freqs()`/`rope()` from `bdh_probe.py` verbatim | positional scheme must not be a confound |
| weight sharing | **shared across layers**, like BDH | matches the parameter budget; unusual for a Transformer but standard in ALBERT / Universal Transformer. **Disclose it** |
| mask | causal `tril(diagonal=0)` | BDH uses `diagonal=-1`, but softmax over an all-`-inf` row is NaN. **Disclose this asymmetry**; exclude token 0 from all means on both sides |

**Identical training:** import `make_cycle` / `make_stream` / `phase_labels` /
`WARMUP` from `bdh_probe.py` — do not reimplement. Same seed discipline,
steps=2200, batch=4, seqlen=154.

**Measure:** `relu(x @ W₁)`, the FFN hidden activation, per token per layer.
Fraction non-zero out of 1024. The direct analogue of BDH's `xy_sparse`.

**Flags mirroring `bdh_probe.py`:** `--out` · `--export-weights` · `--untrained` ·
`--dump-reference` · `--dump-reference-untrained`.

**Report:** per-layer table with ratios · final loss beside BDH's 0.4964 ·
param count beside BDH's 100,352 · layer-2 ratio beside BDH's 3.10× · untrained
table beside BDH's 1.01–1.04×.

**All three outcomes are acceptable and get shipped as measured:**
- near 1.0× → clean contrast
- 1.5–2.5× → both respond, BDH's gate stronger. Still a real finding
- ≥ BDH → the BDH claim stands regardless; report that the gate is not the only
  route to predictability-sensitive sparsity. Genuinely interesting

If the number surprises you, that **is** the result.

Then one labelled block in the honesty panel:
`PRECOMPUTED — NOT LIVE` · "Trained on the identical corpus with an identical
parameter budget, a ReLU Transformer's FFN shows [X]× at layer 2, against BDH's
3.10×. Measured once offline and shipped as a number, not computed in your
browser. Config differences listed in the README."

Validity check before shipping: **if the Transformer's final loss is much worse
than 0.4964 it is undertrained and the comparison is invalid.** Train longer;
do not ship it.

### 10.3 E2 — Neuron grid

A 32 × 32 grid of 1024 cells = the selected layer's neurons at the selected token.
Filled = active, hollow = inactive. Sits directly under the curve chart.

- Driven by the **same per-neuron array `bdh.js` already computes.** No new code
  path, no new numbers, nothing unverified.
- Scrubs with a token slider; highlights the matching x-position on the curve
  above so both views stay locked.
- Play button steps ~8 tokens/sec so the learner *watches* the wall go dark at
  the memorize → repeat boundary. This is the moment the artifact exists for.
- Label: `LIVE · LAYER 2 · TOKEN 34 · 49 of 1024 active`
- **No wires between neurons.** Weights are shared and dense; there is no honest
  wiring diagram to draw. Fake wires are decoration, and the rubric punishes
  decoration.
- Mobile: reflow to 16 × 64.

### 10.4 E1 — Guided walkthrough

Three steps, a slim bar under the claim, dismissible, never modal. Store dismissal
in a JS variable only — **`localStorage` is unsupported in this environment.**

1. **"Watch what happens when the word repeats."** Repeat slider animates 1 → 8.
   Copy: *"You did nothing but repeat the word. 15.8% → 5.1%."*
2. **"Now break it. Switch to layer 0."** Layer control pulses. On click the curve
   stays flat. Copy: *"Same weights. No effect. This is a property of where you
   look, not of the network."*
3. **"Was it learned, or just ReLU?"** Weights toggle pulses. On click → untrained,
   flat everywhere. Copy: *"Untrained: 1.04×. The drop is learned, not geometric."*

Then "Explore freely" → dismiss. This is the sixty-second test the rubric names,
made literal.

### 10.5 E5 — UI craft pass

- **First paint:** preset already computed and drawn. No spinner, no empty axes,
  no Run button. If weights take >200 ms, show claim bar and chart frame
  immediately, fill curves when ready.
- **Mobile at 380px:** controls stack, chart keeps readable aspect, grid reflows
  to 16 × 64, no horizontal scroll. Test on a real phone.
- **Dark mode:** respect `prefers-color-scheme`; every colour via CSS variable.
- **Type:** one sans for prose, one mono for labels and numbers. Two weights only.
- **Motion:** ~200 ms ease on curve transitions. Nothing bounces. Respect
  `prefers-reduced-motion`.
- **Colour discipline:** blue = active fraction (the claim), orange = model CE,
  green = analytic truth. No fourth hue for decoration.
- **Numbers are the hero.** The ratio badge is the largest number on the page —
  readable across a room during the live defense.

---

## 11. The two PDFs

### 11.1 One-page concept summary (500–950 words)

Not a blog post. A self-contained briefing for a data scientist who has never seen
the submission. Judged on information density and intellectual ownership.

1. **The design pressure.** Sparsity in Transformers is usually imposed — top-k,
   MoE routing, a fixed budget. BDH's is not imposed anywhere.
2. **The mechanism.** Definition 4, one equation, explained. The gate.
3. **The evidence.** Our numbers beside the paper's. 3.10× at 1/64th scale
   against the paper's reported band. Untrained control at 1.04×.
4. **Comparison table.** BDH vs Transformer FFN on activation form, sparsity knob,
   predictability response, state interpretability. Include E4's measured number
   if available, labelled precomputed.
5. **BDH-CQ, one sentence.** "BDH-CQ (Engdahl et al., 2026) is a later reasoning
   system in the same family; the sparse-activation property demonstrated here is
   a BDH result and does not depend on BDH-CQ." The PS explicitly rewards saying a
   system has no direct role over inventing a connection.
6. **The honest gap.** Warm-up activity is highest despite lowest model
   uncertainty. The first explanation was measured and falsified. The current one
   is untested and labelled as such.
7. **Limitations.** 64× shrink, synthetic corpus, independent reimplementation.
8. **Three papers**, cited beside the claims they support.

Every sentence carries a definition, mechanism, evidence, limitation, or necessary
connection. Cut anything else.

### 11.2 Blog PDF (~1200–1800 words)

Narrative, first person. This is where the story lives — material that does not
fit a 950-word technical briefing but is the strongest thing the project has.

1. **The near-miss opening.** Trained on Shakespeare, got a flat line, nearly
   concluded the effect wasn't real. Then §6.4, and the discovery that Figure 14's
   model was never trained on language at all.
2. **What we built and why it had to be live.** The 64× shrink, the JS port, and
   the parity test — 0 mismatches across 315,392 values. "Live computation" is a
   claim that needs proving, not asserting.
3. **The falsification control.** How do you know it isn't just ReLU? Untrained
   weights, 1.04×. A number, not an argument.
4. **When we were wrong.** Limitation 7: we wrote an explanation, measured it, and
   it was false. Warm-up has the *lowest* model uncertainty and the *highest*
   activity. We rewrote it on the page rather than quietly dropping it.
5. **Layer 0.** The best teaching moment is where our own claim stops working —
   and it confirms what the paper already says about higher layers.
6. **What we did not do, and why.** No live Transformer port without parity. No
   free-paragraph input on a model trained on one synthetic protocol. BDH-CQ
   cited, never run — no public checkpoint exists.
7. **What we'd do next.** The cold-start hypothesis is untested: if warm-up
   activity is state re-establishment, cycle 2 should be lower. A falsifiable
   prediction we did not have time to run.

Be ready to defend every sentence and citation. Do not pad.

### 11.3 Primary papers (≥3 required, 2022–2026)

| Paper | Cite beside |
|---|---|
| Kosowski, Uznański, Chorowski, Stamirowska, Bartoszkiewicz — *The Dragon Hatchling*, arXiv **2509.26507** (2025) | Definition 4, and the Figure 14 target band |
| Herrmann, Csordás, Schmidhuber — *Measuring In-Context Computation Complexity via Hidden State Prediction*, arXiv **2503.13431** (2025) | the input-complexity / predictability claim (cited by BDH §6.4 for this point) |
| You et al. — *Spark Transformer: Reactivating Sparsity in FFN and Attention*, arXiv **2506.06644** (2025) | sparsity engineered into Transformer FFNs, for contrast |
| *(optional 4th)* Engdahl et al. — *BDH-CQ*, arXiv **2608.09888** (2026) | the one-sentence BDH-CQ placement |

---

## 12. Disclosed limitations — all eight, visible in the artifact

1. **Layer 0 shows no effect** (0.92×) — framed as *confirming* the paper's own
   statement about higher layers, not as our discovery. Reported as "no effect",
   never as an inversion.
2. **64× neuron shrink** (65536 → 1024). The ratio reproduces; absolute levels run
   higher than the paper's.
3. **Synthetic task only.** No claim is made about BDH on natural language.
4. **Token 0 always reads 0.0%** — attention is `tril(diagonal=-1)`, so token 0
   attends to nothing. A code property, not a finding. Excluded from means.
5. **Independent reimplementation** — faithful to `pathwaycom/bdh` with a
   measurement hook added and the config shrunk. **Not an official BDH model.**
6. **BDH-CQ cited, never run.** No public checkpoint exists.
7. **Warm-up shows the highest activity and we cannot say why.** Layer 2 sits at
   18.14% through warm-up against 5.08% on repeats — yet model cross-entropy on
   warm-up is 0.113 bits, *lower* than the 0.766 bits on repeats. Activity tracks
   neither the oracle's uncertainty nor the model's. **An earlier draft explained
   this as "activity tracks the model's uncertainty" — we measured that and it is
   false. It is corrected here rather than quietly dropped.** The most plausible
   remaining explanation is state re-establishment at the start of a cold
   sequence — **untested, and labelled as such.**
8. *(if E4 ships)* **Transformer comparison config deviations** — shared weights,
   parameter-free LayerNorm, mask `diagonal=0`. All disclosed in the README.

---

## 13. Live defense — questions and answers

| Judge asks | Answer |
|---|---|
| "Isn't that just ReLU on repeated input?" | Flip to untrained. 1.04×, flat in every layer. Trained layer 2 is 3.10×. The effect is learned. |
| "Is this live or precomputed?" | Live. `bdh.js` runs the forward pass in the browser. Only the weights are shipped as data. Anything precomputed is labelled. |
| "How do you know the JS matches the Python?" | Parity test: 0 active-count mismatches across 308 layer-tokens, 0 zero-pattern disagreements across 315,392 values. We broke RoPE, LayerNorm eps, and head-concat deliberately to confirm the test isn't passing vacuously. |
| "Which variable are you measuring?" | `xy_sparse` — the paper's `y` in Definition 4. The variable literally named `y_sparse` in the repo is only the left factor, before the gate. |
| "If the weights are shared, why does layer 2 differ from layer 0?" | Because the residual stream has been transformed by the layers before it. Layer 2 sees a more processed representation, and that's where the predictability signal lives. Same weights, different input. |
| "Why is warm-up highest if it's predictable?" | Limitation 7. Activity tracks neither the oracle's uncertainty nor the model's. Our first explanation was falsified by our own measurement; the current one is untested and labelled. |
| "Is this an official BDH model?" | No. Independent reimplementation at 1/64th scale, labelled throughout. |
| "How do I reproduce it?" | `python bdh_probe.py` — one command, CPU only, about four minutes. Deterministic under the fixed seed. |

---

## 14. The fence — deliberately not built

Each was considered and rejected. Do not re-add without an explicit decision.

- **RoPE frequency buckets** (Figure 14b) — requires explaining RoPE to an
  audience defined as not knowing RoPE.
- **Free-paragraph text input** — the model was trained on one synthetic protocol.
  Paragraphs produce convincing-looking noise unrelated to the claim. The sandbox
  already allows free letters and is labelled off-distribution.
- **Wires between neurons** — weights are shared and dense; no honest wiring
  diagram exists to draw.
- **Direction B** (synaptic memory, Figs 12–13) — needs Europarl-scale bilingual
  data and a from-scratch recurrent-state reimplementation.
- Training in the browser · 3D graphics · a general "BDH playground" · a second
  topic · any backend.

**Test for any new idea:** does it help the learner reproduce the claim or find its
boundary? If not, it is decoration.

---

## 15. Final check before submitting

- [ ] Artifact URL opens in incognito, no sign-in, no console errors
- [ ] Renders correctly at 380px on a real phone
- [ ] Repo URL public, all files present, no secrets
- [ ] Both PDFs open; one-pager between 500 and 950 words
- [ ] README covers claim, learner, prerequisites, objectives, architecture,
      live-vs-precomputed labels, reproduction command, credits, licenses
- [ ] Three primary papers cited beside claims in README, page footer, both PDFs
- [ ] AI disclosure in README and page footer
- [ ] "Not an official BDH model" in README, page, and both PDFs
- [ ] `python bdh_probe.py` runs clean from a fresh clone
- [ ] Every number on the page traceable to `results.json` or a cited source

---

## 16. Correction log

- **`xy_sparse` vs `y_sparse`** — confirmed against Definition 4 (p.18), not just
  source code. The `⊙ x` gate means the code's `xy_sparse` is the paper's `y`.
- **Layer-0 framing** — changed from "our discovered limitation" to "confirms the
  paper's own statement about higher layers."
- **Limitation 7** — the explanation "activity tracks the model's uncertainty" was
  measured and **falsified** (warm-up CE 0.113 bits vs repeat 0.766 bits, yet
  warm-up activity is 3.6× higher). Rewritten, not dropped.
- **Parity tolerance** — 1e-4 on active *fractions* is impossible at 1024 neurons
  (granularity 1/1024 ≈ 9.8e-4). Gated on exact integer counts, exact zero
  pattern, and scale-normalised error instead.
- **Weight export size** — `build.md` §4.1 said 392 KB (raw binary). As JSON
  nested lists it is 1.41 MB + 1.49 MB ≈ 2.9 MB. Note in the README loading section.
- **`pathway.md` D1** — "identical to the paper's Appendix E listing" is false.
  Structurally equivalent, but every identifier differs and dropout defaults
  differ (0.05 vs 0.1). Say "structurally identical to Appendix E".
- **Blog PDF** — a separate required deliverable from the one-pager (PS p.10).
  Omitted from `build.md` §7 and Prompt 5; corrected here.
- **"fact"** — the paper's *name* for the memorized item, not a literal example
  word (the word is random and 8 letters; "fact" is 4). Use "the memorized word".

### Execution audit correction — 2026-09-08

The existing repository, README, LICENSE, and origin remote were confirmed. The probe remains at the root; current fixtures are `probe/reference.json` and `probe/untrained_reference.json`. The inventory and blanket setup commands above are historical. See `docs/baseline-audit.md` and `PHASE-PROMPTS.md` for token-0 conventions, actual comparison parameter counts, supported mechanism wording, and the corrected parity rationale. Baseline evidence is preserved; current execution status lives in `docs/execution-status.md`.
