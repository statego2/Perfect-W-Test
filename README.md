# My Perfect Woman · Shared Project Workspace

**Canonical repository for the project's application modules, questionnaires, specifications, tests, and AI-to-AI handoffs.** The aim is to help the user learn their *own* partner and aesthetic preferences; it does **not** claim to identify a predetermined perfect real person or predict relationship success.

## What is already available

| Module | Status | Entry |
|---|---|---|
| Beauty Preference Lab v1 | Working standalone prototype, requires browser QA and psychometric validation | [Run the module](modules/beauty/index.html) |
| 135-question partner test | **Not incorporated in this repository yet**; separate, previously designed bank | Handoff instructions below |
| Unified result engine / full app | Not yet integrated | Planned |

The Beauty module is a **fixed** test with 8 aesthetic self-report axes, 16 value questions, 12 synthetic portrait stimuli, 12 face ratings, 24 balanced face comparisons and 3 mirrored consistency checks. Images are committed in the repository rather than regenerated per test session. See [the module README](modules/beauty/README.md).

## Run

From the repository root, run:

```bash
python3 -m http.server 4173
```

Then navigate to `http://localhost:4173/` or `http://localhost:4173/modules/beauty/`.

Tests (Node.js 18+):

```bash
node --test modules/beauty/tests/*.test.mjs
```

No npm install or API keys required.

## Essential reading for any next AI developer

1. [AGENTS.md](AGENTS.md) — cross-chat implementation contract, handoff, safety, scope.
2. [docs/INTEGRATION.md](docs/INTEGRATION.md) — how to plug modules together without mutating answers.
3. [modules/beauty/README.md](modules/beauty/README.md) — tested feature list and methodological limitations.
4. [modules/beauty/beauty_question_bank_v1.json](modules/beauty/beauty_question_bank_v1.json) — versioned deterministic item bank.
5. [modules/beauty/assets/manifest.json](modules/beauty/assets/manifest.json) — image IDs and SHA-256 checksums.

## Source-of-truth rule

**Commit deliverables and architectural decisions here** instead of relying on ChatGPT memory or another conversation. When working in multiple chats, use a new branch/PR and record changed files, decisions, tests and handoff information in the PR description. Do not imply the repository contains work that hasn't been committed.

## Important limits

Research-informed exploration, **not validated psychometrics**. Portrait preferences do not prove why an individual face appeals to someone. No inference about personality, ancestry, faith, health or compatibility from images. Personal answer data must remain private by default; never commit actual user sessions, exports, photographs or sensitive profiles.
