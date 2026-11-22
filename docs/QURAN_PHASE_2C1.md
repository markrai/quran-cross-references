# Phase 2C.1: Quran analytics foundation

## Scope and evidence contracts

The report is computed from the pinned 6,236-ayah Tanzil Uthmani Quran, verified curated relationships from Waqar144, and the unchanged exact 3–8-word expression evidence from Phase 2B.2. The manifest SHA-256 pins the generated analytics artifact. The client validates the checksum, source pins, schema, canonical surah counts, aggregation invariants and navigable source positions.

A **curated link incidence** is counted once in each surah touched by either endpoint range, including ranges that cross surah boundaries, regardless of how many ayahs in that surah it touches. Consequently, the sum of per-surah link incidences may exceed the global curated link count. A link is cross-surah if its union of touched surahs has size greater than one.

A **computed expression** is a group of verified identical orthographic 3–8-word sequences. Its **word-span occurrences** count every recorded span, including multiple spans in one ayah, exactly once. A computed expression is cross-surah if its occurrences span more than one surah. A distinct expression group contributes once per surah it touches; its span count contributes once per recorded occurrence. The labels never imply lexical roots, morphology or semantic affinity.

The per-100-ayah rate is `round((count / surah_ayah_count) * 100, 2)`. It is an incidence rate, not a probability and not necessarily bounded to 100.

## Navigation and presentation

The Analytics tab is addressable as `?ref=2%3A255&view=analytics`, with the selected reference preserved by history navigation. Select **Curated link incidences** or **Computed word-span occurrences**, then toggle between **Total count** and **Per 100 ayahs**. Users can search by surah name or number, sort by value or canonical order, and select any bar to navigate to source evidence in the corresponding view.

The right column shows global within/cross classifications separately for curated links and computed expressions. The top 32 exact phrases are ranked by word-span frequency, with stable IDs and source navigation. Phrase ranking is descriptive and is not an inferred theological relevance score.

The compact `analytics.json` is included in the PWA's offline installation cache, but is fetched only upon entering Analytics. The complete `expressions.json` remains a separate optional request and is excluded from the PWA precache. A user opening a phrase from Analytics triggers normal Phase 2B.3 expression loading and validation.

## Acceptance

Run `npm ci`, `npm run check`, `npm run data:quran`, `npm run build`, and `npm run test:e2e`. Confirm 114 rows, 2,445 curated links, 5,084 computed expressions, 16,924 word-span occurrences, deterministic regeneration, cross-platform behavior, keyboard navigability and accurate browser history. Verify Analytics loads no full-expression dataset on entry, and the offline PWA includes only the compact analytic projection.

Release indexing remains disabled pending the separate Tanzil attribution, Pickthall digital-edition rights, real-device and accessibility checklist.
