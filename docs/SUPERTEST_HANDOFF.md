# Unified Super Test · Integration handoff

Module path: `modules/supertest/` (standalone HTML entrypoint: `modules/supertest/index.html`).

## Delivered
135 stable questions in 12 domains, 12 explicit importance ratings, 20 balanced Best–Worst cards, 12 hypothetical relationship scenarios, 50 optional written reflection prompts, 15 fixed visual-pair slots awaiting legitimate images, local state and export/import, descriptive report, supplementary module extension adapter.

## Verify
```sh
cd modules/supertest
npm test
npm run build
python tests/browser_smoke.py
python tests/browser_full_flow.py
```
The Python tests require Chromium and Playwright. They were executed locally before publication and the Node tests passed 15/15.

## Integration contract
* Stable question IDs and module version metadata are authoritative. Do not interpret old numeric quiz exports as new questions.
* Import/export formats are explicit; unknown source IDs are quarantined, not coerced.
* User data stays local by default; no personal answers, image uploads or completed user profiles belong in Git.
* The fixed Beauty Lab portrait stimuli are **not bundled** into this release. The Super Test photo section is user-supplied fixed imagery, and any future linkage to `modules/beauty` must preserve the source module's stimulus IDs and scoring provenance rather than silently recomputing a shared beauty score.
* Do not call descriptive results a predictive relationship compatibility percentage.

Next step: connect launcher/navigation with Beauty Lab and implement a versioned `beauty-v1` read-only import adapter, only after inspecting that module's schema and tests. No false claim of completed cross-module pairing.
