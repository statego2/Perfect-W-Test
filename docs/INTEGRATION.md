# Integration guide: Unified Super Test × Beauty Lab

## Current status
The integration is now implemented, not only proposed. The Super Test includes a seventh section **Beauty Intelligence** (16 self-report value questions, 12 fixed face ratings, 27 portrait comparisons), and a Beauty section in the unified report. The 12 fixed WebP portraits come from the authoritative standalone Beauty Lab dataset, are SHA-256 verified at build time and embedded in the final combined offline HTML.

## Source dependency
- Super Test source: `modules/supertest/src/{app,core,beauty-bridge}.mjs`.
- Beauty engine and immutable test bank: `modules/beauty/{data,engine}.mjs`.
- Beauty photos and checksums: `modules/beauty/assets/`.
- Integration bundling: `modules/supertest/build.mjs`; generated entry: `modules/supertest/index.html`.

**Do not independently copy/paste/modify the Beauty question data** into Super Test: the build script reads it directly. The original 135-item Super Test bank remains stable, with independent 0–5 importance ratings.

## Storage and export
`mpw-supertest-session-v1` contains the normal Super Test state, including `beautySession` with the original Beauty `schema:1`, `version:BPL-1.0.0`, `bank:beauty-aesthetic-fixed-v1`, plus value, face rating and paired-choice answers. The Super Test imports this payload through its normal unified JSON import/export. The standalone Beauty Lab also stores `my-perfect-woman.beauty.v1`, which the Super Test can discover **on the same origin**. There is no automatic synchronization between different origins.

Use `modules/beauty/partner-adapter.mjs` if a future engine needs an explicit `VIS:AESTHETIC_LAB` namespaced extension, but do not inject its results as domain-importance values or relationship-compatibility estimates.

## Testing
```sh
node --test modules/beauty/tests/*.test.mjs
cd modules/supertest && npm test && npm run build
```
GitHub Actions automates these checks and keeps the built HTML current. Browser QA (especially iOS Safari, accessibility and persistent storage) still needs separate verification.

## Scientific boundaries
Fixed synthetic images improve reproducibility, but each picture differs in multiple visual features; the questions are exploratory and not standardized or validated for psychometric inference. Report raw choices and evidence coverage; do not infer character, faith, ethnicity, sexuality or compatibility.
