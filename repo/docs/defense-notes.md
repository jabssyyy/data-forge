# Live defense notes

## The claim and its boundary

The headline is about the shipped small, trained BDH on one synthetic memorize-to-repeat transition. At layer 2, activity falls from 15.7715% to 5.0834%, a 3.102573× ratio. Layer 0 gives 0.923501×: no comparable reduction. Neither result is an architecture-wide theorem.

## Was this learned?

The same canonical input through seed-0 random BDH weights gives 1.035416× at layer 2. Switch the shared trained/random control to show the control. This supports training dependence in this experiment; it does not isolate a universal causal mechanism.

## Which variable?

The paper's gated y is `xy_sparse`, not the intermediate `y_sparse`. A cell lights only when the measured product is positive. Four heads of 256 coordinates give 1,024 cells. No cell positions imply wiring or correspondence between architectures.

## Is it live?

`bdh.js` and `transformer.js` run their forward passes in the browser. The chart and both grids respond to the same live inputs. The separate fixed comparison table is PRECOMPUTED, and trained/random weights are exported data. Playback animates selection inside already computed tensors; it does not rerun inference for each frame.

## Why trust the port?

Both trained and random ports pass exact active counts and zero patterns against Python reference tensors, plus finite-value and numerical gates. BDH compares 315,392 raw values per weight set. The Transformer suite also detects independently mutated masks, RoPE signs, and head layouts. Browser tests check the rendered cell counts across 616 combinations of token, layer, and weight state for both grids.

## Shared weights, different layers?

Each depth applies the same learned tensors to a different residual representation, transformed by earlier depths. The settings do not give layer 2 its own weight matrices. This is a code property, not evidence that learning is irrelevant.

## Why is warm-up so active?

We do not know. Its target-aligned CE is 0.112845 bits, lower than repetition's 0.766147 bits, despite higher activity. That contradicts a simple global uncertainty explanation. A cold-start hypothesis remains untested. Do not present it as the demonstrated cause.

## Why 18.14% in old results but 19.65% on the page?

Historical Python warm-up means include structurally silent token 0. The UI and comparison policy exclude it, averaging positions 1–12. Both are recorded; memorize/repeat means and the 3.10× ratio are unchanged. Transformer token 0 can be nonzero because its mask includes the diagonal.

## Does BDH beat the Transformer?

No ranking is claimed. The valid ReLU Transformer control gives 1.581590× at layer 2 and has lower absolute active fractions than BDH; layer 3 goes in the other direction. Parameters differ (71,680 versus 100,352), as do attention operators/masks, positional dimensions and residual paths. Both models respond at layer 2 in this experiment. Activation counts alone establish neither compute savings nor reasoning quality.

## Is this official? Does it run BDH-CQ?

Not an official BDH model. This is an independent implementation at 1/64th the paper's neuron count. BDH-CQ is cited as a later related system; it is not implemented or evaluated.

## Reproduction

Start with README commands. `node parity_test.js` and `node transformer_parity_test.js` verify the shipped exports. Training in a fresh clone succeeds, but this machine produced 3.365854× rather than the original 3.102573×. The preserved baseline is not replaced with the rerun; `reproduction-check.json` records the difference. Runtime/platform differences must be disclosed rather than tuned away.
