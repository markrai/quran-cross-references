# Phase 2B.1: Curated relationship evidence contract

Phase 2B.1 adds an **evidence layer**, without reclassifying the interpretation
or meaning of any passage. The original `data/quran/relationships.json`
continues using `quran-similar-passages`, schema version 1, with the exact
same sorted 2,445 curated links, numeric indices, direction and source ranges.

## New generated dataset

`data/quran/evidence.json` uses the following versioned shape:

```json
{
  "format": "quran-relationship-evidence",
  "schemaVersion": 1,
  "versification": "hafs-kufan-6236",
  "sources": [
    {
      "id": "mutashabihat",
      "fileName": "mutashabiha_data.json",
      "url": "https://raw.githubusercontent.com/Waqar144/Quran_Mutashabihat_Data/5d147d0a68f55d16af2c9d6f2cbf8ee01790511c/mutashabiha_data.json",
      "sha256": "785d5efa266a19c405a449b0a01ebf34fe7dc09836d5b6ef301eae874db780f0",
      "license": "CC0 1.0 Universal",
      "attribution": "Quran Mutashabihat Data, Waqar144, drawing on Qari Idrees Al Asim; https://github.com/Waqar144/Quran_Mutashabihat_Data",
      "retrievedAt": "2026-11-01"
    }
  ],
  "relationships": [
    {
      "stableId": "curated:mutashabihat:7-8:261-261",
      "legacyId": 0,
      "type": "curated-similar-passage",
      "origin": "curated",
      "evidence": [{ "kind": "curated-reference", "sourceId": "mutashabihat" }]
    }
  ]
}
```

The example above illustrates the fields and is **not** a claim about which
relationship has legacy ID 0 in the full pinned corpus.

Every generated relationship has exactly one evidence assertion. The source
assertion identifies the **source collection**, not a specific document row or
scholarly verdict: the legacy importer does not retain upstream row locations.
No confidence scores, morphology, shared roots or inferred theology are added.

`legacyId` is the existing zero-based numeric index and remains the basis of
current `?link=N` links. The new `stableId` derives from the provenance source
ID and the two _directed, inclusive, zero-based Quran ayah ranges_, not the
array position. It therefore survives reordering of the source link array.
It is not a verse-reference string or a textual hash. The source ID namespace
must remain unique if later imports add distinct corpora.

## Validation and backward compatibility

`createCuratedRelationshipEvidence(index, source)` emits the deterministic
sidecar from the **already validated** `QuranRelationshipIndex`.
`QuranRelationshipEvidenceIndex(dataset, index, pinnedSource)` rejects:

- Unexpected schema, version, or versification identifiers
- Missing, duplicated or reordered legacy IDs
- Forged endpoint-stable IDs or mismatches with the indexed source/target ranges
- Unrecognized classifications or evidence origins
- Missing or mismatched source registry fields, including the pinned SHA-256,
  attribution, license and retrieval date
- An incomplete, orphaned or extra evidence record

Its `byLegacyId`, `byStableId` and `forLink` methods provide explicit
adapters for both URL and future graph usage. This phase does **not** change the
Quran reader's runtime fetch count or introduce an unreviewed data dependency.
The reader and graph retain the existing v1 numeric reference route and
continue to function independently of the new sidecar.

The source pin is checked during import using existing SHA-256 checks in
`data/quran/sources.json`. The evidence sidecar is built only from that
verified input, included in the release manifest's output hashes and cached by
the PWA. Its source metadata is compared byte-for-byte by field to the
independently loaded pinned-source record.

## Raw source ignore policy

`data/raw/*` ignores downloaded or stale raw source archives by default,
including legacy Bible translation ZIPs and STEP Bible TSV/TXT files. Only
these three deliberately tracked Quran snapshots are explicitly unignored:

- `quran-uthmani-1.1.txt`
- `en.pickthall.txt`
- `mutashabiha_data.json`

None is deleted or changed. To add a **new** source in a later phase, explicitly
allowlist its filename, add LF rules where relevant, pin its digest and rights
in `data/quran/sources.json`, and add importer/validation tests. Do not
unignore entire archive formats or `data/raw/` broadly.

## Acceptance

```powershell
npm run check
npm run data:quran
npm run build
npm run test:e2e
git status --short
```

Both Linux and Windows CI must verify the raw-source allowlist, the evidence
contract, the 2,445-link integration test, published `evidence.json` and
existing desktop/phone offline behavior. The original pinned Arabic and
English ayah content is unmodified.

**Out of scope:** expression matching (2B.2), graph type filters (2B.3),
and morphological/lemma annotations (2B.4). Those require their own
provenance model and validated source datasets.
