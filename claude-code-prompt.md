# Claude Code — build prompts (updated after verification)

Paste these **one at a time, in order**. Wait for each to finish before pasting the next.
`build.md` must be in the working directory. It is the specification.

**PROMPT 1 is DONE.** The verification run confirmed build.md §5 is mathematically correct
and found five things to fix. They are baked into Prompts 2–5 below.

---

## PROMPT 2 — Fix the probe and produce the substrate

```
Read build.md §4.3 and §4.4. Fix bdh_probe.py and rerun it clean.

Required config changes (these make the script reproduce results_small.json):
- n_embd = 32
- mlp_internal_dim_multiplier = 32  (gives n_total = 1024, N/head = 256)
- Training defaults: steps=2200, batch=4, seqlen=154
- Replace hardcoded /home/claude/probe/results.json with --out CLI arg, default ./results.json
- Replace nn.Buffer with register_buffer (portability fix — log this as intentional deviation)

Weight init fix (the current script is slightly unfaithful to pathwaycom/bdh):
- Add an init_weights function that initialises nn.Embedding with normal_(std=0.02),
  matching the reference repo. Call self.apply(init_weights) in BDH.__init__.

New flags to add:
- --export-weights PATH  writes weights_trained.json in the schema from build.md §4.4:
  keys = config, embed, encoder, encoder_v, decoder, lm_head, warmup, provenance.
  All arrays as nested Python lists (JSON-serialisable). warmup is the fixed 13-int list.
- --untrained  skips training, exports weights_untrained.json with random-init weights
  (same config, same seed=0 for reproducibility).

Keep the xy_sparse capture hook exactly as is. Do not change which variable is measured.

After running:
1. Print the per-layer warmup/memorize/repeat table and layer-2 ratio.
2. Compare against build.md §4.3 expected table. If numbers differ, report the real ones —
   do not adjust anything to match. The real numbers are what we ship and defend.
3. Answer build.md §13 question 2: measure per-token cross-entropy during warm-up and
   compare it to the active-neuron fraction in the same phase. Give actual values.
4. Confirm the weights-shared-across-layers finding: run a quick check that the param count
   is identical at n_layer=2 and n_layer=4. Print both counts.
5. Regenerate probe.md §11 from the real results.json output (the current documented keys
   per_layer_summary and layer2_series do not exist — the real key is per_layer → series).

Deliver: results.json, weights_trained.json, weights_untrained.json, updated probe.md.
```

**Checkpoint:** you have three JSON files and real numbers. Layer-2 ratio should be near 3.3×.
The param count must be the same at n_layer=2 and n_layer=4 — that confirms shared weights.

---

## PROMPT 3 — JavaScript port with parity test

```
Port the BDH forward pass to plain JavaScript as bdh.js.
Follow build.md §5 for the math. Apply these five corrections from the verification run:

CORRECTION 1 — LayerNorm (critical, prevents NaN crash):
  Use: (v - mean) / sqrt(mean((v - mean)²) + 1e-5)
  The eps=1e-5 is mandatory. Token 0 attends to nothing so its vector is all zeros.
  Without eps, you get 0/0 = NaN. NaN propagates through every subsequent token
  via the residual. The page goes blank with no error. This is the most important fix.

CORRECTION 2 — Head concatenation order:
  After computing xy_sparse for all heads, combine them as:
    transpose(1,2) first → shape becomes (B, T, nh, N)
    then reshape → (B, T, nh*N)
  This is head-major order. Getting it backwards produces plausible-looking but wrong curves.
  Add an explicit comment in bdh.js: "// head-major concat: transpose then reshape".

CORRECTION 3 — Weights are shared across all four layers:
  The loop runs the same encoder/encoder_v/decoder weights at every layer depth.
  There are no separate weight matrices per layer.
  Add a prominent comment in bdh.js: "// weights are shared across layers —
  behaviour differs by layer only because the residual stream transforms between them".
  This is a key fact for the live defense.

CORRECTION 4 — Name mapping (paper vs repo):
  Paper D_y  =  repo encoder_v  (the right-side encoder in the gate)
  Paper E    =  repo decoder    (confusingly named)
  Add a comment block at the top of bdh.js with this mapping.
  The mechanism panel will show D_y from Definition 4 — the comment clarifies the mapping
  for anyone reading the code alongside the panel.

CORRECTION 5 — Dropout:
  Omit dropout in the JS port (inference mode). Config has dropout=0.0 anyway.
  Note this in a comment: "// dropout omitted: inference only".

Other constraints:
- Plain JS with Float32Array and flat loops. No ML library, no WebGL, no WASM, no CDN.
  ~58M multiply-adds for T=77 — plain JS is fast enough.
- Attention is strictly lower-triangular, tril(diagonal=-1).
  Token 0 will read exactly 0.0% active in all layers. This is correct, not a bug.
- Export per run: active-neuron fraction per token per layer, cross-entropy in bits, logits.

Parity test (non-negotiable — do this before touching the UI):
- Add --dump-reference to bdh_probe.py: runs one fixed 77-token sequence, writes
  raw xy_sparse values (not fractions) and per-token cross-entropy to reference.json.
- Write parity_test.js (Node script): runs the same sequence through bdh.js, loads
  reference.json, computes max absolute relative error on raw xy_sparse values and
  checks exact integer active-count match per layer per token.
- Target: max abs rel error < 1e-4 AND exact integer count match.
  (Do NOT test active fractions to 1e-4 — with 1024 neurons the granularity is
   1/1024 ≈ 9.8e-4, so that tolerance is impossible by construction.)
- If parity fails, the most likely culprits in order: RoPE interleave sign convention,
  LayerNorm eps placement, head-concat order. Debug those first.

Do not write any HTML until parity passes.
```

**Checkpoint:** `node parity_test.js` prints max rel error < 1e-4 and "integer counts: MATCH".
If it doesn't, fix it here before moving on. This is the hinge of the whole build.

---

## PROMPT 4 — The page

```
Build the artifact: index.html, app.js, style.css.

Read the frontend-design skill before writing any CSS. This is judged on craft and mobile
usability (10/100 pts) and must not look like a class project.

Layout, top to bottom — nothing else, no extra sections:

1. CLAIM BAR (always visible, sticky)
   The one sentence: "In a trained BDH, the fraction of active neurons in layer 2 falls
   roughly 3× the moment the next letter becomes predictable — with the same weights,
   the same input length, and no sparsity setting touched anywhere."

2. MAIN CHART (three curves over token position, x-axis = token index 0…T)
   - Curve 1 "Oracle surprisal" — analytic, computed in JS from the sequence definition,
     NO model involved. Warm-up tokens = 0 bits (fixed, deterministic). The 8 novel
     letters = log2(26) = 4.70 bits each. Repeated letters = 0 bits.
     Label this curve clearly as TRUTH / ANALYTIC.
   - Curve 2 "Model cross-entropy" — live, from bdh.js. Per-token −log2(p(next token)).
     Label as LIVE / MODEL.
   - Curve 3 "Active neuron fraction" — live, from bdh.js, at the selected layer.
     Label as LIVE / MODEL (THE CLAIM).
   Make it visually obvious which is truth and which are measurements.
   Annotate token 0 (always 0.0% — attention is tril(diagonal=-1), no look-back).
   Do NOT silently average token 0 into the warm-up number.

3. FOUR CONTROLS — nothing else, no decorative sliders
   - Layer: segmented button, 0 / 1 / 2 / 3. Default: 2.
   - Repeat count: slider 1–8, integer steps. Default: 8.
   - The word: 8-letter free text input, a–z only. Default: "surprise".
   - Trained / Untrained: toggle. Swaps weight arrays. Default: Trained.
   Every change recomputes synchronously. All four controls respond in under 200ms.

4. MECHANISM PANEL (explains WHY the meter moves — BDH module)
   Show Definition 4 as a rendered equation:
     y(t,l) = ( D_y · LN( a*(t,l) ) )⁺  ⊙  x(t,l)
   Then three plain sentences:
   a. "y is the vector we count non-zeros in. It is two non-negative vectors multiplied
      element-by-element — a gate that needs both sides to be positive."
   b. "When the recurrent state already predicts the next token, the left factor collapses
      toward zero and the gate closes. No sparsity setting causes this — the equation
      has no sparsity hyperparameter."
   c. "In the pathwaycom/bdh implementation, D_y is the variable called encoder_v and
      E is called decoder. The weights are shared across all four layers — layer 2
      behaves differently from layer 0 only because the residual stream has been
      transformed by the layers before it."
   Source line: "(Definition 4, Dragon Hatchling paper, arXiv 2509.26507, p.18)"

5. HONESTY PANEL (always visible — NOT a collapsed accordion)
   All seven limitations from build.md §9, as a numbered list:
   1. Layer 0 shows no effect — confirming the paper's own statement about higher layers.
   2. 64× neuron shrink (65536 → 1024). The ratio reproduces; absolute levels differ.
   3. Synthetic task only — no claim is made about BDH on natural language.
   4. Token 0 always reads 0.0% (attention is tril(diagonal=-1), a code property).
   5. Independent reimplementation — not an official BDH model.
   6. BDH-CQ (Engdahl et al., 2026) is a later reasoning system in the same family;
      the sparse-activation property here is a BDH result, not a BDH-CQ result.
   7. Warm-up shows the highest activity despite being predictable to an oracle (21.4%
      in layer 2 vs 15.9% memorize). Activity tracks the MODEL'S uncertainty, not the
      oracle's. The claim in the bar above is scoped to the memorize → repeat transition.

6. SANDBOX TAB (second view, clearly separated)
   Free letter entry. Permanent label, always on screen:
   "OFF-DISTRIBUTION. This model was trained only on the synthetic protocol above.
    Behaviour here is not evidence for or against the claim."

Behaviour requirements:
- Page opens with a preset already running. No Run button. No blank canvas.
  First thing a visitor sees: the three curves moving and the claim bar above them.
- Mobile layout at 380px width. Test it.
- No backend, no API calls. Everything static. Must work as GitHub Pages.
- Label every element: LIVE, ANALYTIC, PRECOMPUTED, SYNTHETIC — whichever applies.
  The README has to say which parts are live and which aren't; the page should show it.
```

**Checkpoint:** open on your phone at 380px. Claim bar visible, three curves rendered,
layer toggle works, trained/untrained toggle causes a visible change. If not, not done.

---

## PROMPT 5 — Documentation and deploy

```
Write README.md and the one-page concept summary PDF, then deploy.

README.md must cover (per PS p.10 requirements):
- The one-sentence claim.
- Intended learner and prerequisites (defined in build.md §2).
- Learning objectives (the four from build.md §2).
- Artifact architecture: role of every major component.
- Which parts are LIVE (bdh.js forward pass), ANALYTIC (oracle surprisal),
  PRECOMPUTED (weight files), SYNTHETIC (the letter corpus). State this explicitly.
- How to reproduce: one command → python probe/bdh_probe.py --export-weights weights_trained.json
- Credits and licenses.
- Full AI-assistance disclosure: Claude (planning/specification), Claude Code (implementation).
  The PS requires this to be explicit.
- State explicitly: "This is an independent reimplementation at 1/64th the paper's neuron
  count (n=1024 vs n=65536). It is not an official BDH model."

Cite three primary papers beside the specific claims they support (not in a bibliography dump):
- arXiv 2509.26507 (Dragon Hatchling, Kosowski et al. 2025) — beside Definition 4 and
  the Figure 14 target numbers (4.0–7.5% memorize, ~2.5% repeat).
- arXiv 2503.13431 (Herrmann, Csordás, Schmidhuber 2025) — beside the sentence about
  input complexity correlating with predictability of internal representations.
- arXiv 2506.06644 (You et al. 2025, Spark Transformer) — beside the sentence placing
  BDH's native sparsity in context of sparsity research in Transformers.

One-page concept summary PDF (500–950 words, build.md §7):
This is not a blog post. It is a self-contained technical briefing for a data scientist
who has never seen the submission. Every sentence must contribute a definition, mechanism,
piece of evidence, a limitation, or a necessary connection. No padding.
Structure:
  - The problem: what fixed-budget sparsity can't do.
  - The mechanism: Definition 4, in one equation, explained.
  - The evidence: our reproduction numbers vs the paper's numbers.
  - BDH-CQ placement: one sentence only —
    "BDH-CQ (Engdahl et al., 2026) is a later reasoning system in the same family;
     the sparse-activation property demonstrated here is a BDH result."
  - The honest gap: warm-up activity vs oracle surprisal (Limitation 7).
  - The limitation: synthetic task only, 64× shrink.
  - References: the three papers above.
Include a compact comparison table: BDH vs a standard Transformer FFN on the dimensions
that matter for this claim (activation count, gate mechanism, sparsity knob, interpretability).

Then:
1. Create a GitHub repo, push everything.
2. Enable GitHub Pages (root, main branch).
3. Test the URL in an incognito window. Must open with no sign-in.
4. Give me the public URL.
```

---

## Working rules (paste these with Prompt 2 if you haven't already)

```
Working rules for this build:

- build.md is the specification. If you think something in it is wrong, say so —
  do not silently deviate.
- Never adjust a measured number to match an expected one. If the rerun gives
  different results, we ship the different results.
- Every claim on the page must be traceable to the BDH paper, the pathwaycom/bdh
  source, or our own measured output. No claim from memory.
- I have to defend every line of this live to the authors of the paper. Write code
  I can trace and explain. Prefer explicit loops over dense one-liners in bdh.js.
- Do not add features. The fence in build.md §12 is deliberate.
- Weights are shared across all four layers — document this prominently in bdh.js.
  The live defense depends on being able to explain it.
```

---

## What changed from the original prompts (and why)

Prompt 1 (verification) is done. Five findings were incorporated:

1. **LayerNorm eps=1e-5** — without it, token 0 (all-zero vector) causes NaN that
   cascades through every subsequent token. Page goes blank silently. Critical fix.
2. **Head concat: transpose then reshape** — head-major order. Wrong order produces
   plausible-looking but numerically wrong curves.
3. **Weights are shared across all four layers** — the loop never indexes by depth.
   This is the strongest live-defense fact: "same weights, different behaviour by layer
   only because the residual stream has been transformed."
4. **Paper/repo name inversion** — repo `decoder` = paper `E`; repo `encoder_v` = paper `D_y`.
   A judge with both open would catch it. Documented in bdh.js and the mechanism panel.
5. **Parity tolerance corrected** — 1e-4 on active fractions is impossible at 1024
   neurons (granularity = 1/1024 ≈ 9.8e-4). Test raw xy_sparse values instead.

Also added: embed init fix (N(0,0.02) not N(0,1)) and BDH-CQ one-sentence placement
in the one-pager.
