# Phase 2D.2: Independent emotion annotation sample and QSAC intersections

## Research source and classifications

This phase introduces the independent **Emotionally-Labeled Quran Verses (ELQV)** dataset, by Arwa Almarzoqi and Mohammed Alsuhaibani, published alongside a 2025 peer-reviewed study, *Leveraging large language models for detecting and preserving emotions in quran translations* (Journal of King Saud University Computer and Information Sciences, volume 37, article 271). The dataset was annotated and verified by human specialists in Arabic linguistics and Islamic studies; the research methodology also uses language models and translation experiments.

Source: https://github.com/Arwaalmrzoqi/ELQV
Paper: https://doi.org/10.1007/s44443-025-00269-y

The repository uses CC0-1.0 for the dataset. We pin the original `ELQV.csv` to immutable Git commit `364cdccf6518e35003db51ccf856d9328dbb7ff3`, with SHA-256 `171eff9be7925f4c21a974d7ac6a5c8a553daf3197ad63b9fddf1217f5f4e445` (558,512 bytes). Its source rows include Arabic text and another differently represented Arabic text column. The derived dataset ships **neither text column**, retaining only canonical numeric verse indices, emotion labels and provenance; the unchanged reader continues to use separately pinned Tanzil Uthmani and Pickthall.

The source is classified `external-specialist-annotated-emotions` and `exploratory-not-tafsir`. ELQV's emotional labels refer to one particular research annotation task. They do not claim to describe the Quran's complete meaning, a reader's response, or a divine emotion.

## Source audit and sample coverage

Independent inspection of the immutable original CSV established:

| Measure | Audited result |
| --- | ---: |
| Original rows | 2,100 |
| Unique canonical ayahs | 2,087 |
| Unique verse-emotion memberships | 2,092 |
| Identical repeated (ayah, label) rows | 8 |
| Verses assigned conflicting categories | 4 |
| Unique fear memberships | 672 |
| Unique joy memberships | 586 |
| Unique anger memberships | 494 |
| Unique sadness memberships | 340 |

The original rows by label are 675 fear, 589 joy, 495 anger, and 341 sadness. The source counts sum to 2,100 but do **not** imply 2,100 unique ayahs.

Four ayahs carry several *different* source labels: **20:12** (fear and joy); **26:8** (fear, anger and sadness); **26:172** and **79:17** (fear and anger). Repeated same-label assignments at eight other positions are deduplicated. Every original distinct label is preserved, including disagreements. No classifier, voting algorithm, or manual override selects one preferred interpretation.

The 4-label taxonomy applies only to the selected 2,087-ayah sample. The remaining 4,149 ayahs are **not labeled neutral** or assigned inferred categories. Percentages, if considered, must use the original sample denominator and note multi-label verses.

## Generated data and integrity

`scripts/quran/fetch-elqv.ts` fetches the immutable original CSV and verifies its SHA-256 before saving ignored `data/raw/ELQV.csv`. The importer validates every canonical verse ID, field structure, source label, per-category total, deduplication count and conflict count. The derived `data/quran/emotions.json` is reproducibly generated and SHA-256 pinned in the existing release manifest.

On-demand browser loading rechecks the manifest output SHA-256, source URL/revision, CC0 provenance and the complete small array of sorted, unique verse-label memberships. An optional browser index enables the four label filters, a conflict-only filter, paginated source verses and sample-level distributions without changing any curated graph edge or Quran text.

The original snapshot and per-verse source text columns are deliberately not published. `emotions.json` is excluded from the PWA installation precache, along with other optional large research evidence.

## Cross-source study design

The Emotions tab optionally loads the separately verified **QSAC v1.0** thematic source (CC BY 4.0). Selecting a QSAC topic intersects its canonical ayah IDs with ELQV's **annotated-only** verse IDs. Each visible count is the number of individual ELQV-labeled ayahs also carrying that QSAC topic. The four class columns count source memberships and may overlap on the four multiply labeled verses.

Because the datasets label *different constructs*, these are descriptive cross-dataset co-occurrences, **not semantic agreement scores**, probabilistic confidence, endorsement of a thematic conclusion, or evidence for additional pairwise Quran relationships. Neither QSAC nor ELQV has been evaluated here for representativeness; sampling/selection bias makes a Quran-wide inference invalid.

The browser links every intersection back to its original bilingual reader and supports `view=emotions&emotion=fear&theme=Divine+Mercy`. Core Arabic morphology, curated links, computed exact repeats and graph topology stay independent.

## Acceptance

Run `npm ci`, `npm run data:elqv:fetch`, `npm run check`, `npm run data:quran`, `npm run build` and `npm run test:e2e:ci`. Acceptance verifies exact source pins, 2,100/2,087/2,092 counts and four disagreements, independent topic loading, no source text leaks, deterministic published output, Windows/Linux builds, shareable routes, mobile buttons, keyboard controls, offline core reading and separate optional caching. The original manual rights/accessibility/real-device release gates remain in effect.
