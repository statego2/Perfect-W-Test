# AI developer handoff — My Perfect Woman

This repository is the durable **shared source of truth** between AI conversations. Read `README.md`, `docs/INTEGRATION.md`, `modules/beauty/README.md` and this file before editing. Commit reproducible code and explicit test results; never rely on a different chat containing necessary files.

## Purpose
Build a Greek-first browser application for adults to explore romantic-partner preferences. Maintain a distinction between self-reported values, observed choices, priorities, appearance, chemistry and actual relationship compatibility. This is exploratory, not a clinical instrument or proven matchmaking predictor.

## Current inventory
- Beauty Preference Lab `BPL-1.0.0` is a standalone module at `modules/beauty/index.html`.
- `modules/beauty/offline.html` includes all scripts, styles and fixed synthetic adult portraits.
- `modules/beauty/data.mjs` contains 16 bipolar questions, 12 portrait IDs and 27 comparisons.
- `modules/beauty/engine.mjs` exports scoring, profile, evidence checks and versioned import/export.
- `modules/beauty/assets/` contains 12 versioned images with SHA-256 digests.
- `modules/beauty/partner-adapter.mjs` is a non-destructive `VIS:AESTHETIC_LAB` integration shim.
- The previously designed **135-question partner bank is not yet included**. Request its source before integrating it; don't invent its complete content.

## Non-negotiable technical rules
1. Keep stable IDs and fixed stimulus images; never generate replacements per assessment session.
2. Keep aesthetic preferences distinct from partner-values priorities. Do not automatically rank appearance as the most important domain.
3. Keep missing, ambivalent, conflicting and negative responses distinct.
4. Never infer character, ethnicity, religion, health, sexuality or real-world compatibility from photographs.
5. Do not invent percentages, psychometric validity or scientific certainty; document calibration limits.
6. Prefer independent modules, versioned schemas, pure testable engines and explicit integration boundaries.
7. **Never commit real answers, user profiles, exported session JSON, private photos or credentials.** Local browser storage by default.
8. Prefer PRs for concurrent AI edits; include tests, changed files, limitations and handoff in each PR.

## Run
From repo root:
```sh
python3 -m http.server 4173
node --test modules/beauty/tests/*.test.mjs
```
Open `http://localhost:4173/modules/beauty/`. For offline mode open `modules/beauty/offline.html` locally.

## Next tasks
Run manual Chrome/Safari/iPhone QA; import the exact separate 135-bank when available; build a parent router and unified profile screen; extend empirical calibration with pilot testing. If an AI session ends, commit a handoff note or PR description with next steps.
