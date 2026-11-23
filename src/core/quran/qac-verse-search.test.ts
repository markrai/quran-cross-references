import { describe, expect, it } from 'vitest';
import type { QacMorphologyIndex } from './qac-index.ts';
import type { QacGrouping, QacOccurrence } from './qac-types.ts';
import { searchQacVerses } from './qac-verse-search.ts';

const occurrences: readonly QacOccurrence[] = [
  { ayah: 7, word: 2, form: 'الرَّحْمَٰنِ', pos: 'ADJ' },
  { ayah: 0, word: 3, form: 'الرَّحِيمِ', pos: 'ADJ' },
  { ayah: 0, word: 2, form: 'الرَّحْمَٰنِ', pos: 'ADJ' },
  { ayah: 5, word: 1, form: 'الرَّحْمَٰنِ', pos: 'ADJ' },
];

const index: Pick<QacMorphologyIndex, 'resolve' | 'occurrences'> = {
  resolve(grouping: QacGrouping, query: string) {
    if (grouping === 'root' && (query === 'rHm' || query === 'رحم')) return 'rHm';
    if (grouping === 'lemma' && (query === 'raHmAn' || query === 'رحمن')) return 'raHmAn';
    return null;
  },
  occurrences(grouping: QacGrouping, term: string) {
    return grouping === 'root' && term === 'rHm'
      ? occurrences
      : grouping === 'lemma' && term === 'raHmAn'
        ? occurrences.slice(0, 2)
        : [];
  },
};

describe('Phase 3C.1 Quranic Arabic Corpus verse discovery', () => {
  it('groups exact annotations into canonical ayahs and stable one-based word positions', () => {
    const found = searchQacVerses(index, 'root', 'rHm', null);
    expect(found.term).toBe('rHm');
    expect(found.hits.map((hit) => hit.ayahIndex)).toEqual([0, 5, 7]);
    expect(found.hits[0]?.annotations.map((word) => word.word + 1)).toEqual([3, 4]);
    expect(found.hits[0]?.spans).toEqual([]);
    expect(found.hits[0]?.annotations.map((word) => word.form)).toEqual([
      'الرَّحْمَٰنِ',
      'الرَّحِيمِ',
    ]);
  });

  it('resolves Arabic and Buckwalter through the existing QAC resolver', () => {
    expect(searchQacVerses(index, 'root', 'رحم', null)).toEqual(
      searchQacVerses(index, 'root', 'rHm', null),
    );
    expect(searchQacVerses(index, 'lemma', 'رحمن', null)).toEqual(
      searchQacVerses(index, 'lemma', 'raHmAn', null),
    );
    expect(searchQacVerses(index, 'lemma', 'rHm', null)).toEqual({ term: null, hits: [] });
  });

  it('filters canonical surah ranges without using QAC word count as an ayah index', () => {
    const surah1 = searchQacVerses(index, 'root', 'rHm', 1);
    expect(surah1.hits.map((hit) => hit.ayahIndex)).toEqual([0, 5]);
    expect(searchQacVerses(index, 'root', 'rHm', 2).hits.map((hit) => hit.ayahIndex)).toEqual([7]);
    expect(searchQacVerses(index, 'root', 'rHm', 114).hits).toEqual([]);
  });

  it('fails closed on unknown or unbounded queries and invalid surah IDs', () => {
    for (const query of ['', '  ', 'x'.repeat(121), 'r\nHm', 'rHm\u007f', 'imagined']) {
      expect(searchQacVerses(index, 'root', query, null).hits).toEqual([]);
    }
    for (const surah of [-1, 0, 115, 1.2, NaN]) {
      expect(searchQacVerses(index, 'root', 'rHm', surah)).toEqual({
        term: null,
        hits: [],
      });
    }
  });
});
