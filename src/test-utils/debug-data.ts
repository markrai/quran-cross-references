import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import type { AyahIndex } from '../core/quran/ayah-ref.ts';
import { CrossReferenceIndex } from '../cross-references/cross-reference-index.ts';
import type { CrossReferenceDataset } from '../cross-references/load-cross-references.ts';
import type { DebugData } from '../features/debug/debug-data.ts';
import type { DatasetLoadReport } from '../shared/lib/fetch-dataset.ts';
import { getTranslationManifest } from '../translations/registry.ts';
import { Translation } from '../translations/translation.ts';
import { createCrossReferenceColumns, createTranslationFile, PROVENANCE } from './fixtures.ts';
import type { LinkSpec } from './fixtures.ts';

/**
 * The debug page draws one element per unlinked ayah, so a fixture over the whole Bible would
 * build 31,000 of them for every test. These stop after Genesis 2: the code paths are the same,
 * and a test that renders them finishes in milliseconds.
 */
export const FIXTURE_VERSE_COUNT = 40;

export function createLoadReport(path: string): DatasetLoadReport {
  return {
    path,
    url: `https://example.org/${path}`,
    bytes: 1024,
    downloadMs: 1,
    parseMs: 2,
    processMs: 3,
  };
}

/** A cross-reference dataset over the first few dozen ayahs of Genesis. */
export function createCrossReferenceDataset(links: readonly LinkSpec[]): CrossReferenceDataset {
  return {
    manifest: {
      id: 'openbible',
      name: 'OpenBible.info Cross References',
      description: 'Fixture dataset',
      license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
      attribution: 'Cross-reference data: OpenBible.info (CC BY 4.0).',
      homepage: 'https://www.openbible.info/labs/cross-references/',
      versification: 'kjv',
      enabledByDefault: true,
    },
    provenance: PROVENANCE,
    notices: [{ level: 'info', message: 'Rows skipped', count: 2, examples: ['Gen.1.1'] }],
    sourceRowCount: links.length,
    index: new CrossReferenceIndex(
      createCrossReferenceColumns(links, FIXTURE_VERSE_COUNT),
      FIXTURE_VERSE_COUNT,
    ),
  };
}

/**
 * A dataset over the whole Bible, cheap because it leaves no ayah unlinked: the page's one
 * element per unlinked ayah is what makes a full-size fixture expensive, not the links.
 */
export function createWholeBibleDataset(): CrossReferenceDataset {
  const links = Array.from({ length: CANONICAL_QURAN.ayahCount - 1 }, (_, ayah) => ({
    from: ayah,
    to: ayah + 1,
    votes: ayah % 50,
  }));
  return {
    ...createCrossReferenceDataset([]),
    sourceRowCount: links.length,
    index: new CrossReferenceIndex(
      createCrossReferenceColumns(links),
      CANONICAL_QURAN.ayahCount,
    ),
  };
}

/** Everything the debug dashboard loads, small enough to render in a test. */
export function createDebugData(
  links: readonly LinkSpec[] = [],
  ayahs: ReadonlyMap<AyahIndex, string> = new Map(),
  dataset: CrossReferenceDataset = createCrossReferenceDataset(links),
): DebugData {
  return {
    translation: {
      translation: new Translation(
        getTranslationManifest('bsb'),
        CANONICAL_QURAN,
        createTranslationFile(ayahs),
      ),
      report: createLoadReport('translations/bsb.json'),
    },
    crossReferences: [{ dataset, report: createLoadReport('cross-references/openbible.json') }],
  };
}
