# Submission checklist

Local artifact and required documents are built. Public deployment is pending GitHub Pages enablement by the repository owner; this is not yet a claim of a complete external submission.

| Deliverable/check | Status | Evidence |
|---|---|---|
| Interactive artifact | Complete locally | Live models, curves, controls, guide, dual grids |
| Public source repository | Existing public repository; release push pending | https://github.com/jabssyyy/data-forge |
| Public artifact without sign-in | Pending | Current login has push permission but no admin/maintain; Pages enable API returned 404 |
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

GitHub owner action: repository Settings → Pages → Build and deployment → Source → GitHub Actions. The checked-in Pages workflow verifies both numerical ports, assembles a static allowlisted release, and deploys it. The anticipated Pages address is a configuration target, not a verified live link until the workflow succeeds.
