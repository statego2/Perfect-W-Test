# My Perfect Woman — module integration guide

Beauty Preference Lab is an **optional VIS extension**; it is not a replacement for the larger partner preference test. The earlier 135-question source is **not yet stored in this repo**.

## API
```js
import {newSession,summary} from '../modules/beauty/engine.mjs';
import {toPartnerProfileExtension} from '../modules/beauty/partner-adapter.mjs';
const session=newSession();
const extension=toPartnerProfileExtension(session);
// Store independently under: partnerProfile.extensions[extension.namespace]
```

Module output identifies `schema:'my-perfect-woman.extension/1'`, `namespace:'VIS:AESTHETIC_LAB'`, `module_version:'BPL-1.0.0'`, and bank ID `beauty-aesthetic-fixed-v1`. It includes:
- `values`: 8 self-rated aesthetic axes; unknown is null;
- `portraits`: 12 synthetic IDs with raw optional ratings 1–7;
- `pair_preference_order`: only when enough primary comparisons without major side bias;
- `evidence`: coverage and repeat consistency;
- explicit fields prohibiting importance override and compatibility prediction.

## UI / deployment
`modules/beauty/index.html` imports `app.mjs` and the stylesheet and uses static assets with relative paths. It can be linked as a route by a parent app. `offline.html` is a fully bundled demonstration. Run `python3 -m http.server 4173` from repository root.

## Data
Browser `localStorage` key: `my-perfect-woman.beauty.v1`. Explicit JSON import/export is available. Never automatically transmit personal answer data. Keep domain scores, aesthetic observations and actual real-life compatibility separate.

## Validation
Run `node --test modules/beauty/tests/*.test.mjs` after changes. These test algorithmic invariants, not clinical psychometrics. Before production, run browser accessibility, iPhone/Safari, storage and layout testing. Any alteration of stimuli or the meaning of a question requires a version bump, stable migration and reviewed manifest digest updates.
