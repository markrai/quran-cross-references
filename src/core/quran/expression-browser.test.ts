import { describe, expect, it } from 'vitest';
import { QuranExpressionIndex } from './expression-browser.ts';

const words = ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَٰنِ', 'ٱلرَّحِيمِ'];
const arabic = Array.from({ length: 6236 }, () => words.join(' '));
const source = {
  id: 'tanzil-uthmani',
  fileName: 'quran-uthmani-1.1.txt',
  url: 'https://tanzil.net',
  sha256: 'a'.repeat(64),
  license: 'CC BY 3.0',
  attribution: 'Tanzil Project',
  retrievedAt: '2026-11-22',
};
const id = 'exact:v1:' + 'b'.repeat(64);
const entry = {
  id,
  kind: 'exact-repeated-expression',
  origin: 'computed',
  words: words.slice(0, 3),
  occurrences: [
    { ayah: 7, start: 0, end: 3 },
    { ayah: 261, start: 0, end: 3 },
  ],
};

function dataset() {
  return {
    format: 'quran-exact-expressions',
    schemaVersion: 1,
    versification: 'hafs-kufan-6236',
    tokenPolicy: 'tanzil-uthmani-whitespace-verbatim-v1',
    minWords: 3,
    maxWords: 8,
    source: { ...source },
    statistics: {
      ayahCount: 6236,
      tokenCount: 6236 * 4,
      repeatedCandidates: 1,
      redundantCandidates: 0,
      emittedExpressions: 1,
      emittedOccurrences: 2,
      mostFrequentExpression: 2,
    },
    expressions: [{ ...entry, words: [...entry.words], occurrences: [...entry.occurrences] }],
  };
}

describe('published exact-expression inverted index', () => {
  it('matches distinct ayahs by exact word spans without multiplying pairwise edges', () => {
    const index = new QuranExpressionIndex(dataset(), arabic, source);
    expect(index.expressions).toHaveLength(1);
    expect(index.occurrenceCount).toBe(2);
    expect(index.source.sha256).toBe(source.sha256);
    expect(index.forAyah(7)).toEqual([{ expression: index.expressions[0], start: 0, end: 3 }]);
    expect(index.forAyah(261)).toHaveLength(1);
    expect(index.forAyah(0)).toEqual([]);
    expect(index.forAyah(999999)).toEqual([]);
    expect(index.find(id)).toBe(index.expressions[0]);
    expect(index.find(null)).toBeNull();
    expect(index.find('not-an-id')).toBeNull();
  });

  it('orders hits by longest phrase then original word offset, retaining repeated spans', () => {
    const value = dataset();
    value.expressions.push({
      ...entry,
      id: 'exact:v1:' + 'c'.repeat(64),
      words: [...words],
      occurrences: [
        { ayah: 7, start: 0, end: 4 },
        { ayah: 261, start: 0, end: 4 },
      ],
    });
    value.statistics.emittedExpressions = 2;
    value.statistics.emittedOccurrences = 4;
    value.statistics.repeatedCandidates = 2;
    const index = new QuranExpressionIndex(value, arabic, source);
    expect(index.forAyah(7).map((match) => match.expression.words.length)).toEqual([4, 3]);

    const withExtra = dataset();
    const firstExtra = withExtra.expressions[0];
    if (!firstExtra) throw new Error('Missing fixture expression.');
    firstExtra.occurrences.push({ ayah: 261, start: 1, end: 4 });
    expect(() => new QuranExpressionIndex(withExtra, arabic, source)).toThrow();
  });

  it('rejects invalid format, source provenance and incompatible corpora', () => {
    for (const corrupt of [
      { format: 'anything' },
      { schemaVersion: 2 },
      { versification: 'invalid' },
      { tokenPolicy: 'normalize-arabic' },
      { minWords: 2 },
      { maxWords: 9 },
    ]) {
      expect(() => new QuranExpressionIndex({ ...dataset(), ...corrupt }, arabic, source)).toThrow(
        'Incompatible',
      );
    }
    expect(() => new QuranExpressionIndex(null, arabic, source)).toThrow('must be an object');
    expect(() => new QuranExpressionIndex({ ...dataset(), source: null }, arabic, source)).toThrow(
      'must be an object',
    );
    expect(() => new QuranExpressionIndex(dataset(), arabic, { ...source, sha256: 'bad' })).toThrow(
      'source',
    );
    expect(() => new QuranExpressionIndex(dataset(), arabic, { ...source, id: 'other' })).toThrow(
      'source',
    );
    expect(() => new QuranExpressionIndex(dataset(), arabic.slice(1), source)).toThrow(
      'versification',
    );
    const withSource = dataset();
    withSource.source.license = 'altered';
    expect(() => new QuranExpressionIndex(withSource, arabic, source)).toThrow('pinned Tanzil');
  });

  it('rejects missing statistics, bogus counts and incomplete expression arrays', () => {
    const value = dataset();
    value.statistics.tokenCount = 1;
    expect(() => new QuranExpressionIndex(value, arabic, source)).toThrow('statistics');
    value.statistics.tokenCount = 6236 * 4;
    value.statistics.ayahCount = 4;
    expect(() => new QuranExpressionIndex(value, arabic, source)).toThrow('statistics');
    value.statistics.ayahCount = 6236;
    value.statistics.emittedExpressions = 2;
    expect(() => new QuranExpressionIndex(value, arabic, source)).toThrow('declared count');
    value.statistics.emittedExpressions = 1;
    value.statistics.emittedOccurrences = 5;
    expect(() => new QuranExpressionIndex(value, arabic, source)).toThrow('inconsistent');
    value.statistics.emittedOccurrences = 2;
    value.statistics.redundantCandidates = -1;
    expect(() => new QuranExpressionIndex(value, arabic, source)).toThrow('nonnegative');
  });

  it('rejects malformed expression identity, origin, words and duplicate IDs', () => {
    const bad = dataset();
    const firstEntry = bad.expressions[0];
    if (!firstEntry) throw new Error('Missing fixture expression.');
    firstEntry.id = 'unknown';
    expect(() => new QuranExpressionIndex(bad, arabic, source)).toThrow('Invalid');
    firstEntry.id = id;
    firstEntry.origin = 'curated';
    expect(() => new QuranExpressionIndex(bad, arabic, source)).toThrow('Invalid');
    firstEntry.origin = 'computed';
    firstEntry.kind = 'interpretation';
    expect(() => new QuranExpressionIndex(bad, arabic, source)).toThrow('Invalid');
    firstEntry.kind = 'exact-repeated-expression';
    firstEntry.words = ['bad word', ...words.slice(1, 3)];
    expect(() => new QuranExpressionIndex(bad, arabic, source)).toThrow('Invalid');
    firstEntry.words = [words[0] ?? ''];
    expect(() => new QuranExpressionIndex(bad, arabic, source)).toThrow('Invalid');
    firstEntry.words = words.slice(0, 3);
    bad.expressions.push({ ...firstEntry });
    bad.statistics.emittedExpressions = 2;
    expect(() => new QuranExpressionIndex(bad, arabic, source)).toThrow('duplicate');
  });

  it('rejects fabricated source spans, unordered occurrences and same-ayah-only matches', () => {
    const bad = dataset();
    const firstEntry = bad.expressions[0];
    if (!firstEntry) throw new Error('Missing fixture expression.');
    firstEntry.words = ['INVALID', ...words.slice(1, 3)];
    expect(() => new QuranExpressionIndex(bad, arabic, source)).toThrow('Arabic source span');
    firstEntry.words = words.slice(0, 3);
    firstEntry.occurrences = [
      { ayah: 7, start: 0, end: 3 },
      { ayah: 7, start: 0, end: 3 },
    ];
    expect(() => new QuranExpressionIndex(bad, arabic, source)).toThrow('out-of-order');
    firstEntry.occurrences = [
      { ayah: 7, start: 0, end: 3 },
      { ayah: 7, start: 1, end: 4 },
    ];
    firstEntry.words = words.slice(0, 3);
    expect(() => new QuranExpressionIndex(bad, arabic, source)).toThrow('Arabic source span');
    firstEntry.words = words.slice(1, 4);
    firstEntry.occurrences = [
      { ayah: 7, start: 1, end: 4 },
      { ayah: 7, start: 1, end: 4 },
    ];
    expect(() => new QuranExpressionIndex(bad, arabic, source)).toThrow('out-of-order');
    firstEntry.occurrences = [{ ayah: 7, start: 1, end: 4 }];
    expect(() => new QuranExpressionIndex(bad, arabic, source)).toThrow('multiple ayahs');
    firstEntry.occurrences = [
      { ayah: 7, start: 1, end: 4 },
      { ayah: 261, start: 1, end: 5 },
    ];
    expect(() => new QuranExpressionIndex(bad, arabic, source)).toThrow('out-of-order');
  });
});
