# Contributing to Quran Cross-References

Quran Cross-References is a static Quran reader with verified Arabic and English
datasets and a curated passage-relationship index. Please preserve the source text,
dataset provenance and canonical `surah:ayah` numbering when making changes.

## Requirements

Node.js 24 or later.

```sh
npm ci
npm run check
npm run build
npm run test:e2e
```

`npm run check` runs strict TypeScript checks, type-coverage checks, ESLint,
Prettier and unit tests with coverage thresholds. The browser suite runs
Chromium desktop and phone scenarios against the production build.

To run the local application:

```sh
npm run dev
```

Open `http://localhost:5173/`. To run the Quran importer independently:

```sh
npm run data:quran
```

## Source integrity

The three reviewed input snapshots live in `data/raw/`. Their original
SHA-256 digests, retrieval dates, source URLs and licenses are pinned in
`data/quran/sources.json`.

- Never format or normalize raw Quran data. `data/raw/` is excluded from Prettier.
- Do not re-pin data when a checksum fails. Restore the committed source first,
  investigate every difference and deliberately review any upstream change.
- On Windows, the importer tolerates CRLF checkout **only** when canonical LF
  normalization reproduces the pinned byte sequence exactly.
- Generated files under `data/quran/generated/` and
  `public/quran-only/data/quran/` are not versioned or formatted.

## Implementation structure

- `src/core/quran/`: versification, references, relationship filtering,
  indexed link lookup and graph adapters.
- `src/quran/`: bilingual UI, arc view, threads, navigation and data loading.
- `src/core/lib/`: small generic helpers reusable by later visualizations.
- `scripts/quran/`: validated imports, byte-integrity checks and dataset generation.
- `tests/e2e/quran-reader.spec.ts`: desktop and phone acceptance.
- `vite/quran-site.ts`: deployment base; override with `BASE_PATH=/` for a root domain.

Tests must accompany behavior changes. Preserve meaningful coverage rather
than weakening the gates to hide a regression. If a browser-only interaction
cannot be tested in a DOM test harness, cover it in Playwright.

## Rights and provenance

Retain the original MIT license and attribution for inherited code. Observe
Tanzil's source requirements for the Arabic text. Do not attribute generated
similarities, theological claims, or numerical scores to a source unless the
source actually supplies them. See `data/quran/sources.json` and
`docs/QURAN_PHASES.md` for source and product-readiness details.
