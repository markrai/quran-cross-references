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

## Morphology source audit (Phase 2B.4A)

An experimental **Quranic Arabic Corpus v0.4 morphology audit** is available for researchers as `npm run data:morphology:audit`. It requires an independently obtained, unmodified `data/raw/quranic-corpus-morphology-0.4.txt`. The project verifies the upstream Git blob identity and audits verse/word/segment positions, lemma/root coverage, ambiguous multi-stem words and count-level alignment with pinned Tanzil Uthmani.

**This phase does not ship or display morphology annotations.** The Quranic Arabic Corpus is distributed under GNU GPL terms and a verbatim-source notice. The project's application is MIT licensed. The licensing treatment for derived datasets, and word-by-word alignment between the Corpus and our different Tanzil whitespace tokenization, require explicit validation before public release. Equal word counts alone are not proof of aligned Arabic text, so the audit never declares them aligned. See [Phase 2B.4 source intake](docs/QURAN_PHASE_2B4.md).

## Data provenance

The exact source URLs, attribution, rights notes, retrieval dates and SHA-256 pins live in [data/quran/sources.json](data/quran/sources.json).

- Arabic: [Tanzil Uthmani v1.1](https://tanzil.net/docs/Text_License), reproduced without changing the sacred text.
- English: Marmaduke Pickthall (1930), Tanzil digital text.
- Similar-passage relationships: [Waqar144 Quran Mutashabihat Data](https://github.com/Waqar144/Quran_Mutashabihat_Data), CC0.

The Quran implementation was adapted from the open-source Bible Cross-References project by [Oleksii Trekhleb](https://github.com/trekhleb/bible-cross-references). The inherited portions remain covered by the original MIT license; removed legacy code remains accessible in Git history.

**Pull request checks:** GitHub Actions must be enabled for this fork and the full Linux/Windows browser checks required before merge. See [CI setup and merge gates](docs/CI_GATES.md). Production artifacts are tested automatically, including offline reload and graph drag; a failed or flaky test blocks the CI job once required status checks are configured.

See [docs/QURAN_PHASES.md](docs/QURAN_PHASES.md) for the migration roadmap and outstanding work.
