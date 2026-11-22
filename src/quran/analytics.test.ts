import { describe, expect, it } from 'vitest';
import type { QuranAnalyticsDataset, QuranAnalyticsSurah } from '../core/quran/analytics-types.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import { parseQuranAnalytics } from './analytics.ts';

const hashes = { arabic: 'a'.repeat(64), curated: 'b'.repeat(64) };
const notice = 'Copyright (C) 2007-2021 Tanzil Project';

function base(): QuranAnalyticsDataset {
  const surahs: QuranAnalyticsSurah[] = Array.from({ length: 114 }, (_, index) => {
    const surah = index + 1;
    const range = CANONICAL_QURAN.surahRange(surah);
    const active = surah < 3;
    const ayahCount = range.end - range.start + 1;
    return {
      surah,
      ayahCount,
      curatedLinks: active ? 1 : 0,
      curatedWithin: 0,
      curatedAcross: active ? 1 : 0,
      curatedPer100Ayahs: active ? Math.round((1 / ayahCount) * 10_000) / 100 : 0,
      firstCuratedAyah: active ? range.start : null,
      exactExpressions: active ? 1 : 0,
      exactSpans: active ? 1 : 0,
      exactCrossSurahExpressions: active ? 1 : 0,
      exactSpansPer100Ayahs: active ? Math.round((1 / ayahCount) * 10_000) / 100 : 0,
      firstExactAyah: active ? range.start : null,
    };
  });
  return {
    format: 'quran-analytics',
    schemaVersion: 1,
    versification: CANONICAL_QURAN.id,
    evidence: {
      curated: 'curated-similar-passage',
      computed: 'exact-repeated-expression',
    },
    sourceHashes: hashes,
    totals: {
      ayahs: 6236,
      surahs: 114,
      curatedLinks: 1,
      curatedWithin: 0,
      curatedAcross: 1,
      exactExpressions: 1,
      exactSpans: 2,
      exactWithinSurahExpressions: 0,
      exactCrossSurahExpressions: 1,
    },
    surahs,
    topExpressions: [
      {
        id: 'exact:v1:' + 'c'.repeat(64),
        words: ['one', 'two', 'three'],
        wordCount: 3,
        spanCount: 2,
        distinctAyahCount: 2,
        surahCount: 2,
        firstAyah: 0,
      },
    ],
    tanzilNotice: notice,
  };
}

describe('published Quran analytics validation', () => {
  it('accepts the complete typed report and requires the correct source hashes', () => {
    const report = base();
    expect(parseQuranAnalytics(report, hashes, 1)).toBe(report);
    expect(() => parseQuranAnalytics(report, { ...hashes, arabic: 'invalid' }, 1)).toThrow('pin');
    expect(() => parseQuranAnalytics(report, hashes, 2)).toThrow('totals');
  });

  it('rejects invalid schema, missing notice and contradictory global totals', () => {
    const report = base();
    expect(() => parseQuranAnalytics(null, hashes, 1)).toThrow('object');
    expect(() => parseQuranAnalytics({ ...report, schemaVersion: 2 }, hashes, 1)).toThrow('schema');
    expect(() => parseQuranAnalytics({ ...report, tanzilNotice: '' }, hashes, 1)).toThrow('notice');
    expect(() =>
      parseQuranAnalytics({ ...report, totals: { ...report.totals, curatedAcross: 0 } }, hashes, 1),
    ).toThrow('totals');
    expect(() =>
      parseQuranAnalytics({ ...report, totals: { ...report.totals, exactSpans: -1 } }, hashes, 1),
    ).toThrow('integer');
  });

  it('requires all 114 canonical rows, valid denominators and traceable ayah positions', () => {
    const report = base();
    expect(() =>
      parseQuranAnalytics({ ...report, surahs: report.surahs.slice(1) }, hashes, 1),
    ).toThrow('114');
    const first = report.surahs[0];
    if (!first) throw new Error('Missing surah fixture.');
    const rows = [...report.surahs];
    rows[0] = { ...first, curatedPer100Ayahs: 777 };
    expect(() => parseQuranAnalytics({ ...report, surahs: rows }, hashes, 1)).toThrow(
      'denominator',
    );
    rows[0] = { ...first, firstCuratedAyah: 293 };
    expect(() => parseQuranAnalytics({ ...report, surahs: rows }, hashes, 1)).toThrow('outside');
    rows[0] = { ...first, exactSpans: 9 };
    expect(() => parseQuranAnalytics({ ...report, surahs: rows }, hashes, 1)).toThrow();
  });

  it('rejects fabricated exact phrases and oversized ranked projections', () => {
    const report = base();
    const first = report.topExpressions[0];
    if (!first) throw new Error('Missing phrase fixture.');
    const top = [{ ...first, id: 'made-up' }];
    expect(() => parseQuranAnalytics({ ...report, topExpressions: top }, hashes, 1)).toThrow(
      'ranking',
    );
    expect(() =>
      parseQuranAnalytics(
        { ...report, topExpressions: Array.from({ length: 33 }, () => first) },
        hashes,
        1,
      ),
    ).toThrow('budget');
    top[0] = { ...first, spanCount: 1 };
    expect(() => parseQuranAnalytics({ ...report, topExpressions: top }, hashes, 1)).toThrow(
      'ranking',
    );
  });
});
