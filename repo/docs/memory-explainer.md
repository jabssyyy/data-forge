# Reading the memory view

Teaching and measurement contract, 2026-09-08. The user requested a memory graph and a more explicit explanation. This supersedes the earlier no-wiring feature fence, but a line must still represent a defined computed quantity. The memory engine passed 64 numerical cases. This record does not claim browser verification of the newly integrated lab.

## Start with three different things

**Trained weights are the model's fixed machinery.** Training changed its encoder and decoder matrices. Moving through this sequence does not train those matrices again.

**Context memory is a running summary of earlier tokens.** It changes while the model processes an input. Resetting the sequence clears this input-dependent state; it does not erase the trained weights.

**Activity is what fires at this step.** The neuron grid counts the current gated activation. A quiet neuron is not evidence that a memory was deleted. A lower active fraction also does not count how many facts are stored.

These distinctions should appear above the graph, before equations or controls. A novice should not need to infer them from the provenance footer.

## What the graph represents

For the current browser implementation, use **“Memory readout connections”**, with the qualifier **“Projection of computed context state; selected head and edges.”** Avoid “the brain,” “all synapses,” “facts remembered,” or “memory capacity.” A neuron-to-neuron drawing can be an informative projection without being a literal copy of every object the implementation stores.

The exact attention accumulation for one head and layer, in the implementation's fixed RoPE coordinate frame, is:

`M_t[j,d] = sum over s<t of lambda^(t-1-s) * qr_s[j] * residual_s[d]`

`attentionValue_t[d] = sum_j qr_t[j] * M_t[j,d]`

Here `qr` is the rotated sparse key/query, `d` indexes the 32-dimensional residual value, and `j` indexes the 256 coordinates of the selected head. Thus M is a 256-by-32 context-state matrix per head and layer. Lambda=1 is the unmodified model; lambda=0.96 is the explicitly hypothetical fading-memory intervention. It describes the same mathematical read as the full causal attention calculation, with floating-point accumulation differences to be checked numerically. The current browser forward path computes the sequence together rather than retaining an ongoing cache between separate runs.

The implemented neuron-to-neuron projection is:

`centeredEncoderV[d,k] = encoderV[head,d,k] - mean over d of encoderV[head,d,k]`

`B_t[j,k] = sum_d M_t[j,d] * centeredEncoderV[d,k]`

`gatePreReLU_t[k] = (sum_j qr_t[j] * B_t[j,k]) / sqrt(variance(attentionValue_t) + epsilon)`

An edge in B connects a rotated query coordinate to a projected output coordinate **before LayerNorm, ReLU, and the final product gate**. It is signed. It is not a probability, a semantic association label, or a causal importance score. Centering the projection accounts for the mean subtraction in LayerNorm. Dividing the complete query-weighted sum by the actual attention-value standard deviation (with epsilon) recovers the gate preactivation; ReLU and multiplication by the sparse x factor then recover the measured product. A selected subset of displayed edges alone does not reconstruct the final output. The viewer must not present that subset as the complete computation.

Use stable node identities and layout while scrubbing. If only the strongest edges are shown, display “showing N of 65,536 possible projected connections in this head,” preserve sign, and make the selection rule explicit. A disappearing displayed edge may merely leave the display's top-N set. It must never be narrated as deletion. The engine selects 12 source coordinates by maximum absolute query over the trace and 12 target neurons by maximum gated activity over the trace, then sorts selected IDs into a stable layout: 144 candidate pairs, out of 65,536 possible connections in the head. The graph draws 40 pairs ranked by native full-trace peak magnitude; an additionally selected edge can also be included. The numerical table contains the full sample. Full-trace selection affects only visualization, not inference; it can use later tokens. At selected token t, B is the state before reading t; nextValue is lambda*B plus the current outer-product write, the state for token t+1.

## A guided explanation that answers “what am I seeing?”

1. **Before the first letter:** “There are no earlier tokens to read yet. The context summary starts empty; the trained weights are already loaded.” Use token zero and the pre-read state. Do not imply the Transformer has the same empty self-attention row, since its mask includes the current token.
2. **After the first word:** “Earlier letters have contributed to the context summary. These connections show a selected projection of that summary.” Show actual measured state and selected-token prediction. Label whether the selected token has already been added to memory; pre-read versus post-write must remain consistent.
3. **When the word repeats:** “BDH uses fewer active coordinates at this layer on the baseline sequence. The memory summary can remain nonzero while the output gets quieter.” Report both current activity and a clearly named state statistic. A norm measures magnitude, not knowledge or number of memories.
4. **Reset context:** “This run starts without earlier tokens. The trained weights did not change.” If offering a reset intervention at a later position, recompute all dependent layers and report its measured prediction change; do not substitute a visual fade or silently zero only one layer.
5. **Try the boundary:** “Layer 0 does not show the same activity drop. Random weights do not show the large trained layer-2 drop. Warm-up is predicted well despite high activity.” Preserve the original falsification controls.

For every selected token, show an ordinary-language answer before optional numerical detail: “You are reading token 22, a repeated letter. X of 1,024 BDH coordinates are active. The graph shows head H's projected context just before this token.” Replace X/H/token/phase from actual state; never use a memorized sentence when its conditions no longer hold.

## Does fewer active neurons mean better?

**Potential benefit:** sparse activations can be useful for selective implementations, and an inspectable context representation can help investigate behavior. This page measures activity and a defined projection, not wall-time or energy savings. A dense browser forward pass may do similar work whether many or few outputs are zero.

**Potential cost:** a fixed-size accumulated summary can mix contributions. A useful retrieval result must be checked using predictions or a controlled task, not the beauty or density of the graph. There is no universal “BDH wins” conclusion from these two tiny trained models. Our Transformer control also becomes sparser at layer 2 and has lower absolute fractions on the baseline; its different parameter count and operators remain relevant.

**Forgetting:** the current local implementation uses RoPE but no explicit ALiBi decay or deletion gate. Rotation changes how earlier contributions are read; it does not by itself establish that a fact was erased. In a sum, cancellation or changing read alignment can alter an edge/statistic without selective forgetting. Resetting an entire run is a deliberate intervention, not a learned forgetting mechanism.

The selected implementation adds a separate decay experiment. Label its slider **EXPERIMENTAL INTERVENTION, not part of the shipped checkpoint's training setup**, state the exact operation, and compare actual predictions. A visual-only decay animation is unsuitable as a measurement. The ordinary sparsity instrument must stay at lambda=1. In the separate memory lab, lambda below one discounts older contributions before they are read and is propagated through the full forward computation. Keep the original weight files fixed. The experiment changes attention in every head and layer, with the same fixed trained or random weights. A comparison of current-token prediction error reports the actual direction and magnitude of the effect; lower error on one selected token is not a population-level advantage.

## Primary-source boundaries

[The Dragon Hatchling, Definition 4 and §3.2 equations 5–8](https://arxiv.org/html/2509.26507v1#S3.SS2) distinguish trained matrices from context state and present graph and tensor formulations. Figure 3 explicitly describes the norm-free correspondence; do not assert that multiplying a reconstructed neuron graph by E exactly recovers the normalized, residual-stream browser state.

[§6.2, equation 16](https://arxiv.org/html/2509.26507v1#S6.SS2) uses a neuron-connection reconstruction for interpretation. Its figure analysis removes negative RoPE-related entries and thresholds positives for visualization. That selection does not demonstrate biological synapses or justify assigning semantic concepts to the present synthetic neurons. The paper's later semantic experiments use different trained models/tasks.

[§6.1, “Natural support for long context”](https://arxiv.org/html/2509.26507v1#S6.SS1) discusses stale-state noise, damping with RoPE plus ALiBi, and possible additional forgetting/compression methods. Those architectural possibilities must not be described as features measured in this RoPE-only small probe.

## Teaching principles

The current guide does a useful experimental sequence but starts at the word “active” before giving a plain-language definition of a neuron coordinate. “Memorize” reads as a successful outcome although it is only the first-word phase label. The graph should explain a current measurement, not introduce another unlabeled abstraction. Keep the mathematical variable names in an expandable explanation, give the graph a one-sentence answer beneath it, and put the activity/memory/weights distinctions directly beside the controls. Retain precise scientific caveats without making the learner assemble the central meaning from seven limitations.

The strongest short takeaway is: **“The model can get quieter on familiar input without erasing its context. This example measures that change; it does not prove that quieter is always better.”** This is a contextual interpretation to accompany actual state measurements, not a substitute for verifying them.

## Verification

`node memory_test.js` checks 64 combinations: two weight sets, lambda 1 and 0.96, four layers, and four heads, across the canonical 77 tokens. Maximum normalized attention/read error is 2.9962e-7, gate error 1.6122e-7, and gated-product error 1.8163e-7, all below 1e-4. Initial context state is zero; fixed-selection prefix histories agree. Capturing instrumentation at lambda=1 preserves full logits, product arrays, and counts exactly. Evidence: [memory-verification.json](memory-verification.json). Baseline BDH and Transformer parity remain separate gates.
