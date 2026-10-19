# Beauty Preference Lab · My Perfect Woman · v1.0

A **real, offline, deterministic Greek-language assessment prototype** for personal **aesthetic preference discovery**. Every question is fixed and every portrait is a locally bundled, fixed image. It uses no API, account, LLM, runtime image generation or cookies. Works on iPhone and desktop as a static web app.

## What's included

- **16 paired aesthetic-value questions** (8 separately named bipolar axes × 2, second reversed for answer-consistency checks).
- **12 immutable generated portrait stimuli** from one static contact sheet, supplied as individual WebP images and SHA-256 digests in `assets/manifest.json`.
- **12 absolute 1–7 face ratings.**
- **24 balanced face comparisons**: a connected 4-regular comparison graph (each portrait appears in exactly 4 primary pairs) with left/right order fixed by stimulus ID.
- **3 mirrored repeat trials**, used only for within-session response consistency, excluded from preference score fitting.
- **Bradley–Terry preference ranking** from primary forced choices (with L2 regularization). Ties become half-wins; neither/unsure/skipped comparisons are not treated as a win.
- Distinguishes trait values from a portrait ranking, separating subjective aesthetics from partner-values priorities.
- Editable responses, back and skip, localStorage, export/import versioned JSON, deletion, partial results.

## Install & run

```
cd beauty-preference-lab
python3 -m http.server 4173
```
Open `http://localhost:4173/`. No build or dependencies. For sharing, serve the folder through any static hosting provider with HTTPS. Can also open `index.html` locally, though some browsers restrict module imports from `file://`.

## Privacy and method

Only the browser stores responses. `localStorage` may be cleared by the browser. The user can export their data as JSON and resume later. Portraits are **synthetic adults**, all generated at one time; the app does not generate pictures per user or session. No inference of ancestry, personality, religion, health, fertility or relationship success is made from appearance.

The original questions are **research-informed, not independently psychometrically validated**. The archetype comparison is a transparent exploratory descriptor based solely on explicit aesthetic-axis self-ratings. When answers are insufficient or contradictory, do not force a type. Descriptions such as “natural” vs “polished” are aesthetic preferences, not moral values or actual partner attributes. An initial inventory with 135 partner questions is a **separate domain**; this is a plug-in VIS module and must not overwrite their answers or domain importance ranking.

**Limitations**: Photos differ in multiple ways (shape, hair, pigmentation, even lighting nuances). Therefore comparisons of faces cannot causally identify which *single* trait the respondent likes. Nor is the comparison set normed for a target population. The 8 axes and descriptors require pilot work, reliability analyses, content-validity review, and preferably controlled same-identity stimuli for validated subtrait estimates.

## Empirical references

- Germine, L. et al. (2015). *Individual Aesthetic Preferences for Faces Are Shaped Mostly by Environments, Not Genes.* Current Biology. https://pmc.ncbi.nlm.nih.gov/articles/PMC4629915/
- Kramer, R. et al. (2024). *The psychometrics of rating facial attractiveness using different response scales.* Perception. https://journals.sagepub.com/doi/full/10.1177/03010066241256221
- Rhodes, G. et al. (2007). *Perceived health contributes to the attractiveness of facial symmetry, averageness, and sexual dimorphism.* https://pubmed.ncbi.nlm.nih.gov/17972486/
- Churchill, R. et al. (2025). *Further evidence that averageness and femininity ... predict facial attractiveness judgments.* https://pmc.ncbi.nlm.nih.gov/articles/PMC11828934/
- Ma, D.S. et al. (2015). *Chicago Face Database* (important contrasting example of standardized **restricted-redistribution** stimulus dataset; **NOT** used here). https://www.chicagofaces.org/

## Next research stage

1. Pilot with 20–50 adults who consent to privacy-safe collection; test face-pair preference consistency and question comprehensibility.
2. Add *fixed* controlled same-identity render variants with changes isolated to hair/makeup/expression/lighting rather than using unrelated portraits to infer traits.
3. Confirm users see meaningful differences in 8 axes and establish test–retest reliability; prune redundant items and adjust wording.
4. Add face-image upload or user-selected reference sets only with documented usage rights and privacy protections; don't auto-classify heritage/health/personality.

## Tests

`node --test tests/*.test.mjs`.

## One-file offline edition

If you only want the finished app without a server, use the sibling file `beauty-test-offline.html`. It embeds all CSS, JavaScript and 12 portraits and is compatible with modern browsers that support standard JavaScript. Browser security settings may limit storage when opened with `file://`; if that happens, save your answers using **Export JSON** and use a local server for durable storage.

To rebuild this independent single file after source edits:

```
python3 build-singlefile.py
```

The machine-readable, fixed questionnaire is exported as `beauty_question_bank_v1.json` by `node build-bank.mjs`.

## 135-question bank integration (non-destructive)

The adjacent `partner-adapter.mjs` exports `toPartnerProfileExtension(session)` as a **versioned VIS namespace extension** of the original question bank. It never edits the 135 original items, their response values, dealbreakers, or the user's explicit 0–5 domain importance. Importantly, this adapter is provided as integration code; the original 135-question app source is **not** modified here, since it was not supplied to this build.

## Test status

Twelve automated tests cover fixed stimuli hashes, deterministic questionnaire IDs, side balance (2L/2R per face), 8 axis scoring, ranking with ties/missing responses, mirror trial consistency, JSON import/export validation, partial profiles, non-destructive integration, and a full simulated UI progression from start to final result. Chromium visual QA was unavailable in this execution environment, so a human browser viewport check remains appropriate before production deployment.