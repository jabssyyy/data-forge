# DataForge 2026 — Project Context (What We're Building)

**Last updated:** 2026-09-06
**Purpose of this file:** the decision brief — event facts, timeline, what we've decided, what's still open, and how we work. For all company/technical/PS detail see `pathway.md` (dos & don'ts to build by = pathway.md B4b). For the probe experiment see `probe.md`. For the fallback Rime track, see `rime.md`.

---

## 1. The event

| Item | Detail |
|---|---|
| Name | DataForge 2026 |
| Organiser | Kharagpur Data Analytics Group (KDAG), IIT Kharagpur — student data-analytics society |
| Sponsors | Pathway and Rime |
| Platform partner | Unstop |
| Format | Online |
| Prize pool | ₹3,00,000 |
| Team size | 1–4 members |
| Unstop page | https://unstop.com/hackathons/dataforge-2026-iit-kharagpur-1739346 |
| KDAG page | https://kdagiitkgp.com/register-hackathon |

**Note:** DataForge is NOT KDSH. KDSH is KDAG's older flagship (6 editions, Kshitij, ₹4L). DataForge is a separate, newer, online event. Don't use KDSH write-ups as a guide.

## 2. Timeline

| Date | Event |
|---|---|
| 1 Sep 26, 6:00 PM IST | Round 1 (Problem Statement Round) opens |
| 2 Sep 26, 11:59 PM | Registration deadline (per KDAG site) |
| **8 Sep 26, 11:59 PM IST** | **Round 1 submission deadline** |
| 12 Sep 26, 8:00 AM–6:00 PM IST | Round 2 — Presentation Round / finale (virtual or on IIT KGP campus) |

Realistic usable build time is well under 5×24h once college, sleep, and breakage are counted.
Candidate split (not locked): 2 days substrate → 2 days explainer → 1 day writing (one-pager + README) → buffer.

## 3. Team

- Jabin — 5th sem B.Tech, AI & Data Science; ~20–30% grounding in DL/neural nets
- Anton
- Dev
- Claude — working as 4th collaborator. NOT a registered participant; the registered team must build, understand and defend everything (Pathway PS rule).

Stated capability: "we can learn and deploy anything."

## 4. Track decision: PATHWAY (locked)

- **Risk posture: Option B — high-variance/ambitious over safe.** Jabin's explicit choice. Aim for a unique, niche angle that reaches the finale, accepting higher failure risk.
- **Direction: A — "Sparsity is not a budget" (topic #22, Sparse Non-Negative Activations). LOCKED 2026-09-06** — B is dead on time, C was never contended. See pathway.md D5 for why.
- **Track: Pathway.** Reason: Jabin's DL/NN coursework gives real grounding; the track rewards pedagogy + real computation over raw ML horsepower.
- **NeurIPS 2026 Education Track: killed.** PS dangles it; submissions close 4 Sep 2026 AoE (needs NeurIPS-template 2-pager, original material, in-person Sydney presentation). Chasing it sinks the DataForge submission. If the artifact turns out great, submit elsewhere later on our own terms.

## 5. What we're building (the shape, per the PS)

**One interactive web artifact that teaches ONE hard AI concept, where the learner changes a real variable and watches the concept react — with BDH woven into the lesson.** A teaching tool, like Transformer Explainer / TensorFlow Playground, not a model or a paper.

**The five things a valid submission lets a learner do:**
1. Understand one precise, falsifiable claim.
2. Change a real variable (a control mapped to something real in the model).
3. See an immediate consequence (<1s feedback).
4. Compare to truth (expected answer shown beside model output — the gap is the lesson).
5. Connect it to BDH (real, correct, woven in — not bolted on).

**The single hardest requirement — SUBSTRATE:** the concept must actually compute inside the artifact. A real tiny model, a replay of a real run, or a live toy system counts. **A scripted animation scores zero on the biggest criteria.** This is why the open-source `bdh.py` is the whole game (see pathway.md D1).

## 6. Strategic frame (the why behind every decision)

- **This hackathon is a CREDIBILITY EXERCISE for Pathway.** Their core claim ("BDH is a genuinely new, non-Transformer architecture") is still publicly disputed. The rubric's obsessions (real-vs-animated, "no AI slop", label live/precomputed, "a developer's result isn't an external reproduction") all flow from that anxiety.
- **Novelty of topic scores ZERO points.** Uniqueness is the *attention* axis (avoids being 1 of 15 identical entries), not the *scoring* axis. Don't trade clarity for exotic.
- **Knowing DL is table stakes here.** The scarce skill is shrinking a concept until the key variable is visible and moves when touched — interaction design + pedagogy.
- **The "everyone uses Claude/Codex" edge:** the track is built to punish LLM-generated work (15 pts live defense, explicit "No AI slop", "code the team can't explain" = weak). Differentiation = real computation you actually ran and understand.

## 7. FRAMING RULE (do not lose — corrected mid-project)

The goal is NOT "prove BDH works" / "make a skeptic believe." That's advocacy, and it's a trap:
1. **Exceptional = a claim a learner can REPRODUCE in under a minute** — reproduce, not believe. Build a neutral instrument, not an argument.
2. **Strong REQUIRES a disclosed limitation.** An artifact that concludes "therefore BDH works" structurally can't disclose one → locks you out of a scoring element.
Handing an advocacy piece to judges whose sorest spot is being accused of hype is the worst possible move.

**Correct frame:** let a learner operate one real BDH mechanism, get a result themselves, see where it matches truth and where it doesn't, and name the limitation the gap reveals. Every direction must END ON REAL BEHAVIOUR INCLUDING WHERE IT BREAKS — never on "therefore BDH works."

## 8. Open questions — unresolved (in priority order)

1. ~~Is the team registered?~~ **CONFIRMED YES (2026-09-06).**
2. **Can a team submit to BOTH tracks, or must one be chosen?** Not stated on Unstop. Message the organisers.
3. **Which direction — A, B, or C?** (See pathway.md §8.) Not chosen. Jabin leaning via understanding, not just gut.
4. ~~Does `bdh.py` expose state and activations?~~ **RESOLVED 2026-09-05.** Activations available (`xy_sparse`, line 136 — corrected 2026-09-06, NOT `y_sparse`); state (rho) is NOT available, must be reimplemented.
5. ~~Does the Fig-14 sparsity effect reproduce?~~ **RESOLVED + EMPIRICALLY CONFIRMED 2026-09-06. Probe run, effect reproduces: layer 2 shows 15.9% active on a new word vs 4.8% on repeats = 3.32x, at 1/64th the paper's neuron count on one CPU core. Layer 0 shows no effect (built-in limitation). Full numbers in pathway.md D4.** Background: The paper's Fig-14 model was trained on a PURPOSE-BUILT SYNTHETIC TASK, not natural language (n=65536, d=256, L=4 layers, tokenized on single letters, 13-letter warm-up + 8x 8-letter random word repeating every 77 letters). An earlier Shakespeare-trained replication attempt saw nothing because it used the wrong training data, not because the effect is fake. **Full recipe now specified in pathway.md D3 — TODO TODAY: run this exact recipe and check for layer-2 activity of 4.0-7.5% (memorizing) vs ~2.5% (repeating).**
6. **DECIDED: Direction B is dead** (needs Europarl-scale bilingual data + a from-scratch recurrent-state reimplementation — not buildable in ~2.5 days). **Direction A is the build.** See pathway.md D5.
7. ~~Who builds the frontend?~~ **NOT A BLOCKER (2026-09-06) — Jabin's correction.** Build will use AI coding tools (Claude Code etc); "who knows React" is moot. Real residual requirement: whoever reviews the AI-generated code must be able to trace it and defend every component live (rubric: technical ownership 15 pts explicitly tests this; "code the team can't explain" = weak submission). No decision needed now — must be true by submission. Not "can learn React" — can ship a fast, mobile-clean page that doesn't look like a class project. 25/100 pts (interactive substrate 15 + craft 10) ride on this. Unanswered.

## 9. How we work (Jabin's stated preferences)

- Plan fully before building; no execution until the plan has no holes.
- Push back hard; never blindly agree; challenge Jabin's reasoning so he arrives at conclusions.
- Go deep on research; no gaps.
- Verify claims against primary sources, never memory.

---

*This file lives in the chat. Save a copy to carry it forward — re-upload it in a new conversation and turn context-builder on again to continue.*
