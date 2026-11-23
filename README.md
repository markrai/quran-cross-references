# Quran Cross-References

Explore curated connections between Quranic passages with bilingual Arabic and English reading, whole-Quran arcs, and per-ayah threads.

The application covers 114 surahs and 6,236 ayahs using pinned Tanzil Uthmani Arabic and Pickthall English text. Its initial relationship corpus contains 2,445 curated textual-similarity links from the Waqar144 Mutashabihat dataset. These links are not exhaustive and do not imply a scholarly relevance ranking or an interpretation.

## Interactive relationship graph

The Arcs view supports zooming, panning, selecting ayahs on the Quran axis,
and highlighting connections touching a selected passage range. Use **Graph
focus through ayah** to highlight a passage, **Only links touching selected
passage** to narrow the display, and click a curve to inspect its source and
target. Passage and relationship selections survive sharing and browser history
via `ref=`, `end=` and `link=` URL parameters.

Run `npm run bench:graph` to measure corpus-wide layout cost, or see
[Phase 2A graph interaction and performance notes](docs/GRAPH_PHASE_2A.md).

## Run locally

Requires Node.js 24 or later.

```powershell
npm ci
npm run dev
```

Open **http://localhost:5173/**. The normal development command builds only Quran datasets and launches the Quran reader.

For a standalone data rebuild:

```powershell
npm run data:quran
```

## Build and test

```powershell
npm run check
npm run build
npx playwright test tests/e2e/quran-reader.spec.ts --project=desktop --project=phone
```

The build publishes `index.html`, a compatibility page at `quran/index.html`, and only the Quran datasets under `data/quran/`. Existing `/quran/?ref=2%3A255` links continue to open the same ayah; new navigations use `/?ref=2%3A255`. A versioned service worker precaches the entire bilingual reader and curated relationships, allowing navigation and reading offline after the initial download.

The default production base path is `/quran-cross-references/` with `SITE_ORIGIN=https://markrai.github.io`. Set both `BASE_PATH` and `SITE_ORIGIN` when building for a custom domain. The build generates original 192px/512px/maskable PNG app icons, a 1200×630 social preview image, and an installable web app manifest without additional runtime dependencies.

Phase 1D.2 removed the unused Bible application, translations, data importers, visualizations, assets and obsolete tests. Phase 1D.3 adds installability, offline data, link previews, exact-ayah sharing, keyboard/mobile improvements, and an embedded Tanzil copyright notice in the derived text JSON. The original Bible implementation remains available in Git history.

**Search indexing remains disabled** until the remaining real-device, accessibility, and digital-edition rights checks pass. See [the release acceptance checklist](docs/RELEASE_CHECKLIST.md) before enabling indexing. A static site can provide a general link preview, but cannot generate a different Open Graph image for every ayah URL.

## Relationship evidence (Phase 2B.1)

The build now publishes a separate, provenance-validated
`data/quran/evidence.json` sidecar. It gives the original curated
relationships endpoint-stable IDs and a typed evidence classification without
changing existing numerical `link=` URLs or Quran source texts. See
[relationship evidence schema and validation](docs/RELATIONSHIP_EVIDENCE.md).

`data/raw/` ignores all unpinned downloads by default, including former Bible
archives. The three checksum-pinned Quran source snapshots remain explicitly
tracked. New sources must be reviewed and allowlisted individually.

## Exact Arabic expression detection (Phase 2B.2)

`npm run data:expressions` scans all 6,236 pinned Tanzil Uthmani ayahs for
verbatim repeated sequences of three through eight words, preserving
ayah/word positions and distinguishing computed evidence from the existing
2,445 curated relationships. The generator writes versioned evidence and
corpus statistics only to ignored `data/quran/generated/`. No computed
expressions are yet shipped to the PWA or rendered as curated arcs.

Run `npm run bench:expressions` to regenerate and profile the corpus.
See [Phase 2B.2 algorithm, provenance and corpus budgets](docs/QURAN_PHASE_2B2.md).

## On-demand exact Arabic exploration (Phase 2B.3)

Choose **Evidence type → Computed exact Arabic phrases** to inspect the 5,084 computed verbatim phrases and navigate their 16,924 recorded word spans. A phrase-specific graph displays at most 32 distinct target ayahs per page, with all targets accessible through pagination. Computed matches are not curated links, root matches or interpretations.

The versioned `data/quran/expressions.json` artifact is SHA-256-pinned in the publication manifest, verified before it is indexed, and loaded only when the computed mode is selected. It is not part of the default offline PWA precache. Deep links use `evidence=exact&expression=exact:v1:...`; legacy curated `link=N` selections remain separate. See [Phase 2B.3](docs/QURAN_PHASE_2B3.md).

## Analytics (Phase 2C.1)

The **Analytics** tab provides a reproducible, navigable view of the Quran's 114 surahs. Compare raw curated-link incidences and exact computed word-span occurrences, or use per-100-ayah rates to normalize for surah length. Search and sort the surah bars, inspect within-surah and cross-surah evidence breakdowns, or open one of the 32 most repeated exact Arabic phrases in its source ayahs.

The separate `data/quran/analytics.json` report is generated exclusively from verified pinned Quran sources and published with a SHA-256 digest in the Quran foundation manifest. The small derived report is cached for offline use, while the much larger complete expressions dataset remains opt-in. Values are descriptive corpus statistics, not theological rankings or semantic similarity scores.

See [Phase 2C.1 acceptance and counting rules](docs/QURAN_PHASE_2C1.md).

## Directed Quran Network (Phase 2C.2)

The **Network** tab explores curated similar-passage topology at two scales. The surah network aggregates source-to-target surah pairs without inflating long ayah ranges into all-to-all links. It supports outgoing/incoming direction, a minimum connection-count filter and bounded partner pages. Every aggregate has an inspectable list of the original curated link IDs. The ayah neighborhood supports one or two hops, capped to 12 first-hop links per page and 24 second-hop links. Its nodes open navigable ayahs; edge labels open their underlying source passages.

The graph is descriptive: connectivity is not a measure of religious significance or semantic similarity. Exact computed Arabic phrases remain a separate evidence mode and are never converted into artificial pairwise curated edges.

The deterministic `data/quran/topology.json` report is SHA-256 pinned in the Quran manifest and verified against the loaded curated source relationships in the browser before rendering. Its compact footprint is included in the offline PWA; the full `expressions.json` remains on demand. The `view=network&network=ayah&depth=2` route is shareable. See [Phase 2C.2](docs/QURAN_PHASE_2C2.md).

## Arabic morphology and grammar (Phase 2B.4)

The reader's **Evidence type** selector now includes the original **Quranic Arabic Corpus (QAC) v0.4**, with actual prefix, stem, suffix, root, lemma, and grammatical-feature annotations. Explore individual Arabic source words, switch between root and lemma families, search exact Arabic or Buckwalter annotations, and follow each occurrence to its original verse and word position.

This segment-level evidence is different from curated similar passages and computed exact 3–8-word phrase repetitions. The QAC source's older word tokenization is **not** assumed to match the newer Tanzil display text position-for-position; canonical verse references are preserved. The verified QAC dataset is downloaded and indexed on demand, not precached as part of the offline PWA, and the original copyright notices accompany its derived publication.

See [Phase 2B.4: QAC morphology](docs/QURAN_PHASE_2B4.md).

## Experimental thematic source expansion (Phase 2D.1)

The **Themes** tab explores 338 topical annotations grouped into 18 domains and 70 categories from the independent QSAC v1.0 corpus. Filter topics, inspect per-surah distributions, and open each assigned ayah in the existing bilingual reader. Share any selected topic using `?view=themes&theme=Divine+Mercy`.

**Evidence disclaimer:** QSAC labels were created with LLM assistance and human review. They are exploratory external annotations, **not** original curated similar-passage links, a scholarly consensus, tafsir, or new machine-inferred Quran graph edges. Every visible assignment links back to the original ayah so you can review it.

The source CSV and ontology are fetched at pinned immutable revisions and SHA-256 checked during builds. Only original QSAC topic labels, ontology metadata, and canonical assignment IDs are published as `data/quran/themes.json`; **Saheeh International translation and the separate Arabic text columns are never republished**. QSAC v1.0 annotations and ontology © Ahmad Bilal, CC BY 4.0; see [Phase 2D.1](docs/QURAN_PHASE_2D1.md). The optional theme file is loaded when selected, not included in the PWA installation cache.

## Independent specialist emotion annotations (Phase 2D.2)

The **Emotions** tab adds a second, independently developed research source: [Emotionally-Labeled Quran Verses (ELQV)](https://github.com/Arwaalmrzoqi/ELQV) by Arwa Almarzoqi and Mohammed Alsuhaibani (2025). It provides expert-reviewed fear, joy, anger and sadness labels for a **selected sample**, not for the full Quran. The underlying research included human verification and LLM-assisted methods.

Its original file has **2,100 rows, 2,087 distinct canonical ayahs and 2,092 unique verse-emotion memberships**. Eight repeated rows duplicate the same label, while four ayahs carry multiple, conflicting labels, which remain visible. No majority vote or new cross-reference edges are invented.

Optionally load QSAC topics inside the Emotions tab to examine **cross-dataset intersections** and open the original bilingual ayahs. These are descriptive co-occurrence counts restricted to the ELQV sample, not annotator agreement or Quran-wide prevalence. The original Arabic and translation columns in the external CSV are not republished. The pinned, compact `data/quran/emotions.json` sidecar is fetched only on demand and excluded from PWA install precache.

Share a filter or intersection using `?view=emotions&emotion=fear&theme=Divine+Mercy`. See [Phase 2D.2: expert emotion sample and intersections](docs/QURAN_PHASE_2D2.md) for the audit and limitations.

## Unified per-ayah evidence inspector (Phase 2E.1)

The Quran reader now includes an expandable **Evidence for this ayah** inspector under the selected bilingual passage in both **Arcs** and **Threads & Reader**. It unifies navigation across **five evidence sources** without mixing their classifications:

- **Curated passages:** original directional Mutashabihat link IDs, including source range overlaps, with direct original-link drilldown.
- **Exact Arabic expressions:** distinct repeated orthographic phrases at this ayah, linked to their source occurrences.
- **QAC morphology:** original annotated word, lemma and root positions, without assuming historical QAC tokenization aligns to the displayed Tanzil v1.1 word positions.
- **QSAC themes:** separately sourced, LLM-assisted/human-reviewed exploratory topic labels, linked to their own thematic source explorer.
- **ELQV emotions:** specialist research annotations, preserving conflicting labels and explicitly identifying ayahs **not covered by its sampled dataset**, never classifying them as neutral.

The inspector is collapsed initially. Opening a category loads only that source's existing SHA-256-verified optional sidecar; curated links are already present in the reader. The **Check all five sources** button explicitly requests all optional data for a compact coverage comparison. Counts indicate **which independently verified sources contain recorded evidence for the selected ayah**, not consensus, religious significance, truth, or similarity rankings. Failed/unchecked sources remain distinct from verified absence and research-sample noncoverage.

Share an exact reader state such as `?ref=26%3A8&view=threads&inspect=emotions` or `?ref=2%3A255&view=threads&inspect=all`. Browser back and forward retain the selected source; switching ayahs recalculates coverage without refetching already verified datasets. This phase introduces **no new corpus**, no new pairwise graph edges, no login infrastructure, and no extra PWA installation data. See [Phase 2E.1](docs/QURAN_PHASE_2E1.md).

## Data provenance

The exact source URLs, attribution, rights notes, retrieval dates and SHA-256 pins live in [data/quran/sources.json](data/quran/sources.json).

- Arabic: [Tanzil Uthmani v1.1](https://tanzil.net/docs/Text_License), reproduced without changing the sacred text.
- English: Marmaduke Pickthall (1930), Tanzil digital text.
- Similar-passage relationships: [Waqar144 Quran Mutashabihat Data](https://github.com/Waqar144/Quran_Mutashabihat_Data), CC0.

The Quran implementation was adapted from the open-source Bible Cross-References project by [Oleksii Trekhleb](https://github.com/trekhleb/bible-cross-references). The inherited portions remain covered by the original MIT license; removed legacy code remains accessible in Git history.

**Pull request checks:** GitHub Actions must be enabled for this fork and the full Linux/Windows browser checks required before merge. See [CI setup and merge gates](docs/CI_GATES.md). Production artifacts are tested automatically, including offline reload and graph drag; a failed or flaky test blocks the CI job once required status checks are configured.

See [docs/QURAN_PHASES.md](docs/QURAN_PHASES.md) for the migration roadmap and outstanding work.
