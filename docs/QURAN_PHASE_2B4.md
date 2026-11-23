# Phase 2B.4: Morphology evidence integration

## 2B.4A: audited intake (this PR)

**Scope:** Independent linguistic annotation of Arabic words, not a replacement for our pinned Tanzil text, and not curated theological relationships. The initial PR deliberately stays research-only.

The primary candidate is Kais Dukes' Quranic Arabic Corpus morphological annotation version 0.4. The maintainers' [download page](https://corpus.quran.com/download/default.jsp) requests contact information and states GNU General Public License plus exact-copy and attribution conditions. The corpus includes annotated word segments, lemmas and roots. The full raw corpus **must not be silently republished** as an MIT-licensed project dataset. The existing project LICENSE applies to our code; the annotation's separate licensing and derived-data obligations require review before distributing morphology artifacts.

A second candidate is SinaLab/Birzeit University's QuranMorph, which uses 77,429 word-level records with independently curated lemmas/POS and has been distributed under CC BY 4.0. Its specific downloaded edition, original license file, availability, field mapping, and root coverage should be independently verified before committing to it. Sources are not interchangeable.

## Reproducible source identity

The auditor is intentionally offline. Obtain Quranic Arabic Corpus v0.4 from the authorized upstream download flow. Preserve the source file and its complete rights notice **verbatim**, save it locally as `data/raw/quranic-corpus-morphology-0.4.txt`, then execute:

```bash
npm ci
npm run data:morphology:audit
```

The code pins the Git blob `b91cec6e95d5e0306550b4aedacc7380dc71152a` at public audit mirror `q-ran/quran`, commit `bb97fe4b03e5a923aab0491f3d917c3c5f94f1fc`, path `sources/1.0/quranic-corpus-morphology-0.4.txt` (6,309,503 bytes). It verifies Git's blob hash over the exact bytes, **not just** the path, and additionally reports a SHA-256 of the source. The original rights source remains [corpus.quran.com](https://corpus.quran.com/download/default.jsp).

The report is written only to gitignored `data/quran/generated/morphology-audit.json`, and explicitly carries `status: blocked-pending-license-and-alignment-review`. It is never added to the public build, the PWA, the manifest, or the reader.

## Alignment and evidence requirements

QAC positions use chapter:verse:word:segment with attached prefix and suffix segments, whereas Phase 2B.2's Tanzil token policy is whitespace-verbatim. The source has approximately 77,429 morphological words; our current whitespace corpus has 82,459 tokens. This discrepancy makes a direct shared word index incorrect.

The initial audit confirms canonical references and detects verses where the word counts agree or disagree. **Matching counts do not establish word-to-word equivalence**, and this report makes no such claim. There is no morphology-derived lookup on the public site.

Before a public 2B.4B evidence mode can ship, require all of:

- A confirmed data reuse and derivative-distribution license decision with separate attribution/notice handling.
- Verified complete source provenance and unchanged Quran text, with no unverified source downloads at runtime.
- A deterministic per-ayah sequence alignment based on verified normalized Arabic token surfaces and original segment boundaries, including explicit coverage and rejected/ambiguous cases; never silently shift word positions.
- Clear **lemma** versus **root** labels, with unknown or ambiguous values retained, not guessed. A root is a morphological family, not a synonym, topic or theological interpretation.
- No synthetic all-to-all edges, a bounded occurrence browser, original ayah backlinks, historical URL isolation, and strict test/CI validation across browser and mobile.

## Testing

The initial unit tests exercise full notice requirements, malformed rows, out-of-bounds verses, word/segment ordering, missing STEM and multiple STEM/lemma/root behavior. Whole-corpus audit is intentionally a researcher-run gate until the licensed source has been reviewed and aligned. Existing PWA contents and 2B.1–2C.2 behavior are unaffected.
