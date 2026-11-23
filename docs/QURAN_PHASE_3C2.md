# Phase 3C.2: QAC root and lemma frequency analytics

## Reader integration

Frequency analytics lives within the existing **Arabic morphology** evidence view (`evidence=morphology`), not a seventh primary tab or a separate publication. It reuses the SHA-256-validated, GPL-attributed **Quranic Arabic Corpus v0.4** annotation index introduced in Phase 2B.4 and searched in Phase 3C.1. It remains unavailable until that optional corpus has been loaded and verified, and does not make a network request from the literal text reader.

The frequency explorer provides:

- A ranked list of annotated **root** or **lemma** families, with exact Arabic renderings and original Buckwalter keys.
- Distinct QAC word positions per family, distinct ayahs and represented surahs, with deterministic descending-count/Buckwalter tie ordering.
- Potential cumulative source-word coverage for the top **10, 25, 50, 100 or 250** ranked families, with percent against all **77,429 QAC source words**, including words with no annotation of that grouping.
- A milestone series for the same family thresholds and an explorable, descending-count surah distribution for the selected family. Surah rows identify distinct word and ayah counts and open the first actual annotated occurrence.
- Selection links through the existing `evidence=morphology&morph=root|lemma&term=...` URL state, retaining browser history and the existing word-position inspector.

## Counting contract

The source of truth is the existing QAC `QacMorphologyIndex` word-position registry. A unique source word has a **canonical zero-based ayah index and zero-based QAC word index**. The token key is that pair. Counts are not derived from textual substring matching, Arabic morphology guesses, or Tanzil v1.1 word-boundary assumptions.

A word may contain multiple annotated stems, share a root with a word carrying another lemma, or have no root or lemma. Each distinct source word position is counted at most once **within a family**, and cumulative top-N coverage counts that position at most once **across all N families**. Therefore the sum of family frequencies is not used for vocabulary coverage and the maximum root or lemma coverage need not reach 100%. Root-family and lemma-family rankings are never combined into one metric.

Cumulative coverage describes **potential encounters with QAC source word positions**, not distinct meanings, character-level Tanzil highlight coverage, a learning score, proficiency, memorization, or evidence that a student understands the Arabic. No user profile, learning-progress tracking, telemetry, server endpoint, translation, new dataset, or storage is introduced.

The denominator is the reviewed QAC **77,429 source words**, not all morphological segments (**128,219**) or stems (**77,915**), and not the separate Tanzil v1.1 tokenization. Individual family frequencies count words and not number of stem segments.

## Runtime and accessibility

The analytics report is derived in memory only after optional corpus validation. Switching root/lemma families reuses the same verified index. No extra asset is precached during application installation; Phase 3C.1's verified post-fetch optional runtime-cache behavior remains unchanged.

All ranking and distribution selections are native keyboard-accessible buttons with explicit labels. The coverage selector, progress meter, numeric milestones and word/ayah counts remain understandable without interpreting the visual bars. The panel collapses to one column on smaller screens. The QAC attribution and original text license boundaries remain in force.

## Acceptance

Unit tests verify descending frequency ordering, deterministic tie-breaks, duplicated QAC positions, overlapping families, top-N thresholds, grouping isolation, canonical surah distribution, empty indexes and invalid positions. App tests verify use of the already-loaded morphology index and URL-driven selection. Windows/Linux desktop and phone browser acceptance verifies actual pinned source counts, rank selection and reload, distribution navigation, responsive layout, and root/lemma distinction.

Existing Quran source integrity, build, type coverage, unit coverage, `noindex`, license and real-device release gates remain unchanged.
