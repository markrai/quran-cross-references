# Phase 2E.1: Unified per-ayah evidence inspector

## Purpose and research boundaries

The Quran reader previously exposed five independent evidence systems in separate parts of the application. This phase brings them together under **each selected ayah** without combining their relationship semantics or asserting agreement.

| Evidence source | Original provenance                                              | Inspector measure                                                                            | Drilldown                                  |
| --------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Curated         | Mutashabihat source relationship index (2,445 directed link IDs) | Distinct source IDs incident on the ayah, with incoming/outgoing incidences shown separately | Original source relationship in Arcs       |
| Exact           | Deterministic repeated 3–8-word Tanzil Uthmani v1.1 sequences    | Unique expressions covering the ayah                                                         | Exact phrase source spans                  |
| Morphology      | QAC v0.4 word/segment annotation                                 | Historical QAC word positions at this canonical ayah                                         | Original QAC word, lemma, root and grammar |
| Themes          | QSAC v1.0, LLM-assisted and human reviewed                       | Source-assigned topic tags at this ayah                                                      | Full QSAC topic explorer                   |
| Emotions        | ELQV independent 2025 research sample                            | Labels recorded at this ayah, if it was included in the 2,087-ayah sample                    | Original ELQV emotion explorer             |

Original source notices and pinned hashes remain as in `data/quran/sources.json`. Phase 2E.1 does **not** introduce or copy another source corpus, text edition or generated semantic relationship. Existing curated link IDs and external ontology labels remain stable.

Every source has a different evidence basis. A repeated exact phrase is **not** itself an annotated shared meaning; related morphological roots do **not** establish a curated relationship. QSAC topic overlap is not tafsir, and ELQV emotional labels are not theological claims about an ayah. The inspector presents each source's own records, not a synthesized ranking.

## Interaction and data loading

The inspector is a single collapsed panel beneath the original selected ayah in **Arcs** and **Threads & Reader**. It starts with only the already-loaded curated source available, and shows no optional data until explicitly selected.

Users can open the curated, exact, morphology, QSAC or ELQV section individually. Selecting a section loads only the corresponding separately verified sidecar through the existing loader. **Check all five sources** opts into checking the four optional datasets. Once verified, each index is cached for the session and reused as the focus ayah changes.

The coverage summary states **X of Y checked sources have evidence at this ayah**. Y counts successfully verified datasets, not attempted or unavailable sources. X counts sources with at least one source-defined record, not the number of links, matches, tags or mutually agreeing annotators. Other sources remain explicitly **Not checked**, **Checking source**, or **Verification failed**. Once verified, sources can report a recorded zero without implying the ayah lacks that form of meaning.

ELQV's missing record is specially labeled **Not covered by the ELQV sample**, not "no emotion", neutral, or an unobserved negative. The original four multi-label ELQV disagreements stay visible. All evidence lists are bounded, and clickable entries open the original evidence modes for further investigation.

QAC word positions are historical source positions: the importer explicitly does **not** certify word-for-word alignment against separately displayed Tanzil v1.1 Arabic. The inspector does not overlay QAC morphological highlights on that text.

## Stable routes, accessibility and release

The shareable state uses `inspect=curated|exact|morphology|themes|emotions|all` on existing Arcs and Threads reader routes. Invalid values are ignored; other top-level views do not interpret or serialize the `inspect` parameter. Following Next/Previous ayah, searching references or browsing Threads preserves the selected inspector section so the evidence updates to the new canonical ayah. Browser back, forward and reload restore the inspected source.

The toggle exposes `aria-expanded` and `aria-controls`; source choices expose `aria-pressed`. Source panels have separate accessible headings and labels, keyboard-operable buttons, and compact layouts for mobile screens. The application continues to use plain React DOM and CSS with no new dependencies, tracking or backend.

No change to the PWA precache: curated relationships and the existing Quran text remain offline, while expressions, morphology, QSAC and ELQV are optional network-loaded evidence and need not be available offline. Their failures are isolated and recoverable. No change is made to the project's current `noindex`, real-device, accessibility, or source-rights release gates.

## Acceptance

1. Fresh reader load must not request any of the four optional datasets solely because the inspector component exists.
2. Opening a single section requests only the corresponding optional dataset and honors its existing published SHA-256/source integrity checks; opening all explicitly loads all four.
3. Curated, exact, morphology, thematic and emotional evidence remain separately labeled with correct counts, original IDs, direct source navigation and no inferred pairwise links.
4. Verified absent vs unverified vs failed vs ELQV not sampled are visible as distinct states.
5. Shareable `inspect` URLs restore on desktop and phone, persist through Next/Previous ayah and browser history, and are ignored on nonreader views.
6. Unit tests and full Linux/Windows desktop+phone Playwright runs pass; the original Quran text and source manifest remain unchanged.

The project is personal research/hobby software, not a commercial semantic or theological interpretation engine.
