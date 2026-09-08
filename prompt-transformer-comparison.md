# Transformer comparison — Stages A and B

Paste these one at a time. Each stage ships on its own.

**Design rule that governs everything below:** the headline claim stays BDH-only.
The Transformer is a contextualizing control, not part of the claim. Whatever number
it produces gets reported honestly. Do not tune, reroll, or reframe to get a
preferred result.

---

## STAGE A — Equation comparison (45 min, zero risk)

```
Add a structural comparison to the mechanism panel in index.html.

No new model, no new computation. This is a comparison of published equations,
and it must be labelled as exactly that.

Show the two activation mechanisms side by side:

  Transformer FFN:   h = relu(x · W1)
                     one ReLU. A single threshold. Nothing multiplies it.

  BDH (Definition 4): y = (D_y · LN(a*))+ ⊙ x
                     two non-negative factors, multiplied. Either one at zero
                     closes the gate.

Below them, one short paragraph in plain language:

"A Transformer FFN neuron fires when a single weighted sum clears zero. A BDH
neuron fires only when two separate non-negative signals are both positive — the
neuron's own activation, and what the recurrent state reads out. The second factor
is where predictability enters: when the state already predicts the next token,
that factor collapses and the gate closes. Neither equation contains a sparsity
hyperparameter."

Label the panel clearly:
  STRUCTURAL COMPARISON - PUBLISHED EQUATIONS, NOT A MEASUREMENT

Sources beside the claims:
- BDH form: Definition 4, arXiv 2509.26507, p.18
- Transformer FFN form: Vaswani et al. 2017, eq. 2 (standard position-wise FFN)

Do not imply anything about what a Transformer's activation count would do
empirically. That is Stage B's job and it has not been measured yet.
```

**Checkpoint:** panel renders, both equations legible on mobile, label present.

---

## STAGE B — Train the Transformer, get the number (~1 hour)

```
Build tiny_transformer.py in this directory. The goal is a controlled comparison
against the BDH probe, not a good language model.

MATCHED CONFIG - every one of these must equal the BDH probe's setting:
- d_model      = 32
- n_layer      = 4
- n_head       = 4
- vocab_size   = 32
- d_ff         = 1024      (matches BDH's 1024 measured neurons, so the
                            "fraction active" denominators are identical)
- activation   = ReLU      (NEVER GELU - GELU produces no exact zeros, which
                            makes "fraction non-zero" undefined. This is
                            non-negotiable and a judge would catch it instantly.)
- LayerNorm    = parameter-free (elementwise_affine=False, bias=False), like BDH
- positional   = RoPE on Q and K, reusing get_freqs()/rope() from bdh_probe.py
                 verbatim so the positional scheme is not a confound
- weight sharing = SHARED across all four layers, like BDH. One attention block,
                 one FFN, reused at every depth. Disclose this: it is unusual for
                 a Transformer (though standard in ALBERT / Universal Transformer)
                 and it is what makes the parameter budget match.
- attention mask = causal tril(diagonal=0). BDH uses diagonal=-1, but softmax
                 over an all -inf row is NaN, so the Transformer cannot match it.
                 DISCLOSE THIS ASYMMETRY. Exclude token 0 from all reported means
                 on both sides.

IDENTICAL TRAINING - reuse the exact functions from bdh_probe.py:
- Same make_cycle / make_stream / phase_labels. Import them, do not reimplement.
- Same WARMUP (the fixed 13 letters), same seed discipline.
- steps=2200, batch=4, seqlen=154, AdamW, lr tuned only if it fails to converge -
  and if you change lr, say so and report both.

MEASURE: relu(x @ W1), the FFN hidden activation, per token, per layer.
Fraction non-zero out of 1024. This is the direct analogue of BDH's xy_sparse.

FLAGS, mirroring bdh_probe.py:
- --out results_transformer.json
- --export-weights weights_transformer.json  (same JSON schema style as build.md 4.4)
- --untrained
- --dump-reference / --dump-reference-untrained

REPORT:
1. Per-layer warmup / memorize / repeat table with ratios, all four layers.
2. Final training loss, beside BDH's 0.4964, so convergence is comparable.
3. Parameter count, beside BDH's 100,352.
4. The layer-2 ratio, stated plainly beside BDH's 3.10x.
5. The untrained Transformer table, beside BDH's untrained 1.01-1.04x.

DO NOT tune toward any expected outcome. Three outcomes are all acceptable and all
get shipped as measured:
  - Transformer near 1.0x  -> clean contrast
  - Transformer 1.5-2.5x   -> both respond, BDH's gate stronger. Still a real finding.
  - Transformer >= BDH     -> the BDH claim stands regardless; report that the gate
                              is not the only route to predictability-sensitive
                              sparsity. That is a genuine and interesting result.
If the number surprises you, that IS the result. Report it.

Then add ONE labelled block to the honesty panel in index.html:
  PRECOMPUTED - NOT LIVE
  "Trained on the identical corpus with an identical parameter budget, a ReLU
   Transformer's FFN shows [X]x at layer 2, against BDH's 3.10x. Measured once
   offline and shipped as a number, not computed in your browser. Config
   differences are listed in the README."
The PS explicitly permits clearly labelled precomputed results, so this is valid
- but the label must be as prominent as the number.
```

**Checkpoint:** you have `results_transformer.json`, a real ratio, and one honest
labelled sentence on the page. This is a complete, shippable comparison.

---

## Stages C and D (only after A, B, and the README/one-pager are done)

- **C** — port the Transformer forward pass to JS, parity-test it to the same
  standard as `bdh.js` (exact integer active counts, exact zero pattern,
  scale-normalised error < 1e-4), then draw its curve beside BDH's. ~3 h.
- **D** — two neuron grids side by side, both driven by their own verified
  forward pass, scrubbing token by token. ~3 h.

Do not start C until B's number is in hand. If B produces a muddy result, C and D
are three hours spent making a muddy result more prominent.

---

## What this does NOT change

- The headline claim stays exactly as written. It is about BDH.
- Every BDH number on the page stays as measured.
- The seven disclosed limitations stay. Add an eighth for the Transformer's
  disclosed config deviations (shared weights, parameter-free LN, mask diagonal).
