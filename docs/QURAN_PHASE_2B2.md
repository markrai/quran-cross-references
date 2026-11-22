# Phase 2B.2: Deterministic exact Arabic expressions

This phase detects verbatim repeated word sequences in the pinned, unmodified
Tanzil Uthmani Arabic corpus. Results are **computed textual evidence**, not
curated references, proof of shared meaning, word-root annotation or
theological interpretation.

## Evidence source and tokenization

The pinned `tanzil-uthmani` source is SHA-256 verified before scanning.
The underlying Arabic text is never normalized, stripped of diacritics,
altered, or replaced by a transliteration. `arabic-tokens.ts` uses Unicode
non-whitespace spans as exact tokens. Offsets are UTF-16 character offsets
inside each original ayah, and word indices are zero-based. The token policy
is versioned as `tanzil-uthmani-whitespace-verbatim-v1`.

The detector scans **within** each of the 6,236 canonical ayahs, never
across an ayah boundary. The initial policy uses **3–8 contiguous tokens**.
An expression must occur in at least **two distinct ayahs**. An ayah may also
contain several occurrences, and those positions remain separate evidence.

Diacritic changes, Arabic letter differences, tatweel, punctuation and other
codepoint differences are significant: this is exact orthographic matching.
This version intentionally has no root, lemma, partial-diacritic or semantic
matching mode.

## Detection and reduction

`expression-index.ts` enumerates complete in-ayah candidate windows of
lengths 3 through 8, records occurrence positions, then retains only
expressions with evidence in multiple ayahs. For each shorter sequence, the
reduction removes it **only when** a longer repeated sequence accounts for
every identical occurrence at the appropriate offset. A shorter sequence
that also occurs independently remains in the result.

There is no frequency cap, first-N truncation, per-surah sampling, or
pairwise edge multiplication. Very frequent expressions are stored once
with an ordered list of occurrences, not as O(n²) relationships.
The eight-token maximum is a declared detector policy, not a silent
output cap. Matches longer than eight tokens may be represented by multiple
eight-token maximal windows.

Deterministic record order is by first evidence location (ayah index, word
index), longest expression first for ties. IDs are computed from SHA-256
of the versioned token policy and the JSON-encoded exact token sequence.
IDs do not depend on discovery order.

## Independent evidence schema

`data/quran/generated/expressions.json` is version 1 of
`quran-exact-expressions`. Each record is shaped like:

```json
{
  "id": "exact:v1:<sha256-of-versioned-exact-tokens>",
  "kind": "exact-repeated-expression",
  "origin": "computed",
  "words": ["<verbatim-word-1>", "<verbatim-word-2>", "<verbatim-word-3>"],
  "occurrences": [
    { "ayah": 0, "start": 0, "end": 3 },
    { "ayah": 1, "start": 4, "end": 7 }
  ]
}
```

This example demonstrates **schema shape only** and does not claim that
such a match occurs at those ayahs. Occurrence `end` is exclusive.
The complete dataset includes the pinned source registry entry,
SHA-256, license/attribution/retrieval metadata, versification,
tokenization policy, length policy and corpus statistics.

`validateExactExpressionEvidence()` verifies the pin's metadata,
recomputes each stable ID, checks every ayah and word boundary against
the original source text, rejects mismatched words, missing or reordered
occurrences, malformed statistics, and any evidence not occurring in at
least two distinct ayahs.

The existing `data/quran/evidence.json` and its strict
`curated-similar-passage` records remain **unchanged**. No expression is
assigned an existing numeric `link=N` URL or injected into the curated
graph. A later phase can project these groups into a separate
classification-aware graph layer.

## Profile, footprint and publication

Run:

```powershell
npm run data:expressions
npm run bench:expressions
```

The runner reports input ayah/token counts, candidate windows, repeated
expressions before reduction, redundant expressions removed, retained
expressions/occurrences, and the highest frequency. It writes:

- `data/quran/generated/expressions.json`: deterministic, complete
  expression evidence
- `data/quran/generated/expression-profile.json`: output byte length,
  SHA-256, measured runtime, heap delta and detection statistics

The generator fails if its output exceeds **64 MiB**; it never silently
drops candidate evidence to meet the budget. The 64 MiB limit is a safety
ceiling for this _internal_ first-stage audit, not permission to ship
64 MiB into an offline PWA. Tune corpus policies only after reviewing
the actual reported distribution and examples.

The expression dataset is intentionally **not published** to
`public/quran-only/`, `dist/` or the service-worker precache. No network
request is added to the reader. The baseline build still publishes only
the original bilingual Quran and the 2,445 curated relationships.

## CI acceptance

CI on Ubuntu and Windows independently reads the pinned inputs and
generates expression evidence. The Linux check regenerates twice and
compares SHA-256 hashes for byte identity. The profile is retained as an
Actions artifact. Unit and full-corpus integration tests cover
token Unicode identity, source positions, duplicate occurrences,
distinct-ayah enforcement, maximal reduction, shorter independent
occurrences, 3–8-word bounds, valid provenance, and tamper rejection.
The build job fails if an experimental expressions dataset leaks into the
deployed PWA.

```powershell
npm ci
npm run check
npm run data:quran
npm run data:expressions
npm run build
npm run test:e2e
```

The existing strict coverage targets (98% statements/lines/functions,
88% branches), Windows source integrity, and desktop/phone Chromium gates
remain mandatory.

## Future work

**2B.3**: Review corpus profile/size, design fast per-ayah expression
lookups, choose whether and how to publish a bounded projection, and
introduce clear type filters without treating computed matches as curated
connections.

**2B.4**: Consider separately licensed, verified morphology/lemma
sources for _new_ evidence classes. Exact word matching cannot provide
roots or semantic identity.
