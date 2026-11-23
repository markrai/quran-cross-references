# Quran Cross-References: phased adoption

## Current state: Phase 1D.3 production-readiness implementation

Phases 1A through 1C established the verified Quran model, graph adapters and
bilingual reader. Phase 1D.1 made Quran the default app, and Phase 1D.2 removed
the unused Bible application. Phase 1D.3 adds site-level sharing metadata,
generated installation artwork, an installable manifest, versioned offline
reading, keyboard/mobile improvements, and complete Quran-text attribution.

The original Bible implementation remains available in Git history. Quran SEO
indexing is **not** enabled automatically. Both entry points remain `noindex`
until the tests and manual device, accessibility and source-rights gates in
`docs/RELEASE_CHECKLIST.md` are satisfied.

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

### Phase 1D.3: installation, offline, accessibility and attribution

- Generate deterministic original PWA PNG icons at 192px, 512px and maskable
  512px, plus a 1200×630 raster social preview, using a dependency-free Node
  script. No Bible-era brand assets are reused.
- Add a manifest scoped to this app's deployment base and register its service
  worker only for production builds. The worker predownloads the built HTML,
  JS/CSS, icons and **both Quran texts and their relationships** before becoming
  active, versions the shell using content hashes, and drops only prior Quran
  caches. Existing `/quran/` deep links work offline as well.
- Add canonical site metadata, Open Graph and Twitter summaries and a
  site-level PNG preview. On static hosting, these previews are necessarily
  site-level rather than dynamically rendered for each ayah.
- Add exact-reference sharing via the Web Share API with clipboard fallback,
  a keyboard skip link, visible focus rings, at least 44px primary touch
  controls, narrower phone layout and an offline indicator.
- Embed the **verbatim Tanzil copyright/terms notice** in derived
  `text.json`, without changing any Arabic ayah. Preserve visible source
  attribution and a direct link to the generated provenance manifest.
- Add browser acceptance for icon dimensions, metadata, a real offline
  page reload and legacy-link navigation, keyboard control, and sharing.
- Retain `noindex` until the manual device and source-rights review passes.
  Check `docs/RELEASE_CHECKLIST.md` before public release.

### Phase 2A: Interactive relationship exploration

- Add a bounded pan/zoom coordinate system for the Quran arc visualization,
  including button controls, drag gestures and Ctrl/Cmd-wheel zoom.
- Precompute labeled SVG paths after corpus/filter changes, then cull
  off-screen arcs during navigation while preserving long-distance links.
- Highlight all links intersecting a selected passage range, including
  multi-ayah source/target ranges. Support an optional focus-only view.
- Select ayahs from the graph axis with mouse/touch or keyboard arrows,
  synchronized with the bilingual reader and browser history.
- Round-trip `ref=`, optional `end=` and optional `link=` in deep links.
  Malformed values are ignored and stale selections are cleared when
  the reader moves to another passage.
- Add unit/browser acceptance, plus `npm run bench:graph` for an
  initial CPU layout baseline. Actual browser paint and frame timing
  remain prerequisites for considering Canvas or WebGL.
- Document controls and measurements in `docs/GRAPH_PHASE_2A.md`.
  Scripture sources, hashes, attribution and relationship semantics
  remain unchanged.

### Phase 2B.1: Typed relationship evidence and provenance

- Publish a `quran-relationship-evidence` version 1 sidecar with one explicit
  `curated-similar-passage` classification and source assertion per existing
  curated relationship, without inventing confidence scores or interpretations.
- Preserve `relationships.json` and all numeric `?link=N` IDs unchanged;
  define endpoint-stable namespaced IDs independently of the array order.
- Validate classification, evidence kind, source ID, source SHA-256, license,
  attribution and retrieval date against `data/quran/sources.json`. Reject
  missing, reordered or forged evidence records.
- Keep existing bilingual reader, graph and offline behavior unchanged.
  Make the new sidecar available to future typed relationship views, while
  retaining backward-compatible lookup adapters for the old numeric IDs.
- Default-ignore unpinned `data/raw/` downloads. Explicitly allowlist only
  the three checksum-pinned Quran inputs. Verify both rules on Linux and Windows
  with Git-based regression tests.
- Preserve strict lint, formatting, coverage, production artifact and
  desktop/phone tests; see `docs/RELATIONSHIP_EVIDENCE.md`.

### Phase 2B.2: Verbatim Arabic repeated expressions

- Tokenize the 6,236 verified Arabic ayahs without modifying Unicode,
  vowels or Quranic marks. Retain word positions and source text offsets.
- Detect 3–8 consecutive-word expressions in at least two distinct ayahs.
  Keep repeated occurrences within one ayah but do not generate
  cross-ayah sequences or pairwise relationship explosions.
- Remove a shorter expression only if its complete set of occurrences is
  covered by a longer identical repetition at matching offsets.
- Store occurrence groups as independently verifiable
  `quran-exact-expressions` evidence, with namespaced SHA-256 identities,
  source SHA/license attribution and explicit `computed` origin.
- Produce ignored `expressions.json` and `expression-profile.json` for
  repeatable CPU/memory/output measurements. Keep computed matches out of
  the offline PWA until a separate product-size review.
- Validate corpus-wide source spans, tampering, byte reproducibility,
  and Windows/Linux generation through CI, maintaining all existing
  curated IDs and browser acceptance. See `docs/QURAN_PHASE_2B2.md`.

### Phase 2B.3: On-demand exact phrase browser

- Generate and publish the complete pinned 5,084-expression dataset separately from the 2,445 curated relationships.
- Verify published SHA-256, Tanzil source metadata, schema and every Arabic word span in the client before constructing per-ayah postings.
- Select computed evidence explicitly; browse phrase occurrences, navigate their source ayahs and share stable IDs without repurposing curated link numbers.
- Render at most 32 distinct target arcs per graph page, without all-to-all edge expansion; keep all source spans accessible.
- Do not add the optional 1.77 MB artifact to the initial curated download or the PWA offline installation cache.

See [Phase 2B.3](QURAN_PHASE_2B3.md). The separate real-device and rights release gates still apply.

### Phase 2C.1: Corpus analytics foundation

- Build a deterministic summary artifact from pinned curated relationships and exact Arabic phrase evidence.
- Count each curated relationship once globally and once per surah it touches; count each computed word-span occurrence once, preserving multiple occurrences within an ayah.
- Separate within-surah and cross-surah evidence classes and provide both raw counts and length-normalized per-100-ayah measures.
- Show an interactive, searchable 114-surah distribution and 32 ranked verbatim Arabic phrases with links to original ayah contexts.
- Pin and verify the small analytics JSON artifact, precache it for offline PWA availability, and keep the full 2B.3 expression corpus opt-in.
- Retain the original text, relationship IDs and the noindex release gates.

See [Phase 2C.1](QURAN_PHASE_2C1.md).

### Phase 2C.2: Directed graph topology and bounded navigation

- Precompute canonical curated surah source-to-target pair counts, incident and directed degree statistics and the top 32 highest-link-incidence ayahs.
- Retain every original curated relationship ID for each directed surah-pair aggregate, including cross-boundary source or target ranges.
- Validate a pinned topology artifact against the source index in the browser before interactive display.
- Render a paged 12-partner surah network with arrow direction, count-based stroke weight, minimum-count filtering and all edge evidence available through 12-ID evidence pages.
- Expand the reader's selected ayah through up to 12 first-hop relationships per page, optionally showing up to 24 distinct second-hop link incidences. Every visible link opens the original curated relationship.
- Keep computed exact-expression occurrence evidence segregated; no all-to-all phrase connections and no misleading theological rankings.
- Include the compact report in the existing PWA precache, without changing the optional full-expression download or release gates.

See [Phase 2C.2](QURAN_PHASE_2C2.md).

### Phase 2B.4A: Morphology source intake (research-only)

- Evaluate the Quranic Arabic Corpus v0.4 (Kais Dukes, GNU GPL) and QuranMorph (SinaLab, CC BY 4.0) as distinct morphology annotation sources.
- Provide a pinned, offline QAC v0.4 reader that rejects changed upstream bytes, missing license notice, noncanonical references, noncontiguous word/segment numbering and absent stem annotations.
- Report lemma/root completeness, ambiguous multi-stem words and per-ayah word-count disagreements with our preserved Tanzil Uthmani text.
- **Do not** publish, relicense or silently align GPL-derived morphology; the main app, offline precache and existing evidence types remain unchanged.
- Next: verify licensing and implement deterministic surface-form alignment before exposing a separately classified lemma/root view.

See [Phase 2B.4 intake and acceptance](QURAN_PHASE_2B4.md).

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

1. **Phase 1D.3 release verification.** Complete real-device installation,
   offline, screen-reader and Pickthall digital-edition rights review. Remove
   `noindex` only in a separate verified release change.
2. **Phase 2B: Relationship classification.** Distinguish curated similar passages,
   repeated expressions and other verified relationship types without fabricating rankings.
3. **Phase 2C: Quran analytics.** Make cross-surah distributions, repeated terms and
   graph structure explorable with links to their source ayahs.
4. **Phase 2D: Corpus expansion.** Review additional attributable sources without
   blending generated similarity suggestions with curated evidence.

Each phase must remain reviewable and pass its release gates. The original
WIP implementation remains in commit `82ae6b54995ba059f08c84e19946e82be70d71c0`
for selectively recovering design and code during later phases.
