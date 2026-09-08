# DataForge — phase-by-phase execution prompts

Prepared 2026-09-08 from all nine Markdown files in this folder and a targeted inspection of the existing code and measurements. This document prepares the work; it does not authorize starting the build until you submit a phase prompt.

## How to use

In this same workspace, send:

> Read PHASE-PROMPTS.md and execute Phase 0 only. Follow the shared execution contract and that phase's prompt. Use the helper agents described there.

For subsequent phases, replace `0` with the phase number. Alternatively, paste the complete fenced prompt for that phase. Every prompt tells the executor to load the shared contract, so you do not need to paste it separately. These prompts require access to this repository and its files.

Execute one phase at a time. A phase includes implementation, appropriate verification, and a written handoff. Do not start the next phase automatically. If a prerequisite is incomplete, fix a small prerequisite within the current scope, or explain the specific dependency and finish independent work. Never report a blocked gate as passed.

## Source precedence and corrections

`BUILD-PLAN.md` controls current product scope, the locked claim, required deliverables, and the feature fence. `prompt-transformer-comparison.md` supplies the A/B comparison detail, subject to the corrections below. `build.md` supplies the forward-pass specification and background; its old phases and deliverables are superseded. `probe.md` supplies experiment history. `claude-code-prompt.md` is historical: do not replay completed training and porting prompts. `context-dataforge.md` and `pathway.md` provide audience, event, and track context. `rime.md` describes a rejected alternative track. `README.md` describes the current artifact but contains stale statements.

Measurements, current code, and verified primary sources resolve factual disagreements; document the resolution instead of silently preferring prose. This planning pass did not independently verify external papers, event rules, public repository visibility, or checkpoint availability. Verify those in the relevant execution phase.

### Issues the execution prompts deliberately handle

1. **The baseline exists.** `.git`, `README.md`, `LICENSE`, and an `origin` remote already exist. The inspected HEAD was `a25bd35`; `origin` points to `https://github.com/jabssyyy/data-forge.git`. This does not establish public visibility or deployment status. `BUILD-PLAN.md` and `prompt-transformer-comparison.md` were untracked at inspection. Do not run the master's blanket `git init`, moves, removal, or `git add -A` recipe.
2. **The probe remains at the repository root.** The existing fixtures are `probe/reference.json` and `probe/untrained_reference.json`. `python probe/bdh_probe.py` is currently an incorrect command. Prefer preserving the existing layout; update commands coherently if a move is actually necessary.
3. **BDH parity currently passes.** This planning pass ran `node parity_test.js`: both models passed, with zero active-count mismatches and zero zero-pattern disagreements. Scale-normalised errors were `2.829e-7` trained and `4.843e-7` untrained. This is a baseline check, not evidence that future changes pass.
4. **Warm-up summaries use different conventions.** `results.json`/Python include token 0 in the warm-up mean; the UI's `phaseMean` deliberately skips it and comments on the difference. The historical layer-2 `18.14%` uses 13 positions; excluding token 0 yields about `19.65%` over 12 positions on that same reference sequence. Preserve original evidence, produce explicitly labelled comparison summaries, and make the distinction clear in documentation. The UI defaults to `surprise`, whereas the canonical probe uses a different word: do not expect their numbers to match without matching inputs. The memorize/repeat ratio for a fixed sequence is unaffected by token-0 exclusion. Cross-entropy needs its own predictor/target alignment policy; do not apply an activity mask blindly.
5. **Equal neuron counts are not equal parameter budgets.** A conventional bias-free shared Transformer with this width has `65,536` FFN + `4,096` attention + `2,048` embedding/output parameters = `71,680`, versus BDH's `100,352`. Count the actual implementation. Match the requested architecture settings and measured denominator, disclose the budget difference, and remove “identical parameter budget” unless actually demonstrated. Do not add unused parameters to force equality.
6. **The structural equation is not a causal proof.** It establishes that both non-negative factors must be positive. It does not prove that confidence makes a factor collapse; the warm-up result already challenges that explanation. Preserve the locked headline while restricting explanatory prose to supported observations and labelled hypotheses.
7. **ReLU is required for this comparison, but the GELU rationale needs correction.** GELU's non-zero fraction is defined; it is generally uninformative for this exact-zero measurement. Also, diagonal-0 masking is a chosen comparison asymmetry, not a mathematical impossibility of implementing strict causal softmax with special handling.
8. **Identical helper functions do not guarantee identical batches.** Architecture initialization consumes different random numbers before the current BDH sampler runs. Audit/replay the original data schedule if claiming identical batches. Reusing the RoPE formula also does not equalize its dimensionality: ordinary Transformer head width is 8 versus BDH's sparse head width 256.
9. **The guided sequence needs explicit state changes.** The untrained `1.04×` comparison refers to layer 2. Restore layer 2 before demonstrating that control, after the layer-0 step. At repeat count 1 there is no repeat mean or ratio: show an unavailable value, not a fabricated result.
10. **Documentation contains stale science.** README equations, paper titles, `3.3–3.5×` values, broad Transformer claims, and some old warm-up explanations need auditing. `BUILD-PLAN.md` also has an untrained layer-3 ratio written as `1.02%`; verify and use the ratio unit. Never treat a historical anecdote, current checkpoint availability, or event requirement as independently verified merely because it appears in a local note.
11. **Keep the parity gates, correct the rationale.** A fraction tolerance of `1e-4` is not impossible at 1024 neurons: exact equality meets it. Because one count differs by about `9.77e-4`, that tolerance effectively demands equal counts. Prefer the explicit integer-count and zero-pattern gates without repeating the master's incorrect “impossible” explanation.

## Phase map

| Phase | Outcome | Depends on | Helpers |
|---|---|---|---|
| 0 | Verified baseline, discrepancy decisions, execution ledger | Existing repository | Evidence reviewer; repository reviewer |
| 1 | Cited structural equation comparison (Stage A / E3) | 0 | Source reviewer; accessibility reviewer |
| 2 | Trained and untrained offline Transformer control (Stage B / E4) | 0, 1 | Measurement reviewer; presentation/disclosure helper |
| 3 | BDH token-linked neuron grid (E2) | 0; 2 may be deferred | State/performance reviewer; interaction reviewer |
| 4 | Three-step guided walkthrough (E1) | 3 | Learning-flow reviewer; state/keyboard reviewer |
| 5 | UI, accessibility, and robustness pass (E5) | Completed UI phases | Accessibility reviewer; computation reviewer |
| 6 | README, setup, provenance, licenses, AI disclosure | 0 and current feature state | Sources/licenses helper; reproduction reviewer |
| 7 | One-page concept PDF, 500–950 words | 6 | Evidence reviewer; PDF layout reviewer |
| 8 | Separate blog PDF, about 1,200–1,800 words | 6; normally 7 | Narrative reviewer; evidence reviewer |
| 9 | Public repository and deployed artifact | 6–8, relevant UI gates | Deployment-readiness reviewer; link reviewer |
| 10 | Fresh-clone checks and submission handoff | 9 | Reproduction reviewer; submission reviewer |
| 11 | Optional live Transformer port (Stage C / E6) | 1–10 complete; valid Phase 2 result | Python/JS parity reviewer; UI helper |
| 12 | Optional synchronized dual grids (Stage D / E7) | 11 | Cross-model state reviewer; accessibility reviewer |

This preserves the master's enhancement order. Documentation and both PDFs precede public deployment so the release is complete and reviewable. Phases 11–12 are explicit opt-ins, never required submission work.

**Deadline cutover:** if a confirmed deadline leaves four hours, stop enhancements and execute Phases 6–10 against the last verified artifact. Do not assume the historical deadline is still current. Without a confirmed time budget, follow the sequence without inventing urgency. Four hours is a cutover rule, not a promise that all remaining work will fit. Record omitted enhancements and unfinished required deliverables honestly.

## Shared execution contract — applies to every phase

- Work in the existing repository. Read applicable `AGENTS.md` instructions, this contract, the requested phase, `BUILD-PLAN.md` §§1–5, and `docs/execution-status.md` if it exists. Inspect current state before editing; never assume earlier phases ran just because this file lists them.
- Preserve the exact BDH-only headline from `BUILD-PLAN.md` §2. Respect the synthetic-task scope, all applicable limitations, and §14's fence. No backend, browser training, free-paragraph instrument, decorative wiring, second track, or framework rewrite.
- Execute the requested phase to completion within its scope. Make routine reversible implementation decisions autonomously. Ask only for genuinely missing required information or authority; continue independent work while awaiting it. Public publication must use an established authorized destination. Prepare the exact release first if destination/publication approval remains necessary.
- Use helper agents where their work can run independently alongside useful lead work. With the current four-slot limit, use at most three helpers plus the lead; usually two helpers suffice. Give each a bounded task, explicit file ownership or read-only scope, and required findings/checks. Do not spawn agents just to wait, duplicate the lead, or edit the same file concurrently. The lead integrates changes and verifies the combined result.
- Do not overwrite baseline weights, results, or reference fixtures during experiments. Record hashes and write reruns to separate directories. No resetting user changes, blanket staging, force pushes, or destructive cleanup. Make commits only when authorized, staging specifically reviewed files.
- Never fabricate a result, citation, public URL, screenshot, passing test, authorship detail, or performance claim. Separate LIVE, ANALYTIC, SYNTHETIC, and PRECOMPUTED prominently. Also disclose ANIMATED presentation/replay where used: stepping through a verified computed tensor is animation of live-computed results, not fresh inference on each frame. A stored offline result must not appear to react to live controls.
- Check primary papers/source before publishing scientific assertions. Record source title, authors, identifier, exact section/equation, and supported claim. Follow local research artifacts when useful, but verify unavailable/current facts when needed. Do not invent a connection to BDH-CQ or claim its present checkpoint status without checking.
- Preserve the verified `xy_sparse` measurement and head-major layout. For computational changes, gate on finite outputs, exact integer counts, exact zero patterns, scale-normalised error below `1e-4`, and appropriate cross-entropy checks. Do not weaken a test to accommodate a bug. Rerun BDH parity whenever the forward path, loading, fixtures, indexing, or displayed measurements change.
- Test the changed behavior meaningfully. Prefer focused regression checks over tests that merely mirror markup. Distinguish automated viewport checks from a real-phone check, local HTTP from public deployment, and Node timing from actual browser performance.
- Update `docs/execution-status.md` at the end: phase status, changed files, commands and outcomes, artifact paths, measurement provenance, decisions/deviations, blockers, and the next eligible phase. A skipped optional experiment can be deferred; it is not a completed experiment.
- End with a concise self-contained report: what changed, evidence it works, material limitations, and the exact next invocation. Stop at the phase boundary.

## Phase 0 — Audit and preserve the baseline

```text
Read PHASE-PROMPTS.md and follow its shared execution contract. Execute Phase 0 only: establish an evidence-backed starting point and resolve the documented discrepancies before feature work.

Helpers:
- Evidence reviewer: independently inspect results, references, phase statistics, CE alignment, and factual conflicts across the Markdown files. Read-only.
- Repository reviewer: inspect existing Git state, paths, reproducibility commands, and test coverage. Read-only.
- Lead: run baseline checks, reconcile findings, and own audit documents and narrowly necessary corrections.

Work:
1. Inventory all root Markdown files, code, fixtures, weights, Git status, and remote configuration. Preserve user edits and existing history. Record hashes for the baseline evidence files. Do not retrain or reorganize by default.
2. Run node parity_test.js. Inspect what it actually gates, including whether CE is only reported. Record tool/runtime versions and observed results. Do not infer a new browser timing claim from this test.
3. Trace the default UI sequence against results.json, its word/warmup, and the exported model metadata. Recompute phase means from integer counts or saved per-token series. Audit token-0 inclusion, missing repeat means, and at_position versus of_target CE indexing.
4. Preserve historical results. Adopt and document one visible activity-summary policy excluding token 0, with original and corrected warm-up values distinguished. Put derived summaries in a separate evidence file with source hashes, formulas, and denominators. Update narrowly affected current display copy if needed; do not silently rewrite the original measurements or the locked headline.
5. Create docs/baseline-audit.md and docs/execution-status.md. Record all corrections listed in PHASE-PROMPTS.md, actual paths, passed/failed gates, and any unresolved scientific issue. Mark documentary claims still awaiting primary-source verification.
6. Correct misleading executable paths and objectively stale inventory instructions in the current master plan where necessary, with a dated correction entry. Preserve historical documents as history; do not broadly rewrite them or implement enhancements.

Done when: the current baseline is identifiable and reproducible, both parity models pass or a specific failure is documented, all reported summary conventions are explicit, and the execution ledger tells the next phase exactly which evidence and paths to use. A numerical discrepancy is a finding to explain, never a target to massage.
```

## Phase 1 — Structural equation comparison

```text
Read PHASE-PROMPTS.md and follow its shared execution contract. Execute Phase 1 only. Require Phase 0's audit. Read BUILD-PLAN.md §10.1, the existing mechanism panel, and Stage A of prompt-transformer-comparison.md, applying the correction ledger.

Helpers:
- Source reviewer: verify BDH Definition 4 and Vaswani et al. equation 2 against primary sources; give exact supported wording and mathematical caveats.
- Accessibility reviewer: independently review the final panel at narrow width and with keyboard/screen-reader semantics.
- Lead owns index.html/style.css and any strictly necessary rendering code.

Add a compact side-by-side structural panel within the existing mechanism section. Show the ReLU Transformer hidden activation and BDH's gated product. If presenting a simplified bias-free hidden expression, label it as such; do not pass it off as the complete published FFN including its output projection and biases.

Use BDH's y = (D_y · LN(a*))⁺ ⊙ x, explain that either zero factor closes the gate, and retain the correct paper-to-code mapping: D_x=encoder, D_y=encoder_v, E=decoder, measured y=xy_sparse. Avoid collision between the symbols used for the Transformer input and BDH's sparse factor.

Label prominently: STRUCTURAL COMPARISON — PUBLISHED EQUATIONS, NOT A MEASUREMENT. Put citations beside the equations. Explain the gate in plain language without claiming it guarantees a confidence-driven collapse, proves warm-up behavior, or predicts the Transformer's empirical ratio. Do not generalize the ReLU variant to all Transformers.

Verify readable equations at 380px, no horizontal overflow, accessible text equivalents, and no disruption of existing controls. Add the verified source entries to the provenance record, creating docs/sources.md if needed.

Done when: the panel is accurate, cited, legible, and clearly distinct from empirical evidence; existing computation is preserved. Record screenshots/check outcomes when tooling supports them.
```

## Phase 2 — Train and measure the offline Transformer

```text
Read PHASE-PROMPTS.md and follow its shared execution contract. Execute Phase 2 only. Require Phases 0–1. Read BUILD-PLAN.md §10.2 and comparison Stage B, applying all documented corrections.

Helpers:
- Measurement reviewer: independently check the architecture, parameter arithmetic, causal mask, RNG/data schedule, activation capture, statistics, and experiment validity. Do not edit the lead's model file.
- Presentation helper: draft comparison copy and configuration disclosures in a separate document while training proceeds; insert no guessed results. The lead integrates UI changes after actual measurements exist.
- Lead owns probe/tiny_transformer.py, experiment execution, and final integration.

Before training, write docs/transformer-protocol.md specifying:
- d_model=32, layers=4, heads=4, vocab=32, d_ff=1024, ReLU, shared attention/FFN weights across depth, parameter-free LayerNorm, and causal diagonal-0 softmax attention.
- Explicit residual/LN ordering, biases, embedding/output tying choice, initialization, dropout, float dtype, optimizer settings, and actual parameter count. Default to a simple bias-free implementation; do not silently alter dimensions to equalize parameter count.
- Reuse bdh_probe.py's make_cycle, make_stream, phase_labels, WARMUP, get_freqs, and Attention.rope through a reliable import path. Inspect import-time RNG side effects. Preserve the root probe unless Phase 0 explicitly established another layout.
- Use the baseline seed discipline, 2200 steps, batch 4, seqlen 154, AdamW lr 3e-3 and the remaining audited optimizer settings. To claim identical sampled batches, replay the original BDH schedule independently of Transformer initialization. Otherwise disclose the actual degree of matching.
- Same fixed evaluation sequence as BDH; exact active count = count(h > 0), denominator 1024. Capture relu(FFN preactivation), all tokens and layers. Exclude token 0 from activity phase means for both comparison summaries. Preserve CE predictor/target conventions and label loss units (training CE normally nats, displayed per-token CE bits).
- Predeclare a numerical convergence criterion and bounded extension/retry budget based on predictive performance, before observing activation ratios. Compare evaluation CE on the same inputs and alignments, not just one noisy final minibatch loss. Explain the criterion; do not present it as a requirement quoted from the master.

Implement matching --out, --export-weights, --untrained, --dump-reference, and --dump-reference-untrained interfaces, with clear defaults/help. Persist architecture metadata, actual parameter count, seed/RNG protocol, sequence, training schedule, loss history, CE, per-layer series/counts/means/ratios, and schema-versioned weights/reference tensors. Keep Transformer filenames separate from BDH files. Untrained outputs must correspond to deterministic random initialization without optimization.

Verify finite outputs, causal future-token isolation, 0..1024 count bounds, count/fraction agreement, phase denominators, deterministic evaluation, and parameter sharing across depth. Train and measure trained/untrained controls. Preserve all runs and deviations; never search seeds or hyperparameters for a preferred sparsity ratio. If additional optimization is needed, report both the initial and extended runs and stop at the declared budget.

If the convergence gate passes, add a clearly fixed PRECOMPUTED — NOT LIVE result to the honesty panel, specifying preset sequence/layer, actual counts/budgets, final losses with units, ratio, and config deviations. It must remain visibly tied to its offline preset as live controls change. Report any ratio honestly; differences are descriptive single-experiment findings, not an architecture-wide ranking or isolated causal proof.

If convergence fails, save the evidence and state that the comparison is inconclusive/undertrained. Do not promote its ratio as a valid contrast. Leave Stage A intact, mark E4 deferred/inconclusive, and allow required documentation to proceed. Do not train indefinitely.

Disclose weight sharing, parameter-free LN, mask asymmetry, actual budget difference, RoPE head-dimensionality difference, and training/data deviations in README or a linked comparison report. Do not port JavaScript or add dual grids.

Done when: model/control artifacts and a reproducible report exist, numerical validity is reviewed, and the page either shows an honest fixed valid result or explicitly leaves the empirical comparison unavailable. Update the ledger with that exact status.
```

## Phase 3 — BDH neuron grid

```text
Read PHASE-PROMPTS.md and follow its shared execution contract. Execute Phase 3 only. Read BUILD-PLAN.md §10.3 and inspect bdh.js's keepRaw/xySparse output and app.js's computation cache. Phase 2 may be deferred without blocking this BDH feature.

Helpers:
- State/performance reviewer: read-only review of raw tensor indexing, cache lifecycle, selected token/layer, and memory cost.
- Interaction reviewer: read-only review of scrubbing, playback, mobile layout, and keyboard behavior.
- Lead owns app.js/index.html/style.css and any minimal measurement exposure change.

Add 1024 cells below the chart, 32 columns on desktop and 16 on mobile. Filled means measured xy_sparse > 0; hollow means zero. Use the existing verified raw forward-pass output, not randomly selected cells reconstructed from counts. Read index ((head*T + token)*N + neuron) with the dimensions from the model metadata; map global cell = head*N + neuron.

Expose/retain raw values through the existing forward path only as needed. Bound the cache by a sensible memory policy, especially at maximum sandbox length: do not blindly retain raw tensors for all 40 existing cache entries. Token scrubbing and layer changes must reuse the current forward result, without rerunning inference each animation frame.

Add a labelled token slider and Play/Pause around 8 tokens/sec; synchronize chart cursor, token, grid, and exact count label. Stop/reset playback safely on sequence/model/mode changes, tab hiding, and completion. Clamp selection when sequence length shrinks. Respect reduced motion and preserve a manual alternative. Show LIVE · LAYER [L] · TOKEN [t] · [count] of 1024 active with an explained token-index convention.

Keep the 1024 cells out of the tab order; provide an accessible aggregate description. No wires, invented intensity meaning, or new model path. Handle weights-loading and error states without falsely showing live measurements.

Verify grid count equals activeCounts for all layers/tokens on trained and untrained fixtures, including token 0 and phase boundaries. Rerun BDH parity. Exercise repeat-count and sandbox-length changes, playback interruption, and keyboard interaction. Measure browser responsiveness if available and identify the device/runtime.

Done when: grid and chart remain synchronized, every cell comes from verified computation, the equality checks pass, and narrow-screen use is legible.
```

## Phase 4 — Guided walkthrough

```text
Read PHASE-PROMPTS.md and follow its shared execution contract. Execute Phase 4 only. Require Phase 3. Implement BUILD-PLAN.md §10.4 with state-dependent, evidence-backed copy.

Helpers:
- Learning-flow reviewer: check the sequence against the four 60-second learning objectives.
- State/keyboard reviewer: test interruption, restart, manual changes, and assistive interaction.
- Lead owns walkthrough markup, styling, and state transitions.

Create a slim dismissible three-step guide under the headline, never modal. Store dismissal in a JS variable only, not localStorage. Make each step enter a known state through the existing setters and wait for the correct result before advancing or explaining it.

Step 1: restore instrument mode, trained weights, layer 2, and the baseline word. Demonstrate repeats 1→8 using paced existing updates. At repeats=1 display no repeat ratio. At the final preset show measured memorize/repeat percentages; only use 15.8%→5.1% if that exact preset supports them. Give reduced-motion users a deliberate step control.

Step 2: invite switching to layer 0 with the same weights/sequence. Describe the measured result as no comparable drop, not a literally flat token curve or a statistically established inversion. Make the shared-weights fact clear without claiming all network behavior is independent of training.

Step 3: explicitly restore layer 2, keep the baseline input, then switch to untrained weights. Show its measured ratio, about 1.04× if verified. Do not accidentally attach the layer-2 ratio to layer 0. Describe the control as evidence that the observed drop depends on training in this experiment.

Finish with Explore freely. Dismissal or direct interaction must cancel pending guide timers/animations; no delayed callback may override a user's later selection. The guide must not lock the sandbox or obscure the warm-up limitation.

Verify complete, dismissed, interrupted, and reduced-motion flows, keyboard-only use, and consistent control/chart/grid/readout state. Check that learners can identify the claim, predict repetition behavior, find layer 0 and warm-up limitations, and locate the equation.

Done when: the guide teaches through real controls and real data without stale ratios, fabricated animations, or forced interaction.
```

## Phase 5 — UI and robustness

```text
Read PHASE-PROMPTS.md and follow its shared execution contract. Execute Phase 5 only against the completed feature set. Read BUILD-PLAN.md §10.5. Preserve the existing static architecture and visual identity.

Helpers:
- Accessibility reviewer: keyboard, focus order, semantic labels, contrast, 380px, zoom, light/dark, reduced motion.
- Computation reviewer: independent check that display states and labels still correspond to model outputs, including offline comparison state.
- Lead fixes identified UI and robustness issues.

Make the headline and chart frame visible immediately and compute the default preset automatically once weights load. Do not show prerecorded values as LIVE or require a Run button. Provide clear recoverable loading/fetch/parse errors. Check rapid control changes, both weight sets, layer changes, repeats=1 and maximum repeats, and existing sandbox constraints.

Use CSS variables for colors; blue=activity, orange=CE, green=analytic truth. Respect prefers-color-scheme and prefers-reduced-motion. Use one prose sans and one label mono, with two weights. Keep the ratio visually prominent, charts readable, and grid 16 columns at narrow widths. No horizontal scrolling at 380px; controls stack and touch targets remain usable.

Test actual browser behavior when tools permit: default render, console, network failures, keyboard, zoom, color schemes, motion preferences, and main-thread response at normal/maximum inputs. Rerun parity if measurement or loading code changed. Do not call a viewport emulator a real-phone test; record that check pending if no phone is available.

Done when: identified material UI bugs are fixed, computational labels stay honest, and checks plus remaining device limitations are recorded. Do not spend documentation time on optional visual additions.
```

## Phase 6 — README, reproduction, and provenance

```text
Read PHASE-PROMPTS.md and follow its shared execution contract. Execute Phase 6 only. This is the deadline-cutover entry point: document the actual verified artifact even if enhancement phases were deferred.

Helpers:
- Sources/licenses helper: own docs/sources.md and docs/licenses.md; verify exact primary references, claim placement, code origin/license obligations, and any font/asset licenses.
- Reproduction reviewer: independently run documented commands in an isolated copy/output directory and identify missing dependencies or ambiguous output paths. Preserve baseline files.
- Lead owns README.md, setup/dependency declarations as needed, page provenance/disclosure, and final consistency.

Replace stale README material with the exact locked headline, audience/prerequisites/objectives, actual static architecture, signal/provenance categories (LIVE, ANALYTIC, SYNTHETIC, PRECOMPUTED, plus ANIMATED presentation where applicable), measured evidence and denominators, controls/guide/grid descriptions only if implemented, all applicable limitations, and the supported Definition 4 explanation. Explain playback versus inference without mislabelling the underlying verified live computation. Remove the incorrect simplified BDH equation and unverified paper titles or broad Transformer assertions.

Give exact root-relative commands for local HTTP serving, trained/untrained reproduction, export, fixture generation, and node parity_test.js, based on actual argparse/path behavior. Include isolated output locations so reproducing does not silently overwrite shipped evidence. State measured/estimated runtime and hardware separately, weight payload size, tested Python/PyTorch/Node versions, and any platform limits. Add a minimal reproducible dependency declaration if absent; do not claim a fresh-clone run until tested.

Include the Transformer experiment's actual settings/counts, matching limitations, convergence status, offline preset, and live-vs-precomputed status if attempted. If omitted, say so plainly. Preserve original results and explain the token-0 summary correction.

Verify at least three relevant primary papers from 2022–2026 and place citations beside supported claims in README and the page; the 2017 Transformer paper is supplementary, not one of those three. Keep exact source locations in docs/sources.md. Verify current BDH-CQ wording and avoid inventing a role for it. If the official problem statement cannot be found, distinguish local stated submission requirements from externally confirmed ones while still delivering the requested PDFs.

Record independent-reimplementation status, upstream source/version/license, local license, external assets/fonts, and actual AI assistance including this work. Preserve historical attribution; do not invent team contributions or claim humans verified checks they have not performed.

Done when: README and page agree with measured files, commands work or have explicit evidenced blockers, licenses/disclosures are complete, and verified sources are ready for both PDFs.
```

## Phase 7 — One-page concept PDF

```text
Read PHASE-PROMPTS.md and follow its shared execution contract. Execute Phase 7 only. Require Phase 6's sources and current measurements. Read BUILD-PLAN.md §11.1.

Helpers:
- Evidence reviewer: check every scientific sentence, number, comparison, and citation against the provenance ledger.
- PDF layout reviewer: inspect the rendered output for one-page length, readable type, equation/table layout, clipping, and extractable text.
- Lead writes docs/concept-summary.md and owns reproducible PDF generation.

Create a self-contained 500–950-word concept briefing as docs/concept-summary.pdf, exactly one readable page. Include design pressure without generalizing all Transformer sparsity; the gated mechanism; baseline and paper evidence with scale/protocol caveats; the untrained control; a compact BDH/ReLU-Transformer table; truthful BDH-CQ placement; the falsified warm-up explanation and labelled untested hypothesis; key limitations; and three recent primary citations beside claims. Include the empirical Transformer ratio only if validated, prominently PRECOMPUTED.

Use measured summary conventions from Phase 0 and distinguish paper-scale from local-model measurements. Do not claim causal proof, universal superiority, measured compute savings from activation counts, or interpretable state that the artifact does not measure. State Not an official BDH model.

Choose available document tooling, retain editable source and a repeatable export command, and generate an actual PDF. Count words from the rendered/extracted document, including substantive table/caption text; report body and total counts if reference inclusion affects the rule. Aim comfortably inside the range. Inspect the page visually; do not satisfy one-page length with unreadably tiny type.

Done when: the PDF exists, opens, has one page and 500–950 words under the recorded convention, carries supported claims and usable citations, and has passed visual inspection. If rendering is blocked, retain the complete source and report the PDF gate as incomplete, not done.
```

## Phase 8 — Blog PDF

```text
Read PHASE-PROMPTS.md and follow its shared execution contract. Execute Phase 8 only. Require Phase 6; normally follow Phase 7. Read BUILD-PLAN.md §11.2. This is a separate required document, not a longer copy of the one-pager.

Helpers:
- Narrative reviewer: check clarity for the named audience, coherent first-person team voice, and intellectual ownership without filler.
- Evidence reviewer: audit anecdotes, numbers, citations, negative controls, and limitation wording independently.
- Lead writes docs/blog.md and generates docs/blog.pdf with repeatable export instructions.

Write approximately 1200–1800 words following the documented investigation: the earlier unsuccessful language-trained attempt (only as substantiated in project records), the synthetic protocol discovery, model shrink and verified JS computation, trained/untrained falsification control, the explanation contradicted by warm-up CE, layer 0, deliberate scope choices, and a clearly proposed future cold-start experiment. Verify who performed the earlier attempt; an external reviewer's experiment must not become a first-person team anecdote.

Use first person plural for supported team work. Do not invent personal experiences, emotions, quotations, experiments, or human verification. Attribute historical claims to project records where that is the available evidence. Do not upgrade a hypothesis into a result. Recheck current checkpoint assertions before including them.

Describe only features actually shipped: if no live Transformer exists, explain the offline control and label its result; if E4 failed convergence or was deferred, say that. Keep the headline BDH-only regardless of the control outcome. Include three verified recent primary papers beside supported claims, independent-reimplementation disclosure, and truthful AI/source attribution where appropriate.

Generate a real, readable PDF with editable source, working citations, page numbers as useful, and no clipping. Count words and inspect all rendered pages, not just the title page. Cross-check all shared numbers/terms with the one-pager, README, and page; fix contradictions at their source.

Done when: the distinct blog PDF and source exist, length and rendering checks pass, and the narrative is accurate enough for the team to defend live.
```

## Phase 9 — Public repository and deployment

```text
Read PHASE-PROMPTS.md and follow its shared execution contract. Execute Phase 9 only. Require the current artifact, README/provenance, and both PDFs to be ready; inspect the ledger for any genuine blockers.

Helpers:
- Deployment-readiness reviewer: inspect the candidate release contents for missing assets, inappropriate/private files, dependency assumptions, and GitHub Pages path issues. Read-only.
- Link reviewer: check README/page/PDF references and downloads against the proposed release layout. Read-only.
- Lead owns release preparation, repository/deployment configuration, and authorized publication.

Inspect origin, branch/history, authentication, repository visibility, and existing Pages/deployment configuration. Reuse the existing repository. Do not create a replacement repository or change visibility merely because BUILD-PLAN.md says the repository is missing.

Prepare the exact release diff and minimal static hosting configuration. Verify relative asset paths under a GitHub Pages project subpath, weight and PDF fetches, case-sensitive paths, and public download links. Review intended published files; do not expose unrelated local/private files. Stage/commit only the reviewed scope if authorized, without rewriting history.

If this phase invocation/session already establishes publication authority and destination, publish there. If destination or public exposure authority is genuinely missing, finish the local release checks and present the exact repository, branch, visibility change if any, and intended deployment for one concise approval. Do not ask again for permission already granted. Honor environment approval requirements without bypassing them.

After authorized publication, verify the real repository and artifact URLs without sign-in. Check all runtime assets, trained/untrained controls, guide/grid if shipped, citations, PDF downloads, and console/network errors. Record deployment version/commit. Update public links in documents and regenerate affected PDFs if necessary before calling the release complete.

Done when: both public URLs are verified and the complete reviewed release is available. If publication is awaiting necessary authority/access, report the exact prepared state and blocker; a local preview is not a public deployment.
```

## Phase 10 — Final verification and submission handoff

```text
Read PHASE-PROMPTS.md and follow its shared execution contract. Execute Phase 10 only. Read BUILD-PLAN.md §§13 and 15 and test the actual released state.

Helpers:
- Reproduction reviewer: clone the public repository into an isolated directory, follow setup literally, run BDH reproduction/exports to separate paths, and run trained/untrained parity. Record environment, numerical results, and any reproducibility drift without changing expected values.
- Submission reviewer: check public incognito/no-sign-in access, both PDFs, citations/disclosures, mobile/keyboard flows, and delivery checklist independently.
- Lead integrates fixes, re-verifies affected checks, and owns docs/submission-checklist.md and docs/defense-notes.md.

Verify the public page has no console errors; all controls and boundaries work; every number traces to measured data or a cited source; offline results stay labelled; and Not an official BDH model appears in page, README, and both PDFs. Verify both PDFs open, the concept PDF is exactly one page and 500–950 words, and the blog is a separate complete artifact.

Check three recent primary citations beside supported claims, AI/source/license records, exact fresh-clone commands, fixture lineage, and public source contents. Test at 380px and on a real phone if one is available. Mark a real-phone check pending if only browser emulation is possible.

Prepare brief defense notes for: trained versus untrained control, live versus precomputed, Python/JS parity, xy_sparse mapping, shared weights across layers, token-0 handling, warm-up uncertainty mismatch, independent implementation, Transformer comparison limits, and exact reproduction commands. Distinguish observations from untested explanations.

Fix material release defects and publish the reviewed fixes within existing authorization. Recheck only affected gates plus final public asset availability. Do not add enhancements. End with the actual artifact/repository/PDF links and a concise pass/fail/pending checklist, including any external submission action still required. Do not submit to an event portal or contact others unless explicitly authorized.

Done when: required deliverables and verification gates are complete, or remaining blockers are explicitly identified without a false claim of submission readiness. Optional Phases 11–12 must not start automatically.
```

## Phase 11 — Optional live Transformer (explicit opt-in)

```text
Read PHASE-PROMPTS.md and follow its shared execution contract. Execute optional Phase 11 only. Require all required deliverables in Phases 6–10 to be complete and Phase 2 to have a valid measured result, exported weights, and Python references. If those gates are unmet, explain and finish relevant independent preparation without starting the port.

Helpers:
- Parity reviewer: independently inspect Python/JS operator correspondence and design discriminating numerical checks. Read-only on the lead's port.
- UI helper: own a separate integration patch only after the lead establishes the port's result API; avoid concurrent edits to shared files.
- Lead owns transformer.js (or a clearly named equivalent), fixture integrity, and numerical integration.

Port exactly the implemented Phase 2 model, including Q/K RoPE, mask, stable softmax, parameter-free normalization, residual order, biases if present, weight sharing, hidden ReLU capture, and CE. Do not port an idealized model from prose. Keep weights loading lazy/bounded so the required BDH experience does not regress.

Gate trained and untrained outputs on finite values, exact integer active counts, exact zero patterns, scale-normalised activation error <1e-4, and meaningful logits/CE agreement against reference fixtures. Include phase boundaries and causal behavior. Prove the test detects representative errors in mask, RoPE, or tensor layout using isolated mutations, never corrupted shipped source. Do not relax tolerances to make a failing port look successful.

Only after parity passes, connect a distinctly labelled live Transformer activity series to the existing chart. Keep the BDH headline, denominator definitions, model settings, and all comparison caveats. Avoid confusing its series with CE or analytic truth; distinguish using line style/labels within the palette. Cache/control changes must use matching input sequences and invalidate stale results.

Check numerical synchronization, browser timing, mobile readability, and payload/memory cost. Update README, provenance, PDFs, and deployment to describe the actual newly live behavior within established publication authority.

Done when: both models independently pass parity, the live comparison is honest and usable, and required deliverables remain current. If parity fails, retain the valid offline comparison and report the optional feature as incomplete.
```

## Phase 12 — Optional dual neuron grids (explicit opt-in)

```text
Read PHASE-PROMPTS.md and follow its shared execution contract. Execute optional Phase 12 only. Require Phase 11's passing live model and the existing BDH grid.

Helpers:
- Cross-model reviewer: verify both raw tensor mappings, count equality, identical sequence/token/layer selection, and cache invalidation.
- Accessibility reviewer: check narrow-screen arrangement, playback controls, reduced motion, and accessible summaries.
- Lead owns the shared grid/playback integration and final release consistency.

Show BDH and Transformer grids side by side on wide screens and stacked on mobile. Each has 1024 cells driven only by its own parity-verified activation array. Use one token slider, selected layer, input sequence, and Play/Pause state; clearly display each model's identity, count, and trained/untrained state. Preserve config caveats: equal denominators do not mean equal parameter budgets or equivalent neurons.

Reuse Phase 3's lifecycle and memory controls, and avoid duplicate inference on scrubs. Handle input changes, end-of-sequence, unavailable weights, tab hiding, and reduced motion coherently. No cross-model neuron correspondence, wiring, or causal inference should be implied by cell position.

Verify both grid counts equal their model counts across trained/untrained reference sequences and all layers/tokens. Test rapid interaction and mobile layout, then update screenshots/documentation/PDFs and the authorized public release as needed. Rerun affected numerical and release gates.

Done when: both grids stay synchronized and independently truthful, and the optional addition leaves the complete required submission intact.
```
