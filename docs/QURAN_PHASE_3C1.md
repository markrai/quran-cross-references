# Phase 3C.1: Morphology-aware verse search

## Evidence and corpus contract

This phase adds **Quranic Arabic Corpus v0.4 annotation search** to the existing bilingual Quran verse search. It introduces no generated semantic inferences and uses the already-pinned `data/quran/morphology.json` data validated against the original Quran manifest and SHA-256.

Literal Arabic and Pickthall English searches retain the Phase 3A.1 exact-text and optional unmarked Arabic matcher. The **root** or **lemma** search branches use the existing `QacMorphologyIndex.resolve` parser, accepting exact Arabic or Buckwalter identifiers. It returns the registered term and the original QAC occurrence list. No stemming, phonetic expansion, root guessing or new word dictionaries are introduced.

The resulting corpus words are grouped by their zero-based canonical ayah index and sorted by numeric ayah and QAC word position. UI labels convert the QAC word position to **one-based** but do not use it to compute Tanzil character offsets. Original `lang="ar" dir="rtl"` Tanzil and `lang="en" dir="ltr"` Pickthall verses stay byte-identical. Search results label QAC v0.4 and show the annotated word form and part of speech, with an explicit link to the existing QAC inspector.

Root-family hits and lemma-family hits are **linguistic annotations**, not curated cross-references, full-text substring matches, reliable word-to-word Tanzil codepoint alignments, or interpretations of meaning. Result counts count *distinct ayahs* while a verse may contain multiple annotated QAC words.

## URLs and failure behavior

The existing `q`, `qlang`, `qmatch`, and `qsurah` parameters are preserved for literal searches. A morphology query adds `qmode=root` or `qmode=lemma`, with `qlang=ar`. Invalid modes or incompatible `qlang=en` combinations discard the search state instead of silently falling back to literal search. The user-supplied term is validated against the same 120-code-unit limit and control-character policy as original text search. Only canonical surah filters 1–114 are accepted.

Result links retain the query state, filtered surah, and browser history. Inspecting an occurrence enters existing `evidence=morphology` with the registered Buckwalter term, grouping and one-based corpus word position. Related curated and exact-phrase evidence is never implicitly rewritten.

The optional QAC corpus is fetched only on an active morphology query or existing morphology inspector request. Loading uses the existing manifest/byte-hash verification and bounded data size; failures present a retry rather than a fabricated empty result set. The foundational bilingual text and search remain independent of the optional corpus.

## Offline boundary

Original-text search operates within the installed offline Quran shell. The larger optional QAC morphology artifact is **not precached at installation**. In an already-loaded reader session, verified morphology data remains available from memory even if the network goes away. Fresh offline sessions cannot assume optional morphology availability until separately cached support is introduced and validated. A missing offline QAC response must remain an explicit load failure, never a false zero-results message.

## Automated acceptance

- Exact Arabic/Buckwalter resolver, canonical sorting, duplicate ayah aggregation, one-based word labels, surah bounds and malicious/unbounded queries.
- URL parser round-trip, invalid morphology mode and language rejection, and existing literal URLs left unchanged.
- Deferred optional network loading, retryable verification errors, result source labels, original text preservation and the absence of invented highlighted spans.
- Desktop and phone Playwright scenarios for QAC root search, lemma mode, deep links, browser reload, source inspector navigation and original-text isolation.
- Existing type/lint/format/coverage/source-integrity and production build CI must remain green.

Source rights, manual mobile/desktop assistive-technology acceptance and the `noindex` release gate remain separate pending release checklist items.
