# Submission checklist

The artifact and required documents are built and published in the public source repository. A public immutable preview is verified below. GitHub Pages deployment remains pending owner enablement; external event submission and real-phone checks have not been performed.

| Deliverable/check | Status | Evidence |
|---|---|---|
| Interactive artifact | Complete locally | Live models, curves, controls, guide, dual grids |
| Public source repository | Release pushed and verified | https://github.com/jabssyyy/data-forge |
| Public artifact without sign-in | Verified preview | githack snapshot; normal “Open the page” confirmation, no sign-in |
| GitHub Pages | Pending owner enablement | Current login has push permission but no admin/maintain; Pages enable API returned 404 |
| Concept summary PDF | Passed | One page, 714 extracted words; concept-summary.pdf |
| Separate blog PDF | Passed | Three pages, 1,700 extracted words; blog.pdf |
| README and setup | Complete | Root README and requirements files |
| Primary citations | Verified | sources.md; citations beside claims |
| License/source/AI disclosure | Complete | licenses.md and retained notices |
| Independent model disclosure | Present | Page, README, both PDFs |
| Trained/random BDH parity | Passed | Exact counts/zeros, finite values, scale/CE gates |
| Trained/random Transformer parity | Passed | Exact counts/zeros, dimensions/finite/scale/logits/CE, operator mutations |
| Browser grids and controls | Passed | 616 layer/token/weight states checked for both grids |
| Mobile viewport and themes | Passed | 380px, 768px, 1440px, light/dark; no horizontal overflow |
| Real phone | Not performed | Browser viewport emulation is not a real device check |
| Fresh public-clone training | Passed with drift disclosed | reproduction-check.json: 3.365854× on current runtime |
| External event portal submission | Not performed | No portal submission requested |

Release commit: `68780b82834ae3d51334bab8a54c23a43d48719d`. The [GitHub Actions run](https://github.com/jabssyyy/data-forge/actions/runs/34220031391) passed both numerical engines and static assembly on Ubuntu, then failed at Pages configuration. No model test failed.

Public preview: https://rawcdn.githack.com/jabssyyy/data-forge/68780b82834ae3d51334bab8a54c23a43d48719d/index.html . Verified in a clean browser through its normal confirmation screen: both models, exact initial grid counts, untrained switching, four offline rows, and both PDFs work with zero page errors. See public-preview-check.json and public-pdf-verification.json.

GitHub owner action: repository Settings → Pages → Build and deployment → Source → GitHub Actions, then rerun the deployment workflow. The checked-in Pages workflow verifies both numerical ports, assembles a static allowlisted release, and deploys it. The anticipated Pages address is a configuration target, not a verified live link until the workflow succeeds.
