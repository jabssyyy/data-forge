# Licenses and provenance

- Project license: [MIT](../LICENSE), copyright 2026 Jabin M, Anton, Dev. Existing attribution is preserved; no new claim about registration or individual contributions is made.
- Architecture and implementation reference: [pathwaycom/bdh](https://github.com/pathwaycom/bdh), MIT, copyright 2025 Pathway Technology, Inc. The complete notice is retained in [upstream-bdh-LICENSE.txt](upstream-bdh-LICENSE.txt). Public HEAD checked September 8, 2026: `2b0d7a45b058d4309c84a10e0768d541fe18bdc2`. This is the audit revision, not a claimed historical derivation commit: the original local notes do not pin that commit. Local Python follows the upstream architecture; browser code is an independent JavaScript reimplementation. **Not an official BDH model.**
- Local trained and random weights were exported by the local synthetic probe; they are not official downloaded checkpoints. No external language corpus is bundled for training this artifact.
- IBM Plex Sans and IBM Plex Mono are requested from Google Fonts by the page, with system fallbacks. IBM licenses these under SIL Open Font License 1.1; see the preserved [IBM notice](ibm-plex-LICENSE.txt) and [upstream source](https://github.com/IBM/plex). Network font delivery may vary; no paper figures or external stock images are embedded. PDF exports use ReportLab's standard Helvetica family and do not bundle font files.
- Python/PyTorch and ReportLab are development dependencies, not shipped browser dependencies. Their upstream licenses remain applicable to their packages. Scientific papers are cited, not relicensed as project code.

## AI assistance

Historical project documentation credits Anthropic Claude for planning, mathematical cross-checking, and implementation assistance. This build additionally uses OpenAI Codex with parallel helper agents for UI development, comparison implementation, source review, documentation, and verification. The checks described in the execution ledger are tool-executed checks; they do not imply unrecorded human review or understanding. The team should review and be able to defend the final artifact before external submission.
