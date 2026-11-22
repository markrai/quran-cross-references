# Quran Cross-References: phased adoption

## Merge boundary: Phase 1A, foundation only

This repository is currently a fork of Bible Cross-References. The original application
remains the working default while the Quran implementation is introduced in isolated,
reviewable phases.

Phase 1A deliberately **does not** replace the existing app shell, routes, dataset
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

### Licensing and provenance

See `data/quran/sources.json` for each exact source URL, SHA-256 digest, attribution,
and retrieval date. The Arabic text is reproduced without text normalization or
alteration; the Tanzil license and display-attribution rules must be observed at
product integration. Pickthall's original 1930 translation is public domain in the
United States; confirm any additional rights applicable to the selected digital
edition before releasing it in a consumer-facing bundle. Mutashabihat data is
dedicated CC0 and is not a complete scholarly cross-reference set.

### Next merges

1. **Phase 1B: Quran graph adapter.** Build a range-aware bidirectional index,
   Quran-specific filters, and unit-tested adapters. Keep the original app live.
2. **Phase 1C: Quran reader and visualization.** Introduce the Quran text and
   arc/Threads experience as an independently navigable route, with appropriate
   Arabic RTL and English LTR display. Remove old Bible APIs from Quran-specific
   components instead of renaming their parameters.
3. **Phase 1D: Product cutover.** Replace metadata, link previews, PWA assets,
   help text, and all Bible-specific UI; validate mobile, offline, accessibility
   and end-to-end flows before replacing the default landing page.

Each phase must be independently mergeable with a passing build, tests and CI.
No incomplete Quran screen should ship as the default. The original WIP
implementation remains in commit `82ae6b54995ba059f08c84e19946e82be70d71c0`
for selectively recovering design and code during later phases.
