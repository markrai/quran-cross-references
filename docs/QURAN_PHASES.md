# Quran Cross-References: phased adoption

## Merge boundary: Quran foundation and graph adapter, no UI cutover

This repository is currently a fork of Bible Cross-References. The original application
remains the working default while the Quran implementation is introduced in isolated,
reviewable phases.

Phases 1A and 1B deliberately **do not** replace the existing app shell, routes, dataset
registry, WebGL renderer, PWA cache or translation picker. Switching those piecemeal
would break the working application.

### Included in Phase 1A

- Canonical 114-surah, 6,236-ayah Quran numbering (`src/core/quran/`).
- Dense integer indices with reversible `surah:ayah` identifiers.
- Arabic and English reference-search parsing, with bounds validation.
- Pinned raw Arabic (Tanzil Uthmani 1.1) and Pickthall English source snapshots.
- Pinned Waqar144 Mutashabihat similar-passage source snapshot (CC0).
- Deterministic, checksum-verifying Quran importers in `scripts/quran/`.
- Dedicated tests for scripture boundaries, reference parsing and relationships.

Run `npm run data:quran` to verify the pinned input hashes and build the temporary
datasets under ignored `data/quran/generated/`. No downloader or network access is
required. The normal `npm run check` tests the isolated model and importers, and
the CI check job also invokes `npm run data:quran`.

The importer preserves source and target ayah ranges as well as upstream `ctx`
values. It does not fabricate relevance votes, theological assertions or links.
The generated text has separate source and license entries for Arabic and English.

### Phase 1B: range-aware Quran graph adapter

- `QuranRelationshipIndex` validates the generated `quran-similar-passages` schema,
  numbering scheme, range bounds, metadata and duplicate relationships before indexing.
- Bidirectional per-ayah CSR postings index **every member** of both source and target
  ranges, including ranges spanning surah boundaries. Single-ayah queries preserve the
  stable source link order; range queries deduplicate links by ID.
- Quran-specific filters select same-surah, cross-surah, and selected-surah links.
  Same-surah means **both ranges are wholly inside the same surah**, not merely that
  their first ayahs match. A selected-surah filter includes a link when either range
  intersects any selected surah.
- Passage adapters return outgoing/incoming connections once per link per direction,
  retaining the full opposite endpoint and clipping the local endpoint to the selection.
- Arc adapters emit midpoint coordinates, stable link IDs, and preserved upstream
  `contextAfter` metadata. No relevance votes, rankings or theological
  assertions are inferred. They do not yet feed the existing Bible WebGL renderer.
- Unit tests cover validity, boundaries, collisions, cross-surah ranges, stable
  ordering, and the complete 2,445-link imported Mutashabihat source.

Run `npm run check` and `npm run data:quran` for acceptance. The checked-in scripture sources
also use explicit LF checkout rules to preserve their reviewed SHA-256 values on Windows.

### Licensing and provenance

See `data/quran/sources.json` for each exact source URL, SHA-256 digest, attribution,
and retrieval date. The Arabic text is reproduced without text normalization or
alteration; the Tanzil license and display-attribution rules must be observed at
product integration. Pickthall's original 1930 translation is public domain in the
United States; confirm any additional rights applicable to the selected digital
edition before releasing it in a consumer-facing bundle. Mutashabihat data is
dedicated CC0 and is not a complete scholarly cross-reference set.

### Next merges

1. **Phase 1C: Quran reader and visualization.** Introduce the Quran text and
   arc/Threads experience as an independently navigable route, with appropriate
   Arabic RTL and English LTR display. Remove old Bible APIs from Quran-specific
   components instead of renaming their parameters.
2. **Phase 1D: Product cutover.** Replace metadata, link previews, PWA assets,
   help text, and all Bible-specific UI; validate mobile, offline, accessibility
   and end-to-end flows before replacing the default landing page.

Each phase must be independently mergeable with a passing build, tests and CI.
No incomplete Quran screen should ship as the default. The original WIP
implementation remains in commit `82ae6b54995ba059f08c84e19946e82be70d71c0`
for selectively recovering design and code during later phases.
