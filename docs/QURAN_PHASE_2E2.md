# Phase 2E.2: QSAC topic-to-language pattern discovery

## Research purpose

The Quran research reader has independently pinned QSAC v1.0 thematic labels (338 concepts over 6,236 canonical ayahs), Quranic Arabic Corpus v0.4 linguistic roots/lemmas, and computed exact Arabic phrase repetitions from the separately attributed Tanzil v1.1 text. This phase provides a reproducible descriptive lens relating those datasets **by their already validated canonical ayah index**, not by asserting any additional semantic or theological link.

In the **Themes** tab, select an experimental topic and click **Analyze Arabic patterns within this topic**. Switch between original annotated QAC **roots**, QAC **lemmas**, or original computed **3–8-word exact Arabic expressions**. There is no new tab in the main app and no newly published source corpus.

## Exact measures

For a selected QSAC topic T and linguistic feature F, the analysis partitions the **6,236 ayahs** into two *disjoint* and exhaustive groups:

- **Tagged group:** original QSAC postings for T, size N(T).
- **Untagged group:** the complement of those postings, size 6,236 − N(T).

A feature is **present** in an ayah when at least one original QAC annotated token has that exact root or lemma, or at least one published exact expression occurrence has that original expression ID in that ayah. Duplicate tokens, repetitions and spans within the same ayah count once, not several times.

The interface reports raw counts a = tagged ayahs with feature and b = untagged ayahs with feature; tagged rate a/N(T); untagged rate b/(6,236 − N(T)); and signed difference **100 × (tagged rate − untagged rate) percentage points**. The denominator is **ayah count**, never word count, occurrences, annotated rows or selected result count.

Positive differences are listed separately from negative differences. To avoid displaying one-off noise as leading discoveries, positive-difference listings require at least **2 tagged ayahs and 3 ayahs overall**; negative-difference listings require at least **12 untagged ayahs**. These are *visibility* thresholds, not statistical tests, quality grades or validity guarantees. All source features remain in the in-memory report, so an explicit feature deep link can retain its underlying evidence when it does not meet a default list threshold. Values are deterministically sorted by rate difference and stable original feature ID tie-breaking.

**No statistical significance claim, enrichment p-value, multiple-testing claim, causal inference, semantic similarity model, tafsir inference or automatic edge generation is performed.** QSAC tags were developed with LLM assistance and human review, not authoritative exegesis; nonmembership does not imply a theme is absent. Small topic groups, variable verse lengths, uneven surah sizes, Arabic polysemy and source-selection biases limit interpretation.

## Surah and original evidence inspection

For each selected linguistic feature, surah rows show:

- Number of ayahs in the surah and how many carry the selected QSAC tag.
- Number of tagged ayahs within that surah containing the feature (both).
- Number of untagged ayahs within that surah containing the feature (feature-outside).
- Both surah-specific denominators. No within-surah odds ratios or significance are implied.

Readers can filter evidence to one surah, switch between tagged and untagged feature occurrences, paginate bilingual verse texts, and drill down into the existing **QAC** or **exact phrase** original evidence explorer. There is no assumption that historical QAC segment positions align word-for-word with the displayed separately sourced Arabic edition.

## Implementation and runtime boundaries

Core computation: `src/core/quran/theme-language.ts`, pure and side-effect free given the validated indices. It creates one ayah-presence posting per linguistic feature and produces source-classified counts. The UI uses `src/quran/QuranThemeLanguage.tsx` and existing React/TypeScript/CSS, with no new dependencies.

Lazy loading is triggered only by the user entering the analysis or a valid direct link. Existing canonical SHA-256/source-pin checks for QSAC, QAC and exact phrases remain intact. Original QSAC topics load as before when visiting Themes, while QAC and exact Arabic phrases are not requested until selected for the analysis or another existing feature. Indexes are cached in the current session and reused. Failed verification is isolated and can be retried.

Deep links use `view=themes&theme=<QSAC topic>&analysis=language&pattern=root|lemma|exact&feature=<original ID>`. The optional `pattern` defaults to `root`; invalid feature strings, excessive lengths or foreign-view arguments are discarded. Existing Quran navigation and browser history remain intact.

The new analysis does not modify any canonical ayah, curated relationship, source citation, manifest, PWA precache, indexing/robots gate or external translation licensing terms. Real-device accessibility, offline installation and digital-edition rights remain manual release checks.

## Acceptance

1. Pure tests demonstrate exact per-ayah feature deduplication for QAC and repeated phrase spans; tagged/unlabeled partitions sum to the canonical 6,236 ayahs and per-surah totals reconcile.
2. Different root/lemma grouping and QSAC independent source classifications remain stable, and invalid topic postings fail instead of silently producing misleading rates.
3. Entering Themes alone requests no optional QAC/phrase data; opening root/lemma requests only QAC, opening exact requests only expressions, and in-session switching reuses verified caches.
4. Selected topic, original linguistic feature and source mode round-trip by URL, reload and browser history.
5. Source feature, surah breakdown, original bilingual verse and original QAC/exact phrase drilldowns remain responsive on desktop and phone.
6. Production build, pinned data integrity and strict Linux/Windows CI, unit coverage, and browser checks pass.

This feature is exploratory personal research software, not a theological interpretation, linguistic alignment, or claim of scholarly significance.
