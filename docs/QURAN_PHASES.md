# Quran Cross-References: phased adoption

## Current state: Quran-first application (Phase 1D.2)

Phases 1A through 1C established the verified Quran model, graph adapters and
bilingual reader. Phase 1D.1 switched the default application and runtime to
Quran-only. Phase 1D.2 removed the obsolete Bible application and data pipeline
from source control, leaving a small Quran-focused codebase.

The original Bible implementation remains available in Git history. The Quran
application retains its canonical root entry, `/quran/` compatibility entry
and strict pinned-source verification. Quran SEO, PWA, icons, offline and
accessibility acceptance are planned for Phase 1D.3. Both HTML entry points
remain `noindex` until those gates are complete.

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

### Phase 1D.1: Quran default app and isolated build

- `npm run dev` and `npm run build` now run `data:quran` only, without invoking
  any Bible source download, translation import, or STEP Bible build.
- `index.html` mounts the Quran app. Quran references now serialize as
  `/?ref=2%3A255`; previously shared `/quran/?ref=2%3A255` links still load and
  then navigate to canonical root paths on interaction.
- Vite uses only the Quran root and compatibility HTML entries, with
  `publicDir=public/quran-only`. This prevents **stale generated Bible files**
  under `public/data/` from silently leaking into `dist/`.
- The importer writes identical verified Quran JSON to
  `data/quran/generated/` and `public/quran-only/data/quran/`. The published
  URLs remain `/data/quran/text.json` and `/data/quran/relationships.json`
  under the deployment base.
- The production base defaults to `/quran-cross-references/` rather than
  the original project's `/bible-cross-references/`. Set `BASE_PATH=/` for
  root-domain hosting.
- CI keeps strict unit/type/format gates and Windows source verification,
  asserts that Bible assets are absent from the published site, and runs Quran
  desktop/phone browser tests. It does **not** run historical Bible browser or
  Bible offline tests against a Quran-only distribution.
- The original Bible code and isolated unit tests were retained until
  Phase 1D.2, when they were removed. Quran SEO, PWA/offline, visual polish,
  and mobile/accessibility release gates belong to Phase 1D.3.

### Phase 1D.2: Delete legacy code and retain Quran foundation

- Remove all dormant Bible UI routes, six-language Bible translation registry,
  original-words features, Bible WebGL visualizations, debugging shell, locale
  generator and offline worker. None was imported by the Quran reader.
- Remove the Bible raw inputs, source pins, importers, generated dataset checks,
  original site assets, obsolete Playwright snapshots and legacy unit tests.
- Keep `src/core/lib/array.ts` (used by Quran graph adapters) and the generic
  runtime JSON validators and their unit tests as reusable platform helpers.
- Remove unused direct dependencies: Three.js, React Icons, fflate, associated
  type packages, and the browser user-event helper. Prune orphaned lockfile
  packages rather than retaining stale dependency artifacts.
- Remove old `tsconfig.sw.json` and the worker project reference; narrow
  the Vitest/coverage and Playwright configuration to Quran behavior.
  The strict core coverage thresholds remain 98% of statements, lines and
  functions, and 88% of branches; Quran UI behavior also has desktop and
  phone browser acceptance.
- Retain all three pinned raw Quran sources, their SHA-256 checks and
  license/attribution metadata unchanged. `npm run format` ignores raw
  snapshots and generated output.

### CI and Windows source integrity

The Quran source importer verifies the original SHA-256 pins. A pre-existing Windows
checkout may have CRLF endings despite the repository's LF attributes. In that case,
it accepts the data **only if** changing CRLF to LF reproduces the pinned bytes
exactly. Any other byte change still fails. The pinned digests and Quran text are
unchanged.

GitHub Actions is configured to run on pull requests and pushes to main. Active release
checks include TypeScript, type coverage, ESLint, Prettier, unit coverage, verified
Quran generation on Linux and Windows, a Quran-only distribution check, and
desktop/phone Quran browser scenarios. Phase 1D.2 removes the obsolete
Bible manifest and browser suites entirely.
GitHub Pages deployment depends on the active Quran jobs passing.
A fork owner may have to enable GitHub Actions in the repository's Actions tab
or Settings before jobs can run.

### Licensing and provenance

See `data/quran/sources.json` for each exact source URL, SHA-256 digest, attribution,
and retrieval date. The Arabic text is reproduced without text normalization or
alteration; the Tanzil license and display-attribution rules must be observed at
product integration. Pickthall's original 1930 translation is public domain in the
United States; confirm any additional rights applicable to the selected digital
edition before releasing it in a consumer-facing bundle. Mutashabihat data is
dedicated CC0 and is not a complete scholarly cross-reference set.

### Next merges

1. **Phase 1D.3: Production readiness.** Add Quran metadata, share previews,
   Quran-specific PWA/offline caching, mobile/accessibility acceptance and
   complete source attribution/rights review. Remove `noindex` only then.
2. **Phase 2: Relationship exploration.** Improve Quran arc and thread navigation,
   relationship semantics and supported corpus breadth without fabricating rankings.

Each phase must remain reviewable and pass its release gates. The original
WIP implementation remains in commit `82ae6b54995ba059f08c84e19946e82be70d71c0`
for selectively recovering design and code during later phases.
