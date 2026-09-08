# Offline Transformer results

PRECOMPUTED. Canonical 77-token preset only. This is one synthetic experiment, not an architecture ranking or a causal isolation of multiplicative gating.

The predeclared predictive-comparability gate passed on the sole seed-0, 2,200-step run. No extension, retry or tuning was performed. [Protocol](transformer-protocol.md) records the choices before training.

| Model | Parameters | Final minibatch CE (nats) | Evaluation CE (bits) | Target-repeat CE (bits) |
|---|---:|---:|---:|---:|
| BDH | 100,352 | 0.49636310338974 | 1.122358 | 0.766147 |
| ReLU Transformer | 71,680 | 0.5292913913726807 | 0.638092 | 0.123844 |
| Untrained ReLU Transformer | 71,680 | untrained | 4.984673 | 4.982838 |

Gate thresholds: overall CE ≤1.683537 bits and target-repeat CE ≤1.149221 bits. The control predicts this sequence well enough under this declared criterion; that does not equalize learned functions.

Activity is count(h > 0)/1024. Activity means exclude token 0: 12 warm-up, 8 memorize and 56 repeat positions. CE uses all 76 available next-token predictions, with predictor and target alignments stored separately.

| State | Layer (zero-based) | Warm-up % | Memorize % | Repeat % | Memorize / repeat |
|---|---:|---:|---:|---:|---:|
| Trained | 0 | 17.5374 | 36.8042 | 30.0834 | 1.223407× |
| Trained | 1 | 7.9997 | 1.9653 | 1.5084 | 1.302890× |
| Trained | 2 | 16.1133 | 1.9775 | 1.2503 | 1.581590× |
| Trained | 3 | 10.6934 | 3.0029 | 5.2961 | 0.567007× |
| Untrained | 0 | 49.8454 | 49.1089 | 49.1141 | 0.999893× |
| Untrained | 1 | 49.9430 | 49.3408 | 49.3844 | 0.999117× |
| Untrained | 2 | 49.9593 | 49.4019 | 49.4873 | 0.998273× |
| Untrained | 3 | 50.0326 | 49.6582 | 49.6164 | 1.000844× |

Layer 2: the trained Transformer has 1.581590× activity contrast, versus the baseline BDH’s approximately 3.10× on the same sequence. The Transformer also becomes sparser in repeat at this depth; gating is not the only route to this pattern. Layer 3 reverses direction (0.567007×). Do not frame this as a uniform all-layer result. Its absolute active fraction is lower than BDH’s, which also makes ratios alone insufficient to rank sparsity.

Both models share weights across four depths, use parameter-free LayerNorm and measure 1,024 neurons. They have different parameter budgets (71,680 versus 100,352), attention operators/masks (scaled softmax diagonal 0 versus unnormalized diagonal -1), RoPE head widths (8 versus 256), and residual/FFN pathways. ReLU’s exact zeros make the present count informative; GELU nonzero fraction is defined but generally uninformative for this measurement.

Training corpus and sampled batches replay the baseline code using its post-initialization Torch RNG state. Exact schedule is archived in `probe/transformer_batch_schedule.json`; historical BDH indices were not archived, so this validates code-level replay rather than independent historical identity. CPU PyTorch 2.7.0, two threads, float32.

Reproduce from the repository root:

```sh
python3 -m unittest discover -s probe -p test_tiny_transformer.py
python3 probe/tiny_transformer.py --out /tmp/results_transformer.json --export-weights /tmp/weights_transformer.json --dump-reference /tmp/transformer_reference.json --dump-reference-untrained /tmp/transformer_untrained_reference.json
python3 probe/tiny_transformer.py --untrained --out /tmp/results_transformer_untrained.json --export-weights /tmp/weights_transformer_untrained.json
```

Training writes its schedule under `probe/`; preserve checked-in artifacts and direct rerun model outputs to separate paths. Weight schema version 1 stores named tensors under `weights`; references store `[layer][token][neuron]` hidden activations, integer counts, logits, sequence, and CE. Browser parity now passes separately via `node transformer_parity_test.js`: both weight sets have exact active counts and zero patterns, normalized hidden/logit error below 1e-4, and maximum CE error below 1e-4 bits. Eight corrupted-output checks and three isolated operator mutations per weight set verify that the gates reject errors. The browser live curve/grids use this verified port; the table above remains fixed offline evidence. For reproduction without incidental schedule writes, use an isolated repository copy.

Validation: six focused contract tests pass (depth-independent parameter count; causal future isolation, deterministic and finite outputs; exact counts and activity denominators; original sampler replay; deterministic initialization and lossless float32 serialization; rejection of unsupported model dimensions). Trained and untrained exported weights were reloaded and compared against full references: exact counts, zero patterns, hidden tensors and logits.

| Artifact | SHA256 |
|---|---|
| `results_transformer.json` | `c2542a2ecebefceac6046df55c24a9620859c6f1b7b2e81cf01c277d6be99c4a` |
| `results_transformer_untrained.json` | `b44a549b56d930227b783a29d5232b5dfdb13ac2ed9ba3a38e7f949c19ccd806` |
| `weights_transformer.json` | `28c28d615fe093ac1d989b212ca97458584fd25cc1c97bb2196c93d8b6ef693a` |
| `weights_transformer_untrained.json` | `e88849c1788571a55383442d5a5714bc484ca74df7ed48da3de289c5c3e75536` |
| `probe/transformer_reference.json` | `ea94b74c1441a8609576642963703bf0607d472d964b3e3d186c23da3d35b908` |
| `probe/transformer_untrained_reference.json` | `da559280e9ef2d725e5a57f1a6dfd4a51f2d3285100e9f3d3e13d8da5240df3d` |
| `probe/transformer_batch_schedule.json` | `569dc55321549a71dacc5c8ac0e97c686471126588dedbeafa7068d039b71d83` |

## Live port verification

`node transformer_parity_test.js` verifies both trained/random browser ports: exact active counts and zero patterns, finite and dimension-checked hidden tensors/logits/CE, normalized error below1e-4 and CE error below1e-4 bits. The trained hidden normalized error is1.27652e-6, logits1.50059e-6, and maximum CE error3.95958e-5bits. Both models reject eight corrupted-output controls and actual isolated source mutations to the causal mask, RoPE sign and head layout. This verified live curve/grid is separate from the fixed offline table above.
