import { describe, expect, it } from 'vitest';
import { CANONICAL_QURAN } from './quran-versification.ts';
import {
  createVerseSearchIndex,
  searchQuranVerses,
  type VerseSearchOptions,
  type VerseSearchText,
} from './verse-search.ts';

function fixture(): VerseSearchText {
  const arabic = Array.from({ length: CANONICAL_QURAN.ayahCount }, () => 'كِتَابٌ');
  const english = Array.from({ length: CANONICAL_QURAN.ayahCount }, () => 'Book.');
  arabic[0] = 'بِسْمِ ٱللَّهِ';
  arabic[1] = 'بسم الله';
  arabic[2] = 'مَرْحَمَةٌ وَمَرْحَمَةٌ';
  english[0] = 'Mercy, then mercy.';
  english[1] = 'Merciful!';
  return { arabic, english };
}

const base: VerseSearchOptions = {
  query: 'mercy',
  language: 'english',
  mode: 'literal',
  surah: null,
};

describe('canonical bilingual verse search', () => {
  it('requires complete parallel Quran arrays', () => {
    expect(() => createVerseSearchIndex({ arabic: [], english: [] })).toThrow('complete');
  });

  it('matches English without regard to case and returns deterministic original offsets', () => {
    const text = fixture();
    const index = createVerseSearchIndex(text);
    const hits = searchQuranVerses(index, { ...base, query: 'MERCY' });
    expect(hits).toEqual([{ ayahIndex: 0, spans: [{ start: 0, end: 5 }, { start: 12, end: 17 }] }]);
    expect(text.english[0]).toBe('Mercy, then mercy.');
  });

  it('keeps exact Uthmani characters unchanged and strips only marks in optional mode', () => {
    const index = createVerseSearchIndex(fixture());
    expect(searchQuranVerses(index, { ...base, query: 'بسم', language: 'arabic' })).toEqual([
      { ayahIndex: 1, spans: [{ start: 0, end: 3 }] },
    ]);
    const unmarked = searchQuranVerses(index, {
      ...base,
      query: 'بسم',
      language: 'arabic',
      mode: 'unmarked',
    });
    expect(unmarked.map((hit) => hit.ayahIndex)).toEqual([0, 1]);
    expect(unmarked[0]?.spans[0]).toEqual({ start: 0, end: 5 });
    expect(index.text.arabic[0]).toBe('بِسْمِ ٱللَّهِ');
  });

  it('preserves Uthmani orthography rather than silently folding distinct alifs', () => {
    const index = createVerseSearchIndex(fixture());
    expect(
      searchQuranVerses(index, { ...base, query: 'الله', language: 'arabic', mode: 'unmarked' }),
    ).toEqual([{ ayahIndex: 1, spans: [{ start: 4, end: 8 }] }]);
  });

  it('finds repeated spans within one ayah but returns only one hit for that ayah', () => {
    const index = createVerseSearchIndex(fixture());
    const hits = searchQuranVerses(index, {
      ...base,
      query: 'مرحمه',
      language: 'arabic',
      mode: 'unmarked',
    });
    expect(hits).toEqual([]);
    const exact = searchQuranVerses(index, {
      ...base,
      query: 'مرحمة',
      language: 'arabic',
      mode: 'unmarked',
    });
    expect(exact).toHaveLength(1);
    expect(exact[0]?.spans).toHaveLength(2);
  });

  it('filters by canonical surah ranges, including the first and last surahs', () => {
    const index = createVerseSearchIndex(fixture());
    const first = searchQuranVerses(index, { ...base, query: 'mercy', surah: 1 });
    expect(first.map((hit) => hit.ayahIndex)).toEqual([0]);
    expect(searchQuranVerses(index, { ...base, query: 'mercy', surah: 114 })).toEqual([]);
    expect(searchQuranVerses(index, { ...base, query: 'book', surah: 114 })).toHaveLength(6);
  });

  it('fails closed for empty, mark-only, overlong and invalid-surah queries', () => {
    const index = createVerseSearchIndex(fixture());
    expect(searchQuranVerses(index, { ...base, query: '   ' })).toEqual([]);
    expect(searchQuranVerses(index, { ...base, query: 'm'.repeat(121) })).toEqual([]);
    expect(searchQuranVerses(index, { ...base, surah: 0 })).toEqual([]);
    expect(searchQuranVerses(index, { ...base, surah: 115 })).toEqual([]);
    expect(searchQuranVerses(index, { ...base, surah: 1.5 })).toEqual([]);
    expect(
      searchQuranVerses(index, {
        ...base,
        query: 'ْ',
        language: 'arabic',
        mode: 'unmarked',
      }),
    ).toEqual([]);
  });

  it('handles searchable Arabic supplement marks and tatweel without damaging highlight offsets', () => {
    const text = fixture();
    const arabic = [...text.arabic];
    arabic[0] = 'مَـرْحَمَةٌ';
    const index = createVerseSearchIndex({ arabic, english: text.english });
    expect(
      searchQuranVerses(index, {
        ...base,
        query: 'مرحمة',
        language: 'arabic',
        mode: 'unmarked',
      }),
    ).toEqual([{ ayahIndex: 0, spans: [{ start: 0, end: arabic[0].length }] }]);
  });
});
