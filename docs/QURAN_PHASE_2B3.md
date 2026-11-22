# Phase 2B.3: On-demand exact Arabic expression exploration

## Evidence boundary

The 6,236-ayah Tanzil Uthmani Arabic text remains byte-pinned and unchanged. Phase 2B.2 produces 5,084 expressions, each containing a verbatim 3–8-word sequence supported by at least two distinct ayahs, with 16,924 exact source spans. Computed repetition is neither curated cross-reference evidence nor semantic or theological similarity.

The standard data build now validates and publishes the complete expression evidence in a separate JSON artifact under data/quran/expressions.json, with its derived SHA-256 in the foundation manifest. The client checks the downloaded checksum using Web Crypto, the source metadata and tokenization policy, every actual word span, the distinct-ayah requirement, and aggregate counts before enabling the per-ayah index. The file remains limited to 4 MiB.

The optional artifact is never loaded in curated mode, and is explicitly excluded from the offline PWA installation precache. Users who have not chosen computed evidence retain the same initial reader bandwidth and offline content. Entry into computed mode may require a network connection even when the base PWA has been installed.

## Reader and graph behavior

Select Evidence type > Computed exact Arabic phrases to open the expression inspector. The left panel lists unique expressions touching the current ayah, ordered longest first, with overflow disclosure. The right panel shows each recorded source span, including repeated occurrences inside one ayah, and navigates directly to its canonical ayah.

The expression graph draws only edges from the current selected-expression anchor ayah to distinct other ayahs for that same phrase. There are at most 32 target curves per page; the complete target set is navigable through pagination and all source word spans remain in the inspector. This avoids O(n²) pairwise expansion and does not imply a relevance rank.

Computed selection URLs use the evidence=exact parameter and a SHA-256-namespaced expression=exact:v1:<64 hex> identifier. Existing link=N URLs remain reserved for curated relationships. Invalid IDs fail closed; switching evidence modes resets the incompatible selection. The bilingual reader and surah/reference navigation remain available in both modes.

## Acceptance

Run:

    npm ci
    npm run check
    npm run data:quran
    npm run data:expressions
    npm run build
    npm run test:e2e

Verify that opening curated mode downloads no expression JSON; switching to computed mode downloads and validates it once; phrase selection, source navigation, URL history and bounded graph pages work on desktop and mobile; the original curated view remains intact; and the service worker does not cache the optional expression artifact during installation.

The repository stays noindex. Manual real-device, accessibility, Tanzil attribution and digital Pickthall edition rights checks still apply before enabling public indexing.

## Later work

Additional morphology, roots, lemmas or interpretive categories belong in separately sourced and classified evidence layers. Exact orthographic matches cannot be used as substitutes for those classes.
