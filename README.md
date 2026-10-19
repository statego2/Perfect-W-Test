# My Perfect Woman · Shared Project Workspace

This is the shared, version-controlled source for the **Super Test** and **Beauty Preference Lab**, so separate AI assistants can work on the same implementation without relying on chat history.

## Current integrated app

**[Super Test · combined single-file HTML](modules/supertest/index.html)** · **[Beauty Lab · independent module](modules/beauty/index.html)**

The Super Test now includes **Beauty Intelligence** as a native seventh section, with these unchanged, fixed stimuli and algorithms:

- 135 fixed partner-choice questions across 12 domains (plus 12 explicit importance ratings).
- 20 balanced Best–Worst tasks, 12 relationship scenarios and 50 optional reflection prompts.
- 15 optional *user-uploaded* visual comparison slots, **kept distinct** from Beauty Lab.
- Beauty Lab `BPL-1.0.0`: 16 fixed aesthetic self-report items (8 axes), 12 immutable synthetic adult portrait images, 12 independent face ratings, 24 balanced pair comparisons and 3 repeated consistency checks.
- A unified, descriptive report showing visual preferences and evidence **without overriding partner-domain importance** or making compatibility predictions.

Every fixed Beauty image is stored at `modules/beauty/assets/F01.webp`–`F12.webp`, integrity-checked against `assets/manifest.json`, and **embedded** into the rebuilt Super Test HTML so that the unified application works offline. Images are not randomly regenerated.

## How to run

- Open `modules/supertest/index.html` directly, or `index.html` at repository root, which redirects there.
- For reliable browser storage on iPhone/Safari, serve on a stable HTTPS origin; file:// storage can be restricted.
- `python3 -m http.server 4173` from repo root, then `http://localhost:4173/modules/supertest/`.

## Tests and reproducible build

```sh
node --test modules/beauty/tests/*.test.mjs
cd modules/supertest
npm test
npm run build
```

No npm install is required. Node.js 20+ is recommended.

GitHub Actions builds and republishes `modules/supertest/index.html` from the exact source plus the fixed Beauty assets, after tests. The source files remain authoritative; don't manually edit generated HTML.

## Architecture and AI handoff

- `AGENTS.md`: rules and handoff for the next AI developer.
- `docs/INTEGRATION.md`: cross-module data contract.
- `docs/SUPERTEST_HANDOFF.md`: released Super Test features.
- `modules/supertest/src/beauty-bridge.mjs`: integrated Beauty UI and local session bridge.
- `modules/beauty/data.mjs`, `modules/beauty/engine.mjs`: authoritative Beauty bank and scoring.
- `modules/beauty/assets/manifest.json`: immutable image IDs and SHA-256 digests.

The Super Test stores a **separate versioned `beautySession`** in its unified local session/JSON exports, while also recognizing the standalone Beauty Lab `my-perfect-woman.beauty.v1` local storage on the **same origin**. Different origins or file:// contexts need a user-controlled JSON transfer; there is no cloud synchronization. Original answer records and domain importance are not changed.

## Scientific and privacy limits

This is research-informed preference exploration, **not validated psychometrics**. Photograph choices reveal neither personality nor relationship outcomes; photos vary across multiple dimensions. Missing answers are not negative answers; no invented scientific confidence or compatibility probability. Real respondents' answers, profiles and personally identifying images must never be committed.
