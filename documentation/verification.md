# Verification

## Submission preparation ? 10 September 2026

| Check | Result and scope |
|---|---|
| BDH trained/random numerical parity | Passed: exact counts and zero patterns; finite values and scale/CE tolerances |
| Transformer trained/random parity | Passed, including corrupted-output and mask/RoPE/head-layout mutation checks |
| Native and hypothetical memory reconstruction | 64 cases passed; [record](evidence/memory-check.json) |
| Static release assembly | Passed from repo/ with scripts/build_site.py; output repo/_site |
| Contrast | Both themes passed measured thresholds; [record](evidence/contrast-check.json) |
| Browser regression | Passed: 616 grid states, guide, sandbox, playback, failure handling and light/dark viewports; [record](evidence/browser-check.json) |
| Interface checks | Passed: keyboard, theme, zoom, parameter accounting, layout and 320/390/768/1440px overflow; [record](evidence/ui-check.json) |
| Concept PDF | One page; 734 extracted words; rendered and visually checked after adding prediction-quality and maturity context |
| Blog PDF | Three pages; 1,717 extracted words; retained from the latest upstream PDF update |
| Demo | 180 seconds, 1080p H.264 + AAC George narration; enlarged captions; full decode and 20 sampled caption alignments passed; [record](evidence/demo-sync-check.json) |

Commands and dependency instructions are in the [technical README](../repo/README.md). The optional external-font request was blocked by the local sandbox on the first interface run; the network-enabled rerun passed. A browser-test wait was corrected to tolerate the normal brief null result during recomputation, without changing application behavior or expected values.

## Historical evidence

The reports in [repo/docs/](../repo/docs/) include earlier numerical, performance, reproduction and public-preview checks. Their timestamps, environments and commit references describe those runs; they are not presented as fresh verification of every current file. In particular, old githack URLs are historical previews, not the current artifact URL.

No new training, human learner study, real-phone test or live-defense evaluation is claimed. Public publishing is separate from external event submission.
