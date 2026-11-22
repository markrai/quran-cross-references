# Phase 2B.4: Original Quranic Arabic Corpus morphology

## Primary source and engineering decision

This phase uses the **Quranic Arabic Corpus morphological analysis, version 0.4** (Kais Dukes, 2011) as the primary morphology authority for Quran Cross-References. QAC contains 128,219 distinct morphological segments, 77,429 source words, and 77,915 STEM annotations across the canonical 6,236 ayahs. Unlike a simple one-lemma-per-word mapping, it retains prefixes, stems, suffixes, part-of-speech tags, roots, lemmas, and grammatical inflection features. Some words contain multiple STEM annotations, while other words have no assigned lemma or root. Those distinctions are intentionally preserved.

MAQAM (2026) is a useful independently produced annotation corpus and a potential future cross-check, but **QAC's segment-oriented records** are the stronger primary data structure for this project's current word-level exploratory interactions and grammar inspector. This is a task-specific engineering choice, not a claim of universal linguistic superiority.

The raw QAC file is fetched from an immutable GitHub mirror at `taziksh/quran-frequencies` commit `079cdc74cd494ec1b35011363288d80cae047c51`, as a verbatim UTF-8 original and checksum-checked against SHA-256 `a1d12923815341face765083805d2148ed2d9f5cc3f7d6665219d887675d8c46`. The URL, attribution, origin, and hash are pinned in `data/quran/sources.json`. The download is stored only in the ignored `data/raw/` cache and never silently modified or replaced with a changed upstream snapshot.

## Published data contract

`npm run data:quran` fetches and verifies the original morphology source, checks its header, imports every annotation in verse/word/segment order, and publishes `data/quran/morphology.json` with the existing Quran data release. The publication manifest pins the output SHA-256 independently of the source checksum.

The published `quran-qac-morphology` v1 format stores all QAC segments for each canonical ayah and word as source tuples of `[FORM, TAG, FEATURES]`. This preserves original Buckwalter forms and ordered feature fields while avoiding the inefficiency of duplicating JSON property names across 128,219 segments. No QAC features or extra STEM annotations are dropped. The full original copyright notice, including QAC and Tanzil 1.0.2 conditions, is retained in the artifact alongside the main reader's Tanzil 1.1 attribution.

The browser verifies the SHA-256 of the transferred artifact against `manifest.json`, checks source pin metadata, preserves the separately classified evidence type, validates every word and segment, and rebuilds the lemma/root inverted index locally. Word positions are canonical _within QAC_, and verse references align to the existing 6,236-ayah versification. The app **does not assert exact surface-word alignment between QAC's Tanzil 1.0.2 edition and the reader's Tanzil 1.1 edition**.

## User experience

The existing Arcs and Threads & Reader pages offer a third explicit evidence choice: **QAC annotated lemmas, roots and grammar**. Selecting it lazily downloads the larger morphology sidecar. It is _not_ part of the offline PWA installation cache, so the standard Quran reader remains compact. The sidecar stays cached in memory after a verified load during that page session.

The explorer provides:

- Selectable Arabic words at the currently focused verse with independently sourced QAC POS tags and lemma/root annotations.
- A per-word segment inspector exposing original prefixes, stems, suffixes, TAG, and morphological features without inventing analyses.
- Explicit lemma or root grouping, with exact Arabic/Buckwalter lookup.
- An inverted source index of actual morphological word positions, displayed in pages of 24 clickable locations.
- Shareable, mutually exclusive deep links, such as `?ref=1%3A1&evidence=morphology&morph=root&term=rHm&word=3`. Navigating an occurrence preserves the search term and opens the verified canonical ayah plus the original QAC word position.
- Reader context through the existing bilingual ayah and Threads UI, without mixing curated relationship arcs or computed exact-phrase evidence into the morphology result.

A root represents a derivational family, _not_ a statement that all its lemmas have the same meaning. A lemma represents an annotation editor's lexical grouping, _not_ an automatically inferred paraphrase. Any missing root/lemma remains absent.

## Validation

Run `npm ci`, `npm run data:qac:fetch`, `npm run check`, `npm run data:quran`, `npm run build`, and `npm run test:e2e:ci`. Verify Linux and Windows source downloads, byte-identical regeneration, complete canonical ordering, 77,429 words, 128,219 segments, 77,915 STEMs, source attribution, strict selected-word and annotation URLs, lazy load, phonetic-to-Arabic word rendering, 24-result paging, original root feature transparency, and browser back/forward navigation.

The Quran's Arabic text remains unmodified. The original site's noindex, digital edition provenance, real-device and accessibility release gates remain in force.

## Original source credit

Quranic Arabic Corpus morphology v0.4, © 2011 **Kais Dukes**, https://corpus.quran.com; original unmodified corpus notice in `data/raw/quranic-corpus-morphology-0.4.txt` and published derivative artifact. Original QAC file terms refer to GNU GPL and require source identification and unchanged copyright blocks. The underlying historical Quran text references Tanzil Uthmani v1.0.2. The separately displayed reader Arabic is attributed to Tanzil Uthmani v1.1.
