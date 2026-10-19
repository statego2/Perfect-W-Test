# AI developer handoff — My Perfect Woman

**Repository is the shared source of truth across conversations.** Read README.md, docs/INTEGRATION.md and the module README files. Before editing, inspect main branch and recent commits because multiple AI developers may be operating concurrently.

## Delivered and published source
- `modules/supertest/index.html`: unified, generated, single-file offline Super Test, with the original 135-item v2 questionnaire plus additional tests.
- `modules/supertest/src/beauty-bridge.mjs`: seventh section **Beauty Intelligence**, shared with the standalone `modules/beauty/` source.
- `modules/beauty/data.mjs` and `engine.mjs` define the fixed bank and scoring (16 values items, 12 portraits, 27 comparisons, version `BPL-1.0.0`).
- `modules/beauty/assets/manifest.json`: fixed `F01`–`F12` WebP, with SHA-256 checks.
- `modules/supertest/build.mjs` embeds verified Beauty assets and original scoring inside a single, offline-capable Super Test HTML.
- `modules/supertest/src/core.mjs` preserves the namespaced raw `beautySession` during normal unified JSON exports and imports.

## Non-negotiable invariants
1. Never regenerate images per test run or silently reassign fixed image IDs or question IDs.
2. Keep Beauty attractiveness/evaluations and partner-domain importance separate. No inference of personality, sexual orientation, ethnicity, faith, health or real-life compatibility from photos.
3. Unknown, ambivalent, skipped and rejected answers are different. No fake psychometric percentages or confidence.
4. Preserve user responses and legacy imports. **Do not overwrite** the 135 questions or their importance ratings from Beauty results.
5. Keep the 15 optional photo upload slots separate from the 12 fixed Beauty portraits.
6. Do not commit real user sessions, profile exports, private uploads or credentials.
7. Do not edit generated `modules/supertest/index.html` directly. Edit source, test, and run `npm run build`; GitHub Actions maintains the generated HTML.
8. Add tests and record decisions and limitations in commits/PRs. Avoid parallel changes to the same source file on main.

## Running and checking
```sh
node --test modules/beauty/tests/*.test.mjs
cd modules/supertest && npm test && npm run build
```
The merged Beauty user flow and standalone local-storage synchronization are implemented, but **manual iPhone/Safari browser QA** remains important. GitHub Actions build success confirms source/build/tests, not psychometric validity or real-device behavior.

## Follow-ups
- Check keyboard/screen-reader and mobile interactions in a real browser.
- Validate import/export round trips and storage persistence on mobile web HTTPS (file:// is less reliable).
- Check all 55 BPL interactions and evidence gates; improve visual preference reliability through pilot research.
- Keep questionnaire versions, evidence provenance and cross-domain synthesis explicit.
