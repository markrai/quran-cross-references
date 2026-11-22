import { describe, expect, it } from 'vitest';
import { QuranRelationshipIndex } from '../../src/core/quran/relationship-index.ts';
import { buildQuranAnalytics } from './analytics.ts';
import type { QuranExactExpressionDataset } from './expression-evidence.ts';
import { parseQuranAnalytics } from '../../src/quran/analytics.ts';

const hashes = { arabic: 'a'.repeat(64), curated: 'b'.repeat(64) };
const index = new QuranRelationshipIndex({
  format: 'quran-similar-passages',
  schemaVersion: 1,
  versification: 'hafs-kufan-6236',
  sourceRowCount: 1,
  duplicateCount: 0,
  repeatedRangeMemberCount: 0,
  links: [{ source: { start: 0, end: 0 }, target: { start: 7, end: 7 }, contextAfter: 0 }],
});
const expressions: QuranExactExpressionDataset = {
  format: 'quran-exact-expressions',
  schemaVersion: 1,
  versification: 'hafs-kufan-6236',
  tokenPolicy: 'tanzil-uthmani-whitespace-verbatim-v1',
  minWords: 3,
  maxWords: 8,
  source: {
    id: 'tanzil-uthmani',
    fileName: 'quran-uthmani-1.1.txt',
    url: 'https://tanzil.net',
    sha256: hashes.arabic,
    license: 'CC BY',
    attribution: 'Tanzil',
    retrievedAt: '2026-11-22',
  },
  statistics: {
    ayahCount: 6236,
    tokenCount: 0,
    candidateOccurrences: 2,
    repeatedCandidates: 1,
    redundantCandidates: 0,
    emittedExpressions: 1,
    emittedOccurrences: 2,
    mostFrequentExpression: 2,
  },
  expressions: [
    {
      id: 'exact:v1:' + 'c'.repeat(64),
      kind: 'exact-repeated-expression',
      origin: 'computed',
      words: ['one', 'two', 'three'],
      occurrences: [
        { ayah: 0, start: 0, end: 3 },
        { ayah: 7, start: 0, end: 3 },
      ],
    },
  ],
};
const valid = buildQuranAnalytics(
  index,
  expressions,
  hashes,
  'Copyright (C) 2007-2021 Tanzil Project',
);

describe('published Quran analytics validation', () => {
  it('accepts the complete typed report and requires the correct source hashes', () => {
    expect(parseQuranAnalytics(valid, hashes, 1)).toBe(valid);
    expect(() => parseQuranAnalytics(valid, { ...hashes, arabic: 'invalid' }, 1)).toThrow('pin');
    expect(() => parseQuranAnalytics(valid, hashes, 2)).toThrow('totals');
  });

  it('rejects invalid schema, missing notice and contradictory global totals', () => {
    expect(() => parseQuranAnalytics(null, hashes, 1)).toThrow('object');
    expect(() => parseQuranAnalytics({ ...valid, schemaVersion: 2 }, hashes, 1)).toThrow('schema');
    expect(() => parseQuranAnalytics({ ...valid, tanzilNotice: '' }, hashes, 1)).toThrow('notice');
    expect(() =>
      parseQuranAnalytics({ ...valid, totals: { ...valid.totals, curatedAcross: 0 } }, hashes, 1),
    ).toThrow('totals');
    expect(() =>
      parseQuranAnalytics({ ...valid, totals: { ...valid.totals, exactSpans: -1 } }, hashes, 1),
    ).toThrow('integer');
  });

  it('requires all 114 canonical rows, valid per-100 denominators and traceable ayah positions', () => {
    expect(() =>
      parseQuranAnalytics({ ...valid, surahs: valid.surahs.slice(1) }, hashes, 1),
    ).toThrow('114');
    const rows = [...valid.surahs];
    const first = rows[0];
    if (!first) throw new Error('Missing surah fixture.');
    rows[0] = { ...first, curatedPer100Ayahs: 777 };
    expect(() => parseQuranAnalytics({ ...valid, surahs: rows }, hashes, 1)).toThrow('denominator');
    rows[0] = { ...first, firstCuratedAyah: 293 };
    expect(() => parseQuranAnalytics({ ...valid, surahs: rows }, hashes, 1)).toThrow('outside');
    rows[0] = { ...first, exactSpans: 9 };
    expect(() => parseQuranAnalytics({ ...valid, surahs: rows }, hashes, 1)).toThrow();
  });

  it('rejects fabricated exact phrases and oversized ranked projections', () => {
    const top = [...valid.topExpressions];
    const entry = top[0];
    if (!entry) throw new Error('Missing expression fixture.');
    top[0] = { ...entry, id: 'made-up' };
    expect(() => parseQuranAnalytics({ ...valid, topExpressions: top }, hashes, 1)).toThrow(
      'ranking',
    );
    expect(() =>
      parseQuranAnalytics(
        { ...valid, topExpressions: Array.from({ length: 33 }, () => valid.topExpressions[0]) },
        hashes,
        1,
      ),
    ).toThrow('budget');
    top[0] = { ...entry, spanCount: 1 };
    expect(() => parseQuranAnalytics({ ...valid, topExpressions: top }, hashes, 1)).toThrow(
      'ranking',
    );
  });
});
