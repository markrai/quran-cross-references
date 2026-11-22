# Quran Cross-References: phased adoption

## Merge boundary: Quran reader preview, no default-app cutover

This repository is currently a fork of Bible Cross-References. The original application
remains the working default while the Quran implementation is introduced in isolated,
reviewable phases.

Phases 1A and 1B retain their isolation. Phase 1C introduces an independent Quran route at
`/quran/` without changing the default Bible app shell, existing visualization routes,
Bible datasets, or its translation picker.

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

### Phase 1C: independent bilingual Quran reader preview

- `/quran/?ref=2:255` and `/quran/?ref=2:255&view=threads` open a static-host-friendly
  separate Quran application with shareable canonical ayah references.
- Arabic Tanzil Uthmani is rendered in a dedicated right-to-left, `lang=ar` element.
  English Pickthall is displayed separately left-to-right with `lang=en`.
- The Quran arc view draws the selected surah's curated links in a whole-Quran
  coordinate diagram, with selectable source and target ranges. A lightweight SVG
  implementation avoids making the Bible-specific WebGL scene depend on Quran APIs.
- Threads provide a full surah reader, per-ayah outgoing and incoming connections,
  contextual previews, filtered scope and direction, and a position map.
- `npm run data:quran` verifies raw SHA-256 source pins and publishes deterministic
  JSON datasets under ignored `public/data/quran/`. `npm run build` and `npm run dev`
  now execute this step after the legacy Bible dataset build.
- The route is intentionally `noindex` and not included in the existing Bible PWA
  app manifest or offline-page precache. Mobile/offline acceptance and product
  metadata/branding cutover remain in Phase 1D.
- Added unit and Chromium end-to-end tests for dataset validation, deep links,
  filters, browser history, bilingual text direction and interactive views.

Run `npm run check`, `npm run data:quran`, `npm run build`, then
`npx playwright test tests/e2e/quran-reader.spec.ts --project=desktop --project=phone`.
On a preview built at its default base path, open `/bible-cross-references/quran/`;
under `BASE_PATH=/`, open `/quran/`.

### CI and Windows source integrity

The Quran source importer verifies the original SHA-256 pins. A pre-existing Windows
checkout may have CRLF endings despite the repository's LF attributes. In that case,
it accepts the data **only if** changing CRLF to LF reproduces the pinned bytes
exactly. Any other byte change still fails. The pinned digests and Quran text are
unchanged.

GitHub Actions runs on pull requests and pushes to main. The CI workflow includes
type checking, type coverage, ESLint, Prettier, unit coverage, verified Quran dataset
generation on Linux and Windows, a deterministic Bible dataset manifest check,
the full legacy browser suite, and dedicated Quran desktop/phone browser scenarios.
Deployments depend on all these jobs. A fork owner may have to enable GitHub Actions
in the repository's Actions tab or Settings before any jobs can run.

### Licensing and provenance

See `data/quran/sources.json` for each exact source URL, SHA-256 digest, attribution,
and retrieval date. The Arabic text is reproduced without text normalization or
alteration; the Tanzil license and display-attribution rules must be observed at
product integration. Pickthall's original 1930 translation is public domain in the
United States; confirm any additional rights applicable to the selected digital
edition before releasing it in a consumer-facing bundle. Mutashabihat data is
dedicated CC0 and is not a complete scholarly cross-reference set.

### Next merges

1. **Phase 1D: Product cutover.** Replace metadata, link previews, PWA assets,
   help text, and all Bible-specific UI; validate mobile, offline, accessibility
   and end-to-end flows before replacing the default landing page.

Each phase must be independently mergeable with a passing build, tests and CI.
No incomplete Quran screen should ship as the default. The original WIP
implementation remains in commit `82ae6b54995ba059f08c84e19946e82be70d71c0`
for selectively recovering design and code during later phases.
