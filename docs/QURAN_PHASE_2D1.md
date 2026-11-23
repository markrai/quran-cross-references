# Phase 2D.1: Independent Quran thematic annotations

## Source and epistemic classification

The primary added source is **QSAC v1.0: Quran Semantic Annotation Corpus**, by Ahmad Bilal (2026), at immutable Git revision `cb3852b127bfdda6668c5eec9e5c1d9cdcde3810`. The repository describes a purpose-built ontology and verse labeling performed using LLM assistance and human review, with explicit disclaimers about possible tag inaccuracies. QSAC provides 18 domains, 70 categories, 338 unique thematic tags and annotations for the canonical 6,236 Quranic ayahs.

Unlike the 2,445 separately curated Mutashabihat links, QSAC annotations are classified `external-llm-assisted-annotation` and `exploratory-not-tafsir`. We do not treat sharing a topic as a vetted relationship between two verses; no pairwise links are created from tags. This source is useful for browsing but not for interpreting theological significance.

The upstream repository makes its annotations and ontology available under CC BY 4.0; this project credits the dataset. The original CSV also contains separate Arabic and Saheeh International English columns. **Neither text column is included in the generated output.** The reader continues to show the previously verified Tanzil Uthmani v1.1 Arabic and Pickthall English editions from independent existing sources.

## Data contract

`data/quran/sources.json` pins two original inputs:

- `qsac-dataset.csv`, SHA-256 `e242e15533eea643a5181006501d56fb95b8674362e7b18ea16c08793471b7a2`
- `qsac-ontology.json`, SHA-256 `95637f6ee8be5d7eb234820a2149805eae51e43d5526343290cca51fec2a7524`

Both files are fetched only from the pinned revision, checked against SHA-256 and cached in ignored `data/raw/`. Generation fails closed if the annotated ayahs, ontology hierarchy, sequential verse order, source headers, or individual tag identities change. The derived compact `data/quran/themes.json` contains the source provenance, ontology tag/domain/category metadata, counts and 6,236 arrays of numeric tag IDs. Its output digest is pinned by the existing foundation manifest.

The browser verifies the transfer digest, canonical manifest and input pins, independently checks every annotation ID and per-tag frequency, and indexes the verses without needing to load either upstream text column.

## Product behavior

The separately labeled **Themes** tab is loaded on demand, with filtering by domain, category and English topic terms. A selected tag produces a 24-result-per-page list of its cited ayahs and a top-12 surah distribution. Each occurrence opens the original Quran reader at that canonical reference. A URL such as `?ref=55%3A13&view=themes&theme=Divine+Mercy` restores the tag and the selected surah. The external label is always displayed as exploratory; neither the curated-relationship graph nor exact-phrase evidence uses these tag identities.

The experimental sidecar is excluded from the default offline PWA precache. Its absence must not affect ordinary Quran reader, graph, analytics, morphology, or exact phrase functionality. The project's existing `noindex`, accessibility and original-source-rights gates remain separate.

## Validation

Run `npm ci`, `npm run data:qsac:fetch`, `npm run check`, `npm run data:quran`, `npm run build`, and `npm run test:e2e:ci`. Confirm 6,236 canonical labeled ayahs, 338 unique tags, no transferred upstream Saheeh International/Arabic fields, deterministic regeneration, checksum pin matching, tamper rejection, back/forward restoration, keyboard/mobile navigation, and exclusion from offline install cache.

**Attribution:** QSAC: Quran Semantic Annotation Corpus (2026), Ahmad Bilal. CC BY 4.0. https://github.com/dev-ahmadbilal/quran-semantic-annotation-corpus
