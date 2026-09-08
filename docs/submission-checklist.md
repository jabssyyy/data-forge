# Submission checklist

The artifact and required documents are built and published in the public source repository. A public immutable preview is verified below. GitHub Pages deployment remains pending owner enablement; external event submission and real-phone checks have not been performed.

| Deliverable/check | Status | Evidence |
|---|---|---|
| Interactive artifact | Complete locally | Live models, curves, controls, guide, dual grids, measured memory graph and decay experiment |
| Public source repository | Release pushed and verified | https://github.com/jabssyyy/data-forge |
| Public artifact without sign-in | Verified preview | githack snapshot; normal “Open the page” confirmation, no sign-in |
| GitHub Pages | Pending owner enablement | Current login has push permission but no admin/maintain; Pages enable API returned 404 |
| Concept summary PDF | Passed | One page, 700 extracted words in the updated verified public PDF; concept-summary.pdf |
| Separate blog PDF | Passed | Three pages, 1,715 extracted words in the updated verified public PDF; blog.pdf |
| README and setup | Complete | Root README and requirements files |
| Primary citations | Verified | sources.md; citations beside claims |
| License/source/AI disclosure | Complete | licenses.md and retained notices |
| Independent model disclosure | Present | Page, README, both PDFs |
| Trained/random BDH parity | Passed | Exact counts/zeros, finite values, scale/CE gates |
| Trained/random Transformer parity | Passed | Exact counts/zeros, dimensions/finite/scale/logits/CE, operator mutations |
| Browser grids and controls | Passed | 616 layer/token/weight states checked for both grids |
| Mobile viewport and themes | Passed | 380px, 768px, 1440px, light/dark; no horizontal overflow |
| Interface pass (type, surfaces, motion, page furniture) | Built; browser suite not re-run | ui.js/ui.css, identity layer in style.css, og-preview.png; numerical suites and structural checks pass |
| Real phone | Not performed | Browser viewport emulation is not a real device check |
| Fresh public-clone training | Passed with drift disclosed | reproduction-check.json: 3.365854× on current runtime |
| External event portal submission | Not performed | No portal submission requested |

The interface pass recorded in `execution-status.md` is newer than the release commit below. It has not been published, re-checked in a browser, or included in the public preview linked here.

Release commit: `67e4736b5ffc1e676d124868e78caa9ae349ab00`. The [GitHub Actions run](https://github.com/jabssyyy/data-forge/actions/runs/34227442243) passed both numerical engines plus the64case memory reconstruction suite and static assembly on Ubuntu, then failed at Pages configuration. No model test failed.

Public preview: https://rawcdn.githack.com/jabssyyy/data-forge/67e4736b5ffc1e676d124868e78caa9ae349ab00/index.html . Verified in a clean browser through its normal confirmation screen: both models, the native graph, experimental decay, untrained switching, and both PDFs work with zero page errors. See public-preview-check.json and public-pdf-verification.json.

GitHub owner action: repository Settings → Pages → Build and deployment → Source → GitHub Actions, then rerun the deployment workflow. The checked-in Pages workflow verifies both numerical ports, assembles a static allowlisted release, and deploys it. The anticipated Pages address is a configuration target, not a verified live link until the workflow succeeds.

Updated requirements and memory documentation are audited locally in `requirements-audit.md`. The snapshot above includes the completed memory expansion and updated PDFs; public-preview-check.json records the anonymous verification.

Memory expansion local checks pass:64numerical cases, playback and mode isolation, stale-load recovery, keyboard interaction, fixed graph selection, and320/390/1440px light/dark layouts. The exact static package was checked. See memory-browser-verification.json and requirements-audit.md.
