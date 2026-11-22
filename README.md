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

## Data provenance

The exact source URLs, attribution, rights notes, retrieval dates and SHA-256 pins live in [data/quran/sources.json](data/quran/sources.json).

- Arabic: [Tanzil Uthmani v1.1](https://tanzil.net/docs/Text_License), reproduced without changing the sacred text.
- English: Marmaduke Pickthall (1930), Tanzil digital text.
- Similar-passage relationships: [Waqar144 Quran Mutashabihat Data](https://github.com/Waqar144/Quran_Mutashabihat_Data), CC0.

The Quran implementation was adapted from the open-source Bible Cross-References project by [Oleksii Trekhleb](https://github.com/trekhleb/bible-cross-references). The inherited portions remain covered by the original MIT license; removed legacy code remains accessible in Git history.

**Pull request checks:** GitHub Actions must be enabled for this fork and the full Linux/Windows browser checks required before merge. See [CI setup and merge gates](docs/CI_GATES.md). Production artifacts are tested automatically, including offline reload and graph drag; a failed or flaky test blocks the CI job once required status checks are configured.

See [docs/QURAN_PHASES.md](docs/QURAN_PHASES.md) for the migration roadmap and outstanding work.
