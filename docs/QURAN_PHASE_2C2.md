# Phase 2C.2: Quran graph topology and interactive neighborhoods

## Scope

The network uses only the 2,445 verified curated Mutashabihat similar-passage relationships in `relationships.json`. Existing Arabic phrase matches remain classified as computed orthographic evidence, not graph edges. The graph does not rank religious importance or infer semantic strength.

A directed **surah-pair edge** represents one or more curated links whose source range touches its source surah and whose target range touches its target surah. An individual link contributes at most once to each directed surah pair, regardless of how many individual ayahs the source/target ranges span. Because a range can touch more than one surah, total pair incidences can exceed the global distinct-link count. Edges whose source/target are the same surah are included in deterministic statistics but omitted from the cross-surah network drawing.

**Outgoing** counts an original link once for every surah touched by its source range. **Incoming** likewise counts distinct links for every target surah. **Touching** is their union, with overlapping source/target incidences deduplicated. Per-ayah uniqueness likewise uses a union of link IDs, avoiding double counting self-overlap.

## Architecture

- `src/quran/topology-model.ts` constructs a deterministic typed, directional topology report from the existing validated `QuranRelationshipIndex`.
- `scripts/quran/build.ts` publishes `data/quran/topology.json` and records its SHA-256 under the existing foundation manifest. CI regenerates it twice and verifies byte identity on Linux; Windows verifies the pinned source import and publication.
- `src/quran/topology.ts` verifies the transfer checksum and curated source pin, rejects oversized publications beyond 512 KiB, and independently recomputes the expected graph from the already-loaded relationships before accepting the artifact. Arbitrary graph edges cannot be inserted or substituted.
- The report is in the offline PWA's installation cache but only read and parsed when Network is selected. The larger exact Arabic phrase file remains on demand and excluded from the precache.
- `QuranTopology` renders an SVG with interactive, keyboard-focusable ayah/surah links and corresponding paginated original-link buttons.

## Bounded exploration

The surah network displays **12 partner surahs per page** with outgoing solid lines and incoming dashed lines. Thickness reflects verified directional pair counts, not probabilistic affinity. A minimum-link filter can restrict the view. Select a partner to inspect **all underlying curated link IDs**, paginated at 12 per page, and open any source relationship.

The ayah neighborhood displays **12 first-hop link incidences per page**. A second-hop expansion follows only neighbors on the *current first-hop page*, showing at most **24 additional link incidences**. The UI explicitly reports the displayed/eligible counts. Repeated ayah nodes share one plotted position. The selected ayah may be inside a source/target *range*; plotted neighbor anchors use the first ayah of the opposite range, and the original link detail exposes the full span.

Network links support the canonical URL `?ref=2%3A255&view=network`. Neighborhood state is addressable as `?ref=2%3A255&view=network&network=ayah&depth=2`; direction is preserved in `direction=outgoing` or `direction=incoming`. Browser back/forward follows the same history contract as the existing reader and Analytics.

## Acceptance

Run `npm ci`, `npm run check`, `npm run data:quran`, `npm run build`, and `npm run test:e2e:ci`. Verify directed cross-surah pair accounting across multi-ayah and cross-surah ranges, uniqueness of curated IDs, bounded one/two-hop page limits, published SHA-256 and source equality, deterministic regeneration, keyboard and phone interaction, evidence drilldowns, and correct back/forward restoration. Both Linux and Windows browser acceptance must pass.

Phase 1D.3's separate real-device installation, assistive technology and Pickthall digital-edition rights review remains outstanding; `noindex` stays unchanged.
