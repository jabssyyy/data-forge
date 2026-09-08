# Pathway Track — Everything (Company · PS · BDH · Directions)

**Last updated:** 2026-09-06 (probe complete)
**Purpose of this file:** the complete Pathway knowledge base — who the company is, what the PS demands, how BDH works, the full topic list, and candidate directions. For build decisions and timeline, see `context.md`.

**FULL BDH PAPER NOW READ (62pp, arXiv 2509.26507) and `bdh.py` READ IN FULL.**

**PS links still UNREAD (deliberately — read when a topic is chosen):** BDH Explainer Ch.2 & Ch.3, Sudoku Bench blog, Kosowski's Hugging Face comment on the KV-cache paper, the full BDH-CQ report body (have abstract + headline results only).

---

# PART A — THE COMPANY

## A1. What Pathway is, in one line
A frontier AI lab betting that the future of AI isn't bigger Transformers but a **different architecture** — BDH ("Dragon Hatchling") — that reasons more cheaply by working like a brain. **BDH is the product.** The old data-framework earns money today; BDH is what the $500M valuation and future revenue ride on.

Homepage tagline (pathway.com, fetched 2026-09-03): "Frontier AI lab building architectures and models that autonomously reason, learn, and evolve." Positions BDH on three properties: Parametric Memory (memory + reasoning in one fabric, active at test time), Latent reasoning ("speak in language but think in abstract thoughts"), Extreme efficiency (sparse local neuron interactions cut test-time compute). Framed as "glass-box AI" — full visibility into how it works.

## A2. History (verified)
- **2019** — Stamirowska, during a CNRS PhD on maritime-trade forecasting, spots the gap: no good software for processing *streaming* data for AI.
- **2020** — founds NavAlgo SAS (public name Pathway) in Paris with Claire Nouet (COO), Jan Chorowski, Adrian Kosowski.
- **2022** — €4.2M pre-seed; Łukasz Kaiser an early investor.
- **Jan 2023** — public beta on PyPI: a general-purpose stream-processing framework.
- **2023–24** — production (not pilot) clients: NATO (situational awareness), La Poste (Paris 2024 Olympics — 16M IoT points, 400+ daily truck dispatches, ~50% cost cut), CMA CGM, DB Schenker, an F1 team (~90× faster processing), Intel. Open tools pass 62,000 GitHub stars. 300+ connectors.
- **Dec 2024** — ~€9.4M seed (~$14.5M total), begins US expansion.
- **Sept 2025** — publishes the BDH paper, open-sources code. Pivot from data-infra to frontier AI lab.
- **2026** — moves US ops to Palo Alto; publishes BDH-CQ (Aug); raises to a **$500M valuation, $30M total seed**; new capital → compute (NVIDIA GB300). Hires **Adam Kurzrok** (ex-Group PM for Gemini, Google DeepMind) as CPO. Stated model focus: reasoning models for **finance, tech, healthcare**.

## A3. People
- **Zuzanna Stamirowska** — CEO. École Polytechnique; PhD Complex Systems; network-forecasting work published by the US National Academy of Sciences.
- **Jan Chorowski** — CTO. Ex-MILA & Google Brain (under Samy Bengio); co-authored with Hinton; early attention-model contributor; co-author of Theano; ~12k citations.
- **Adrian Kosowski** — CSO. PhD in algorithms at 20; Inria tenure at 23; 100+ papers; primary architect of BDH.
- **Advisors:** Łukasz Kaiser (Transformer co-inventor; personally reproduced the ARC results), Martín Farach-Colton (NYU Tandon CSE chair), Jacques Attali (economist, founded the EBRD), Jonathan Frankle (Chief AI Scientist, Databricks; MosaicML founder; angel in the round).
- **Partners:** AWS, NVIDIA.

## A4. Business model
- **Today's revenue:** enterprise software — the real-time data framework (open-source free + paid enterprise). Customers: NATO, La Poste, F1, CMA CGM, DB Schenker, Intel.
- **The bet:** sell BDH reasoning models to finance/tech/healthcare — sectors where data is scarce or sensitive, so a model that needs less data but reasons deeper is worth paying for.
- **Constraint that shapes everything:** $30M is tiny for a frontier lab. Pathway cannot outspend anyone → must win on *architecture-driven cost-per-reasoning*. Hence relentless "11× cheaper" / "intelligence per dollar" messaging. Real constraint, not marketing.

## A5. The credibility problem — THE strategic key
Pathway's core claim (BDH is a genuinely new, non-Transformer architecture) is **still publicly disputed**:
- A Reddit critic dismissed BDH as fiddling with GPT-2 config to get similar performance — "a startup trying to generate hype." (Concedes the score, attacks the *architecture* claim.)
- The "Mommy, it has a brain!" press quote alienated technical purists as sensationalism.
- At a public Transformer-vs-Post-Transformer debate (Kaiser; Llion Jones; Mathias Lechner of Liquid AI; Kosowski), the crowd gave the trophy to Team Transformers.

Their response: **buy credibility with transparency** — MIT code, full paper + proofs, publicly named independent reproducers (Kaiser, Kinas, Zhong), a README admitting the Sudoku number doesn't reproduce from public code, a derivation series, front-page numbers labeled "pending validation."

**Why this is the key for us:** the whole hackathon is a credibility exercise. The rubric's obsessions (real-vs-animated substrate, "No AI slop", label live/precomputed, "a developer's result isn't an external reproduction") all flow from this. The highest-value artifact lets a *skeptic* operate a real BDH mechanism and check it themselves. Overclaiming is punished harder than underclaiming.

## A6. Why Pathway can't just explain it themselves (recurring doubt, answered)
Explanation already exists (paper, proofs, explainer). The hackathon exists because *explanation ≠ understanding*, and three bottlenecks block Pathway doing it in-house:
1. **Trust** — them saying "we're different" reads as sales; a neutral third-party tool a skeptic can operate is credible. They can't be their own witness.
2. **Curse of knowledge** — inventors can't un-know BDH, so they skip the step a beginner trips on. A fresh learner teaches learners better. (Why the PS stresses "for a clearly stated audience.")
3. **Wrong job + tiny team** — ~30 people racing to ship models; crowdsourcing hundreds of explainers via one ₹3L pool is efficient and scouts talent.

---

# PART B — THE PROBLEM STATEMENT

## B1. The task
Build ONE self-contained, interactive educational artifact that makes one difficult frontier-AI concept genuinely understandable, connected to BDH or BDH-CQ.

**Non-negotiables:**
- Choose ONE approved topic (two only if closely related, one central claim).
- Contain a substantial, technically correct BDH/BDH-CQ section, woven in.
- Learner must CHANGE a meaningful variable and OBSERVE the consequence. Static article/deck/video alone fails.
- Write ONE falsifiable sentence the explainer teaches, before writing code.

**Submission package:** public artifact URL (no sign-in) · public repo · one-page concept summary PDF (500–950 words) · full README (claim, audience, prerequisites, objectives, architecture, role of each component, which parts live/precomputed/synthetic/animated, reproduction steps, credits, licenses) · ≥3 primary papers 2022–2026 cited beside claims · source+license record · AI-assistance disclosure.

## B2. Scoring — 100 points, 7 criteria
| Criterion | Pts | Tests |
|---|---|---|
| Technical correctness & depth | 25 | Primary sources read, nothing hallucinated. "Incorrect claims = major penalty." |
| Technical ownership & live defense | 15 | Predict result of a change on the spot; distinguish real from precomputed |
| Learning effectiveness | 15 | Claim, audience, prerequisites, guided narrative, 60-second test |
| Interactive substrate & honesty | 15 | Concept truly behaves; controls map to real variables; truth beside estimate; fast feedback |
| BDH/BDH-CQ integration & evidence discipline | 10 | Substantive, correct, connected, sourced, explicit about evidence level |
| Craft, robustness, accessibility, provenance | 10 | Visual clarity, writing, MOBILE usability, loading, links, licenses |
| One-page concept summary | 10 | Correct, self-contained, comparison quality, evidence labeling |

**Zero points for:** topic novelty, topic difficulty, ML impressiveness.

**Design standards (PS):** one claim · real substrate (animation ≠ substrate) · visible state · truth beside estimate · open with a preset running (no blank canvas/Run button) · <1s feedback · few controls, each a real variable · guide then sandbox · state all caps/approximations.

**Weak / Strong / Exceptional (PS wording):**
- Weak: generic overviews, paper-summarizing chatbots, static decks, animation passed as computation, unchanged forks, bolted-on BDH, unsourced claims, code the team can't explain.
- Strong: one clear claim, real substrate, honest labeling, a BDH module that teaches, a disclosed limitation.
- Exceptional: a reusable substrate, a claim a learner can REPRODUCE in under a minute, or a resource people keep using after the hackathon.

## B3. THE FRAMING RULE (corrected mid-project — do not lose)
Goal is NOT "prove BDH works / make a skeptic believe." That's advocacy, a trap:
1. Exceptional = **reproduce**, not believe → build a neutral instrument, not an argument.
2. Strong **requires a disclosed limitation** → "therefore BDH works" locks you out of it.
Advocacy to hype-sensitive judges is the worst move.
**Correct frame:** learner operates one real BDH mechanism, gets a result, sees match-vs-truth and where it fails, names the limitation the gap reveals. Every direction ENDS ON REAL BEHAVIOUR INCLUDING WHERE IT BREAKS.

## B4. The 25 approved topics (full list, from PS pages 2–7)

### Group 1 — Memory and learning
1. **State-Space Models (SSMs)** — long sequence compressed into an evolving state instead of token-by-token. NOTE: do NOT classify BDH as a Mamba-style SSM; BDH-GPU is a separate ReLU-low-rank + linear-attention formulation.
2. **Linear Attention** — attention reorganised so memory updates incrementally, not all-pairs. BDH-CQ relates its contextual memory to attention / fast-weight / linear-attention views.
3. **Comparing Linear Attention Variants** — survey of recent linear-attention variants in LLMs and what each trades away.
4. **Synaptic Plasticity as Short-Term Memory** — recent activity temporarily strengthens connections → working memory. BDH's core mechanism; attention becomes synaptic memory via Hebbian writes. *(← direction B)*

### Group 2 — (continued, PS page 3)
5. **Test-Time Adaptation** — optimization vs context: how a system acquires an unseen task's rule before answering. HRM/TRM take the optimization route (backward pass before eval); BDH-CQ is the counterexample (no eval-task demos in training, no weight updates at inference; adaptation in recurrent state).
6. **Associative Memory and Fast Weights** — rapidly changing connections store relationships, retrieved on a similar cue.
7. **In-Context Learning with Recurrent Memory** — fixed-size state repeatedly read, updated, carried forward.
8. **Continual and Online Learning in LMs** — adapting without erasing earlier ability; catastrophic forgetting, stability–plasticity; BDH as architecture-native session memory.
9. **Key–Value Caching, Limitations, and Alternate Approaches** — how Transformers retain tokens in a growing KV-cache and the memory/context limits that creates; compare eviction, compression, retrieval, linear attention, SSM, fixed-size recurrent. Include BDH as integrated approach. (Kosowski personally commented on the HF paper page.) *(← direction C)*
10. **Parametric Memory in LLMs** — where memory lives: external stores, memory layers, fixed "slow" params, or "fast" params updated at inference; BDH as one fabric for memory+adaptation+reasoning.

### Group 3 — Reasoning and generalisation (PS pages 4–5)
11. **Recurrent Latent-Space Reasoning** — thinking by refining a hidden state, not narrating steps. *(POISONED: PS example claim)*
12. **Inference-Time Scaling** — allocate more inference compute via more tokens or more latent recurrent updates; BDH-CQ low/med/high-effort results.
13. **Skill Acquisition from Demonstrations** — infer+apply a new rule from sparse demos (ARC-style). Use the BDH-CQ example.
14. **State Interpretability** — inspect what a model remembers/computes NOW, not just its fixed params. *(quiet, buildable)*
15. **Demonstration Coverage and Extrapolation** — how far a model generalises beyond example complexity/length/structure.
16. **Cost–Accuracy Pareto Frontiers** (flagged "particularly timely") — intelligence per dollar = verified task performance / cost per task; BDH-CQ vs others.
17. **Evaluating Mathematical and Abstract Reasoning** — GSM8K vs ARC-AGI; what success/failure on each actually establishes.
18. **Alternatives to Chain-of-Thought Reasoning** — reason without serialising every step into text tokens; BDH-CQ as one case among continuous-thought / iterative-hidden-state / programmatic.
19. **Long-Horizon Evolving State** — maintain/update/forget a compact internal state across long sequences; persistence, interference, capacity, recovery. *(POISONED: PS interference example claim)*
20. **Reasoning Under Complex Constraints** — many interacting rules held at once; BDH's Sudoku Extreme result as case study.
21. **Games, Puzzles and Simulated Environments as AI Evaluation Testbeds** — controlled envs for spatial reasoning/planning/memory; BDH Sudoku + BDH-CQ ARC-AGI cases.

### Group 4 — Brain-inspired computation, sparsity, interpretability (PS page 6)
22. **Sparse Non-Negative Activations** — few units active at once, non-negative; ~5% of BDH neurons active, activity varies with predictability. *(← direction A)*
23. **Monosemantic Synapses** — a connection responding to one recognisable concept; in BDH at the synapse level (concepts, not tokens).
24. **Scale-Free and Heavy-Tailed Neural Connectivity** — most units few connections, a few hub units → power-law degree distribution in trained BDH.
25. **Local Neural Computation** — complex global behaviour from many components applying only local interaction rules.

### Architectural directions (also selectable, PS pages 6–7)
- **Post-Transformer Architectures** (flagged "particularly timely") — rethinking attention/recurrence/state/memory vs scaling Transformers; maturity assessment; includes BDH 1B→600B scaling, GPU formulation, SageMaker HyperPod.
- **Dragon Hatchling (BDH)** — the architecture itself: reasoning+memory in one fabric, attention as synaptic memory updating as it reads.
- **The Equations of Reasoning** — how attention/memory/iterative inference emerge from compact local neuron-synapse rules; BDH's formalism linking micro graph dynamics to macro reasoning.

## B4b. ⚠️ DOS AND DON'TS — THE RULES TO BUILD BY (re-read before writing anything)

> **This section is load-bearing. Most teams lose points not on ideas but on honesty/disclosure slips. Re-read before writing code, before the one-pager, before recording the demo.**

### ✅ DO

**Showing BDH**
- ✅ Include a **substantial, technically correct** BDH/BDH-CQ section — not a footnote.
- ✅ **Weave it in** with its own real learning objective — never tacked on at the end.
- ✅ Ground every BDH claim in something concrete: an equation, a diagram, a live experiment, or a **clearly labeled precomputed result**.
- ✅ Say **plainly which system** you mean (BDH vs BDH-CQ) and why the concept appears there.
- ✅ Work from **primary sources** (BDH paper arXiv 2509.26507, BDH-CQ report 2608.09888) — never secondhand summaries.

**Labeling & honesty**
- ✅ Label every part of the artifact as **live / precomputed / synthetic / animated** (required README section).
- ✅ Identify any toy model / reimplementation **explicitly as such**. → Our probe model = "independent shrunk reimplementation for teaching," never "BDH."
- ✅ State the **evidence level** of every claim: formally proven vs publicly demonstrated; and benchmark ≠ deployment ≠ commercial partnership ≠ external reproduction (PS forbids conflating these).
- ✅ Disclose **all caps and approximations** (e.g. our n=65536→1024 shrink) — visibly, in the artifact, not buried.

**Sourcing**
- ✅ Cite **≥3 primary papers (2022–2026)** that use/extend/test/rely on the concept, **beside the specific claim** each supports.
- ✅ Keep a **source + license record** for all reused code, data, weights, graphics, fonts.

**AI use & ownership**
- ✅ Disclose **all AI-generated / reused / forked** work in the README.
- ✅ Ensure **every team member can explain and defend every sentence, citation, and line of code** (code + one-pager + blog).

### ❌ DON'T

**Overclaiming — highest-risk category ("incorrect claims receive a major penalty")**
- ❌ Never present a reimplementation as an **official BDH model**.
- ❌ Never claim something **reproduces from the public repo** if it doesn't. → Sudoku 97.4% is Pathway's *internal* implementation; the open repo README says it does NOT reproduce out of the box.
- ❌ Never attribute a **paper-only property to the shipped code**. → "BDH forgets" / "state doesn't grow with sequence length" are true of the paper's architecture but FALSE of public `bdh.py` (no state variable; `generate()` re-runs the whole prefix, quadratic). See D1.
- ❌ Never misrepresent or overclaim any research; verify against primary sources, not memory.

**Scope**
- ❌ Don't try to explain the whole architecture or an entire field — one claim, one mechanism.
- ❌ Don't inflate BDH's relevance if it isn't central. PS: *"if one has no direct role in the selected concept, say so rather than inventing a connection."*

**One-pager ("No AI slop" — judged strictly)**
- ❌ No padded sentences, undefined buzzwords, invented references/numbers, lists of papers without synthesis, mechanism-free prose, or a BDH mention added only to satisfy the rule.
- ❌ No sentence that fails to contribute a definition, mechanism, evidence, limitation, or necessary connection.

**Substrate**
- ❌ Never pass animation off as live computation — label illustrations as illustrations.
- ❌ No decorative controls; every control must map to one real variable.

### 📋 Our specific compliance checklist (carry into the build)
| Item | Status |
|---|---|
| Probe model labeled "reimplementation," not official BDH | ☐ TODO — explicit in artifact + README |
| n=65536→1024 shrink disclosed IN the artifact (not just README) | ☐ TODO |
| 3 primary papers (2022–2026) chosen, cited at claim level | ☐ TODO (Herrmann et al. 2025 is one — see D3) |
| BDH-CQ results only cited, never run | ✅ our standing position |
| Sudoku 97.4% not claimed reproducible from open repo | ✅ documented |
| "Forgetting"/"no state growth" not claimed of shipped code | ✅ corrected (D1) |
| Layer-0 null result disclosed as a real limitation | ✅ planned — best teaching moment |

## B5. Crowding map (Claude's judgement, not fact)
- **Heavily crowded** (flagged "timely" or coolest-sounding): Post-Transformer Architectures · Dragon Hatchling · Recurrent Latent-Space Reasoning · Alternatives to Chain-of-Thought · Cost–Accuracy Pareto · Test-Time Adaptation.
- **POISONED** (PS's own example claims — every unthinking team uses them): #11 Recurrent Latent-Space Reasoning (latent-computation example) · #19 Long-Horizon Evolving State (interference example).
- **Quiet & buildable on the real repo:** #22 Sparse Non-Negative Activations · #23 Monosemantic Synapses · #24 Scale-Free Connectivity · #4 Synaptic Plasticity · #14 State Interpretability · #25 Local Neural Computation · #15 Demonstration Coverage.

---

# PART C — HOW BDH WORKS

## C1. Plain-language mechanism (for live defense — the intuition under A & B)
**Transformer memory = a growing list (KV-cache).** Every token becomes a permanent "note," kept forever. Perfect recall, but the list only grows → long contexts slow/expensive, and it CANNOT forget selectively.

**BDH memory = connection strengths that get retuned (synaptic plasticity).** FIXED set of neuron-like units and connections. Reading text doesn't add notes — it strengthens/weakens existing connections. "Neurons that fire together wire together." Memory IS how strong each connection is now. **NOTATION — CORRECTED 2026-09-05.** The BDH-GPU (tensor) formulation calls the per-layer state **ρ** (rho): paper, Sec 4.1 — *"Each layer l has a state ρ_l ∈ R^(n×d) which is used in the Linear Attention block and persisted over time."* **σ** belongs to the conceptual neuron-synapse formulation (Equations of Reasoning, Table 1). Earlier versions of this file used σ throughout for both — that was wrong. Use **ρ** when talking about BDH-GPU / the code; **σ** only when talking about the abstract neuron-synapse model. Getting this backwards on stage is an easy hit to take.

Two properties fall out → the two directions:
- **Forgetting by interference (→ B):** fixed-size connections mean a new memory can overwrite an old one on the same wires. A Transformer can't (notes are permanent). Overwriting = *interference*.
- **Surprise-driven sparsity (→ A):** BDH fires ~5% of neurons, and FEWER when the next token is predictable. Transformers have no equivalent.

**"Why not a Transformer?" (one-line live answer):** a Transformer remembers by keeping every note forever in a growing list; BDH remembers by retuning a fixed set of connection strengths, brain-style — which is what lets it forget and stay sparse. Different mechanism, not a setting; you can't change a hyperparameter to turn one into the other, because a Transformer has no synapses to strengthen.

**HONESTY RAZOR (state it — earns evidence-discipline points):** the BDH paper *derives* the synapse view FROM attention (attention ⪯ BDH-GPU ⪯ local neuron-synapse dynamics). BDH and attention are mathematically *related*, not alien. Correct claim: "BDH reformulates attention as synaptic memory on a fixed substrate, yielding forgetting + sparsity a standard KV-cache doesn't have" — NOT "BDH has nothing to do with attention." Overstating separation is the exact overclaim judges will punish.

## C2. Verified technical facts — BDH
Paper: *The Dragon Hatchling: The Missing Link between the Transformer and Models of the Brain* — Kosowski, Uznański, Chorowski, Stamirowska, Bartoszkiewicz. arXiv:2509.26507, 30 Sep 2025.
- Scale-free network of n locally-interacting neuron particles.
- Inference-time working memory relies entirely on synaptic plasticity + Hebbian learning with spiking neurons.
- Matches GPT-2-scale Transformer performance on language + translation at equal params, 10M–1B, same data. Transformer-like scaling laws.
- Activation vectors sparse and positive; monosemanticity shown on language tasks.
- Neuron network: high modularity, heavy-tailed degree distribution.
- BDH-GPU = GPU-friendly formulation (ReLU-low-rank + linear attention). NOT a Mamba-style SSM.
- Dimensionality: BDH O(ND) params+state vs Transformer O(N²) params, O(LC) state that grows with length. D ≈ 256, N ≫ D > log(N).
- Sparsity ~5% neurons active; activity rises with novelty, falls on repetition (Fig 14, reproduced in Equations of Reasoning blog).

**Equations of Reasoning** (pathway.com/research/the-equations-of-reasoning, 6 Aug 2026) — BDH Table 1. 4 rounds/loop, 4L rounds/token (e.g. L=8):
- 4l — inference from state (memory read; accumulator A from X and σ; modus ponens)
- 4l+1 — synapse reweighting (Hebbian outer product of X,Y; SSM-like write)
- 4l+2 — neuron replicator dynamics (Y from readout A gated by X)
- 4l+3 — inference from parameters (final X update, closes loop)
State: X, A, Y = fast pulse-like neuron variables; σ(i,j) = slower synaptic variable. Learned graphs Gxᵉ, Gxⁱ, Gyᵉ, Gyⁱ, Gs. Central formal claim: attention ⪯ BDH-GPU ⪯ local neuron-synapse dynamics (⪯ = simulable with controlled overhead). Attention reframed as *weighted modus ponens*; Hebbian learning updates implication strengths.

## C3. Verified technical facts — BDH-CQ
Paper: *BDH-CQ: In-Context Learning with Recurrent Latent Reasoning* — Engdahl, Kosowski, Chorowski, Stamirowska, Uznański, Jiang, Phadke, Kinas, Zhong. arXiv:2608.09888, 10 Aug 2026.
- Inputs continuously update recurrent memory; queries solved by iterative latent computation, no verbalised reasoning.
- **150M params → 29.5% pass@2 on public ARC-AGI-1 at ~$0.0007/task.** Claimed to break the ARC-AGI-1 cost-accuracy Pareto frontier.
- ~11× cheaper/task than GPT-5.6 Luna (Low) at 34.2% (after OpenAI's 30 Jul 80% price cut).
- Independently reproduced by Łukasz Kaiser, Remigiusz Kinas, Richard Zhong (NYU).
- Pretraining-scaling reported 1B→600B, Transformer-like scaling preserved.
- Trained on Amazon SageMaker HyperPod.
- Contrast with HRM/TRM on ARC: they augment demos into training, learn per-puzzle embeddings, vote over augmentations, need a backward pass before eval; BDH-CQ needs none of that — adaptation in recurrent state.

## C4. ARC-AGI, in plain words (recurring question)
ARC-AGI = an IQ-style test built so you can't cheat by memorizing: each puzzle shows a few examples of a HIDDEN rule, then asks you to apply it to a new case you've never seen. Measures "learn a new rule from 2–3 examples." Humans good; big LLMs surprisingly bad for their size. That gap is where Pathway competes ("smart AND cheap on the un-fakeable test").
**arc-task-gen** (github.com/pathwaycom/arc-task-gen, MIT, ~7.2k stars) = Pathway's anti-cheating tool: generates fresh, never-seen ARC-style puzzles (distribution-matched, private eval set) to prove a score is real reasoning, not memorization. **Not referenced in the PS** — was on the DataForge site pre-PS. Only relevant if a topic centres on ARC/skill-acquisition/abstract-reasoning eval.

**Skepticism ≠ benchmark distrust.** Nobody doubts ARC is fair or that BDH got the score. The dispute is the SECOND claim: is BDH a genuinely new architecture, or "GPT-2 in a costume"? Bigger claim → more scrutiny; young startup vs proven labs; history is full of failed "Transformer killers." An explainer that shows a real non-Transformer mechanism (synapse memory, surprise sparsity) is exactly what addresses this.

---

# PART D — THE SUBSTRATE, THE PROBE & THE DIRECTION

## D1. The substrate advantage — VERIFIED AGAINST THE CODE (2026-09-05)
`pathwaycom/bdh` — MIT. Files: `bdh.py` (171 lines), `train.py` (126), `requirements.txt`, `figs/`. nanoGPT-derived, tiny Shakespeare. Run: `pip install -r requirements.txt` -> `python train.py`.

### WHAT THE CODE ACTUALLY CONTAINS (read in full, do not re-derive from the paper)
- **`bdh.py` is character-for-character the paper's Appendix E listing.** Same `LinearAttention`, same structure.
- **There is NO state variable. No ρ, no σ, nothing persisted.** The model is stateless between forward passes.
- **`Attention.forward` is the PARALLEL form** (lines 73-74): `scores = (QR @ KR.mT).tril(diagonal=-1)` then `scores @ V`. Full T×T matrix.
- **`generate()` re-runs the entire prefix for every token** (lines 161-163: `idx_cond = idx`, full forward). No cache. Compute/memory grow quadratically.
- **Available to instrument RIGHT NOW:** `x_sparse` (line 125, `F.relu(x_latent)`), `y_sparse` (line 135), `xy_sparse` (line 136), and `scores`. Shapes B, nh, T, N. Default config: D=256, nh=4, mlp_mult=128 -> N=8192/head, 32768 neurons total.

### CRITICAL: architecture claims vs CODE claims
The paper ITSELF says the Appendix E code is the parallel form and that a separate state-space kernel is used for long contexts: *"For short contexts BDH-GPU is amenable to parallel training with a causal self-attention kernel. The simple code template provided in the Appendix E is sufficient to reproduce the empirical results... For longer contexts (typically above 4096 tokens for d=256), a state-space kernel for linear attention is faster and more space-efficient."*
**Therefore: "BDH forgets" and "BDH's state doesn't grow with sequence length" are TRUE OF THE PAPER'S ARCHITECTURE and FALSE OF THE SHIPPED REPO.** Saying either on stage with the open repo on screen is a judge-facing landmine — anyone who has read `generate()` will catch it. Distinguish architecture-as-described from code-as-shipped every single time.

### Recovering ρ is possible but is a REIMPLEMENTATION, not instrumentation
Attention here is linear (no softmax), so `out_t = Qr_t · Σ_{s<t} Kr_sᵀ V_s` exactly. The state `ρ_t = Σ_{s<t} Kr_sᵀ V_s` is recoverable by cumulative sum. Bounded, well-defined task — and it carries a FREE correctness check (recurrent output must equal parallel output token-for-token), which is unusually strong "truth beside estimate." But it is 2-3× the work of instrumenting what already exists.

### Honesty constraints (must state in artifact)
- No public BDH-CQ checkpoint -> BDH-CQ results are CITED, never run.
- Sudoku Extreme 97.4% is Pathway's INTERNAL implementation; repo README says it does not reproduce out of the box.
- Any toy model / reimplementation must be labeled as such.
- Evidence labels: benchmark ≠ deployment; partnership ≠ independent evaluation; developer-reported ≠ external reproduction.

## D2. The sparsity claim — sourced and located (2026-09-05)
Both halves of direction A's claim ARE in the primary source. (An earlier external review reported being unable to find them; that was incorrect.)

- **~5% figure — paper p.24:** *"An empirically observed fact is that the activation pattern of x_t rapidly becomes sparse (in a typical training run, only ρ≈5% of the n entries of vector x_t are non-zero). This corresponds to the fraction of the state space read and updated for each token."* Also in the p.8 contribution bullets: sparsity "at about 5% level" in the **y** vectors, "with sparsity levels reflecting the amount of activity being performed by BDH-GPU for a given token."
- **Predictability effect — paper Figure 14, p.40.** Title is the claim verbatim: *"Neurons in BDH-GPU are less active (signal is sparser) when the input is predictable."*
- Also stated by the organisers in the PS itself, p.06 (topic #22).

### FIGURE 14'S EXACT PROTOCOL (replicate this — do not improvise)
- Input: fixed **13-letter warm-up**, then **8 repetitions of an 8-letter random word** ("fact"); whole pattern repeats every **13 + 8·8 = 77 letters**.
- Measured quantity: fraction of neurons with non-zero entry **y_{t,l}**, **per layer l**.
- Effect location: **layer 2**. Layer 2 shows **4.0%–7.5%** non-zero during memorization vs **~2.5%** during repetition.
- Fig 14(b): neurons bucketed by RoPE phase (freq0∈[1,4] ... freq7∈[16384,65536]); the **slow-acting half (freq4–freq7)** shows the largest peak-to-repetition amplitude ratio.

### KNOWN FAILED REPLICATION (and why it probably doesn't refute)
An external review trained a small BDH and measured **aggregate** sparsity across four repeats of the same text: 21.4 -> 21.5 -> 20.4 -> 20.2% (flat), with learned sparsity 50% -> 21.8%. Three likely reasons this missed the effect rather than refuting it:
1. **Wrong variable/aggregation** — Fig 14 measures **y**, **per layer**, effect specifically in **layer 2**; aggregating across layers averages it out.
2. **Wrong protocol** — "four repeats of the same text" is not the paper's memorize-then-repeat 77-char cycle.
3. **Undertrained** — 21.8% baseline vs the paper's ρ≈5%. Sparsity is emergent over training (paper notes L1 reg was disabled and no method guided the effect); at 21.8% the model is not in the regime.
**Conclusion: unresolved, must be settled empirically with the CORRECT probe before committing to direction A.** If the effect fails to appear at small scale, that is a disclosed limitation about model size — a legitimate finding, not a dead end (the gap is the lesson).

## D3. Figure 14 — exact reproduction recipe (2026-09-06, from Section 6.4 directly; resolves the failed-replication mystery)

**THE KEY FINDING: the Section 6.4 model was NOT trained on natural language (Shakespeare, Europarl, etc). It was trained on a PURPOSE-BUILT SYNTHETIC TASK designed specifically to show this effect.** This is why an earlier attempt to reproduce it on a Shakespeare-trained model saw nothing — wrong training data entirely, not a fragile/fake effect.

**Paper's exact setup (Section 6.4, verbatim data):**
- Model: **n = 65536 neurons, d = 256, L = 4 layers**. Tokenizer: single Latin letters.
- Task: single synthetic next-token-prediction stream — NOT language modelling.
- Sequence recipe: fixed **13-letter warm-up**, then **8 repetitions of an 8-letter random word** (paper's example: "fact"), whole pattern repeats every **13 + 8×8 = 77 letters**.
- Measured quantity: fraction of neurons with non-zero entry in **y_{t,l}**, per layer l.
- Effect located in **layer 2**: **4.0%–7.5%** non-zero during memorization (warm-up + new word) vs **~2.5%** non-zero during repetition.
- Fig 14(b): neurons bucketed by RoPE frequency (freq0..freq7); the **slow-acting half (freq4-freq7)** shows the largest memorization-vs-repetition amplitude ratio.
- Paper's own framing (matches our corrected frame exactly): *"sparse and surprisal-driven neuron activation lowers energy consumption... BDH, natively, at a neuron level, implements mechanisms reminiscent of adaptive computation time and conditional computation."* Cites Herrmann et al. 2025 for the general Transformer-world parallel (input complexity <-> predictability of internal representations) — **this is a ready-made citation for our 3-required-papers list.**

**CRITICAL CODE CORRECTION:** the paper's "y" in Fig 14 is the GATED product, Appendix E line: `y = relu(ln(a_ast) @ decoder_y) * x`. In `bdh.py` this is **`xy_sparse` (line 136)**, NOT `y_sparse` (line 135, which is the ungated half only). An earlier version of this file said to measure `y_sparse` — that was wrong. **Measure `xy_sparse`.**

**Config to match n=65536:** `BDHConfig(n_layer=4, n_embd=256, n_head=4, mlp_internal_dim_multiplier=256)` -> N = 256*256/4 = 16384/head * 4 heads = 65536. Repo's `train.py` DEFAULT is L=6, mult=128 (n=32768) — wrong for this reproduction, must override.

**Verdict: direction A is not "hunt for an effect," it's "follow a specified recipe and check the number."** Do this FIRST, today, before building anything else.

## D4. PROBE RESULT — EFFECT REPRODUCED (2026-09-06) ✅

**Ran the Section 6.4 recipe on a heavily shrunk model. The Figure 14 effect reproduces clearly.**

Setup: `n=1024` neurons (paper: 65536, **64x smaller**), d=32 (paper: 256), L=4 (matches paper), vocab 26 letters, 2200 steps AdamW lr=3e-3, bs=4, seqlen=154 (2 cycles). ~0.1M params, trained on 1 CPU core in ~4 min. Corpus = paper's exact recipe: fixed 13-letter warm-up + random 8-letter word x8, cycle=77. Measured `xy_sparse` (the gated product = paper's y), fraction non-zero, per layer. Final loss 0.43 (theoretical floor ~0.34 since the 8 random letters are genuinely unpredictable).

**Per-layer results (% neurons active):**
| Layer | Warm-up | First presentation | Repeats | Ratio |
|---|---|---|---|---|
| 0 | 11.68 | 12.93 | 12.98 | **1.00x (NO EFFECT)** |
| 1 | 18.13 | 17.66 | 9.35 | 1.89x |
| **2** | 21.44 | **15.86** | **4.77** | **3.32x** |
| 3 | 19.04 | 13.61 | 5.99 | 2.27x |

**Decay across the 8 presentations (layer 2):** 15.86% -> 6.37 -> 5.13 -> 4.44 -> 4.42 -> 4.35 -> 4.25 -> 4.47. One exposure drops activity ~60%, then it settles.

**Match to paper:** effect strongest in **layer 2** (paper says layer 2 ✓). Ratio 3.32x vs paper's implied ~1.6-3.0x ✓. Absolute levels higher (15.9->4.8 vs paper's 4.0-7.5 -> ~2.5) — expected, since 64x fewer neurons means less room for sparsity to develop. **Qualitative effect survives a 64x shrink onto a single CPU core** — not a fragile, compute-hungry effect.

**BUILT-IN LIMITATION (use this, it's the best teaching moment): layer 0 shows NO effect at all (12.93 vs 12.98).** Surprise-driven sparsity is not a property of "the network" — it's a property of *where you look*. A learner who can switch layers and watch layer 0 stay flat learns more than one who only sees layer 2 drop.

**KNOWN PROTOCOL GAP (fix in final build):** we measured a single cycle from a COLD START; the paper measures across repeating cycles. Our warm-up numbers are therefore inflated (no prior context to predict from). Fix by measuring the 2nd or 3rd cycle instead.

**Artifacts:** `/home/claude/probe/bdh_probe.py`, `results_small.json`. Model code is faithful to `pathwaycom/bdh` bdh.py with a capture hook added for `xy_sparse`; must be labeled as an independent shrunk reimplementation for teaching, NOT an official BDH model.

**STATUS: Direction A CONFIRMED BUILDABLE. Claim stands: "BDH activates fewer neurons on input it can predict — sparsity is driven by surprise, not a fixed budget."**

## D5. Direction B — dead (2026-09-06)
B's substrate (Figs 12-13, "currency synapse" / "country synapse") was trained on **Europarl** (European Parliament transcripts, English<->French translation) — a real bilingual corpus, not a toy dataset. Combined with the earlier finding that ρ/σ must be reimplemented from scratch (no state in the repo), B now requires: (a) a translation-scale dataset, (b) a bigger model than A needs, (c) writing the recurrent form by hand. **Not buildable in the ~2.5 days remaining. Treat as dead for this hackathon.**

## D6. Candidate directions — A LOCKED
## D7. Open technical unknowns / TODO before/while building
1. Does `bdh.py` expose σ(i,j) and per-layer activations without major surgery? **Biggest unknown — ~30-min code read decides if A/B are real.**
2. Can the tiny BDH train fast enough on Colab T4 to leave time for the explainer? Untested.
3. Which 3 primary papers (2022–2026) back the chosen concept? Not selected.

---

# PART E — SOURCES

**Primary — Pathway/BDH**
- BDH paper — https://arxiv.org/abs/2509.26507
- BDH-CQ report — https://arxiv.org/abs/2608.09888
- BDH code (MIT) — https://github.com/pathwaycom/bdh
- arc-task-gen (MIT) — https://github.com/pathwaycom/arc-task-gen
- Equations of Reasoning — https://pathway.com/research/the-equations-of-reasoning
- BDH Explainer Ch.1 — https://pathway.com/research/bdh-explainer/brain-inspired-ai-architecture
- BDH Explainer Ch.2 — https://pathway.com/research/bdh-explainer/bdh-architecture-derivation *(unread)*
- BDH Explainer Ch.3 — https://pathway.com/research/bdh-explainer/bdh-interpretability-scaling *(unread)*
- Sudoku Bench blog — https://pathway.com/research/beyond-transformers-sudoku-bench *(unread)*
- ARC-AGI cost press release — https://pathway.com/blog/pathway-150m-model-breaks-arc-agi-1-cost-efficiency-frontier
- HF paper page + Kosowski comment — https://huggingface.co/papers/2509.26507 *(unread)*
- Company site — https://pathway.com/

**Reference explainers named in PS (design inspiration, page 08):** Transformer Explainer, LLM Visualization (bbycroft), CraftGPT, BertViz, Annotated Transformer, Spreadsheets Are All You Need, AttentionViz, Tiktokenizer, CNN Explainer, TensorFlow Playground, GAN Lab, Colorful Vectors, Misread-tSNE, MLU-Explain, Seeing Theory, Distill Momentum, Grokking (PAIR), Double Descent, neuralnetworksanddeeplearning ch.4, ConvNetJS, colah NN-Manifolds, PAIR SAE explorable, Neuronpedia, Anthropic Biology-of-an-LLM, Distill Communicating-with-Interactive-Articles, Migdal's interactive ML list, HF interactive tools, VISxAI.

**Conference (out of scope, see context.md):** NeurIPS 2026 Education Track — https://neurips.cc/Conferences/2026/CallforEducationalResources
