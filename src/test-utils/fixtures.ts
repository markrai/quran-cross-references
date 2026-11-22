import type { SurahNumber } from '../core/quran/surahs.ts';
import type { AyahIndex } from '../core/quran/ayah-ref.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import type {
  CrossReferenceColumns,
  DatasetProvenance,
  TranslationTextFile,
} from '../core/datasets/formats.ts';

export const PROVENANCE: DatasetProvenance = {
  url: 'https://example.org/source',
  sha256: 'a'.repeat(64),
  retrievedAt: '2026-01-01',
  snapshotDate: null,
};

/** Canonical index of a ayah; throws for ayahs that do not exist (a broken test). */
export function verseIndex(surah: SurahNumber, surah: number, ayah: number): AyahIndex {
  const index = CANONICAL_QURAN.indexOf({ surah, surah, ayah });
  if (index === undefined) {
    throw new Error(`No such ayah: ${surah} ${surah}:${ayah}`);
  }
  return index;
}

/** A complete translation file whose ayah texts are overridden where given. */
export function createTranslationFile(
  overrides: ReadonlyMap<AyahIndex, string> = new Map(),
): TranslationTextFile {
  return {
    format: 'translation-text',
    schemaVersion: 1,
    versification: 'kjv',
    provenance: PROVENANCE,
    notices: [],
    translationId: 'bsb',
    license: { name: 'Public domain', url: 'https://berean.bible/terms.htm', publicDomain: true },
    attribution: 'Scripture text: Berean Standard Bible (BSB), dedicated to the public domain.',
    ayahs: Array.from(
      { length: CANONICAL_QURAN.ayahCount },
      (_, index) => overrides.get(index) ?? `Ayah number ${index}.`,
    ),
  };
}

export interface LinkSpec {
  readonly from: AyahIndex;
  readonly to: AyahIndex;
  readonly toEnd?: AyahIndex;
  readonly votes?: number;
}

/** Builds CSR columns from links (in any order) for a versification of `ayahCount` ayahs. */
export function createCrossReferenceColumns(
  links: readonly LinkSpec[],
  ayahCount: number = CANONICAL_QURAN.ayahCount,
): CrossReferenceColumns {
  const sorted = [...links].sort((a, b) => a.from - b.from);
  const offsets = new Array<number>(ayahCount + 1).fill(0);
  for (const link of sorted) {
    offsets[link.from + 1] = (offsets[link.from + 1] ?? 0) + 1;
  }
  for (let ayah = 0; ayah < ayahCount; ayah += 1) {
    offsets[ayah + 1] = (offsets[ayah + 1] ?? 0) + (offsets[ayah] ?? 0);
  }
  return {
    offsets,
    targetStart: sorted.map((link) => link.to),
    targetEnd: sorted.map((link) => link.toEnd ?? link.to),
    votes: sorted.map((link) => link.votes ?? 0),
  };
}
