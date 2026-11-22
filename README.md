# Quran Cross-References

Explore curated connections between Quranic passages with bilingual Arabic and English reading, whole-Quran arcs, and per-ayah threads.

The application covers 114 surahs and 6,236 ayahs using pinned Tanzil Uthmani Arabic and Pickthall English text. Its initial relationship corpus contains 2,445 curated textual-similarity links from the Waqar144 Mutashabihat dataset. These links are not exhaustive and do not imply a scholarly relevance ranking or an interpretation.

## Run locally

Requires Node.js 24 or later.

```powershell
npm ci
npm run dev
```

Open **http://localhost:5173/**. The normal development command builds only Quran datasets and launches the Quran reader.

For a standalone data rebuild:

```powershell
npm run data:quran
```

## Build and test

```powershell
npm run check
npm run build
npx playwright test tests/e2e/quran-reader.spec.ts --project=desktop --project=phone
```

The build publishes `index.html`, a compatibility page at `quran/index.html`, and only the Quran datasets under `data/quran/`. Existing `/quran/?ref=2%3A255` links continue to open the same ayah; new navigations use `/?ref=2%3A255`.

The default production base path is `/quran-cross-references/`. Set `BASE_PATH=/` to build for a domain root.

The previous Bible implementation remains in the repository temporarily for the Phase 1D.2 cleanup, but it is no longer part of the application bundle or the default development/build process. Its UI and offline browser tests are retained as historical tests and are not part of the Quran release gate. Quran PWA/offline features, full metadata and accessibility acceptance are scheduled for Phase 1D.3; both entry pages remain `noindex` in the meantime.

## Data provenance

The exact source URLs, attribution, rights notes, retrieval dates and SHA-256 pins live in [data/quran/sources.json](data/quran/sources.json).

- Arabic: [Tanzil Uthmani v1.1](https://tanzil.net/docs/Text_License), reproduced without changing the sacred text.
- English: Marmaduke Pickthall (1930), Tanzil digital text.
- Similar-passage relationships: [Waqar144 Quran Mutashabihat Data](https://github.com/Waqar144/Quran_Mutashabihat_Data), CC0.

The Quran implementation was adapted from the open-source Bible Cross-References project by [Oleksii Trekhleb](https://github.com/trekhleb/bible-cross-references). The original code is retained under its existing MIT license.

See [docs/QURAN_PHASES.md](docs/QURAN_PHASES.md) for the migration roadmap and outstanding work.
