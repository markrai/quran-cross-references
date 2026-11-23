# Phase 3A.1: Bilingual verse search

## Scope

Search the existing 6,236 canonical ayahs in the **Threads & Reader** view using the original, already-published Tanzil Uthmani v1.1 Arabic and Pickthall English text. This adds no source, server, endpoint, generated dataset, primary tab, or download. It does not touch curated links, source pins, PWA precache, edition notices, robots rules, or release gates.

The search index is derived in browser memory from the verified paired-text dataset and is discarded with the session. Search is available offline whenever the existing Quran reader text is available.

## Matching contract

- English: literal substring after case-folding to lowercase; punctuation and word order are not ignored.
- Arabic exact: literal Unicode codepoint substring. Orthographic marks and word order are preserved.
- Arabic without marks: remove Unicode combining marks and tatweel from the query and comparison projection, not from source scripture. Preserve original UTF-16 offsets to highlight only matching text in the unmodified original ayah.
- No normalization of hamza, alif, ya, ta marbuta, lemma, root or semantic equivalence.
- Count one hit per ayah, with up to 24 separate highlight spans per result. Results remain in canonical Quran order.
- Optional surah filtering uses canonical versification boundaries.
- Maximum query length is 120 UTF-16 code units. Empty or marks-only queries cannot match.

The interface shows 20 matching ayahs per page, both original languages, direct verse navigation and a separate original-evidence inspector. Search does not synthesize relationships or rank Quranic importance.

## Navigation and release boundaries

Use `?view=threads&q=<text>&qlang=ar|en&qmatch=unmarked&qsurah=<1..114>`. English and exact Arabic matching omit the default `qmatch`; invalid or unrelated parameters are dropped. Search state remains in navigation history and is absent from other main views. Opening a result keeps the query and filters while updating the focused canonical ayah. Text entry changes the route only when the Search verses button is activated.

Acceptance requires deterministic unit tests for original-text preservation, diacritic-sensitive and insensitive matches, highlighting offsets, canonical boundary filtering, query constraints, route validation, browser history, and desktop/phone browser exploration. Full CI and real-device release checks remain applicable.
