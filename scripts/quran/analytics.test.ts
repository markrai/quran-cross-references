import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CANONICAL_QURAN } from '../../src/core/quran/quran-versification.ts';
import { QuranRelationshipIndex } from '../../src/core/quran/relationship-index.ts';
import type { QuranEvidenceSource } from '../../src/core/quran/relationship-evidence.ts';
import { importMutashabihat, importQuranText } from './datasets.ts';
import { buildQuranAnalytics } from './analytics.ts';
import { createExactExpressionEvidence, type QuranExactExpressionDataset } from './expression-evidence.ts';
import { parseQuranAnalytics } from '../../src/quran/analytics.ts';

const source = {
  id: 'tanzil-uthmani',
  fileName: 'quran-uthmani-1.1.txt',
  url: 'https://tanzil.net',
  sha256: 'a'.repeat(64),
  license: 'CC BY 3.0',
  attribution: 'Tanzil',
  retrievedAt: '2026-11-22',
};
const hashes = { arabic: source.sha256, curated: 'b'.repeat(64) };
const notice = 'Copyright (C) 2007-2021 Tanzil Project';

function fixture() {
  const links = new QuranRelationshipIndex({
    format: 'quran-similar-passages',
    schemaVersion: 1,
    versification: CANONICAL_QURAN.id,
    sourceRowCount: 3,
    duplicateCount: 0,
    repeatedRangeMemberCount: 0,
    links: [
      { source: { start: 7, end: 7 }, target: { start: 8, end: 8 }, contextAfter: 0 },
      { source: { start: 0, end: 0 }, target: { start: 7, end: 7 }, contextAfter: 0 },
      { source: { start: 8, end: 8 }, target: { start: 293, end: 293 }, contextAfter: 0 },
    ],
  });
  const expressions: QuranExactExpressionDataset = {
    format: 'quran-exact-expressions',
    schemaVersion: 1,
    versification: CANONICAL_QURAN.id,
    tokenPolicy: 'tanzil-uthmani-whitespace-verbatim-v1',
    minWords: 3,
    maxWords: 8,
    source,
    statistics: {
      ayahCount: CANONICAL_QURAN.ayahCount,
      tokenCount: 0,
      candidateOccurrences: 6,
      repeatedCandidates: 2,
      redundantCandidates: 0,
      emittedExpressions: 2,
      emittedOccurrences: 6,
      mostFrequentExpression: 4,
    },
    expressions: [
      {
        id: 'exact:v1:' + 'c'.repeat(64),
        origin: 'computed',
        kind: 'exact-repeated-expression',
        words: ['a', 'b', 'c'],
        occurrences: [
          { ayah: 0, start: 0, end: 3 },
          { ayah: 7, start: 0, end: 3 },
          { ayah: 8, start: 0, end: 3 },
          { ayah: 293, start: 0, end: 3 },
        ],
      },
      {
        id: 'exact:v1:' + 'd'.repeat(64),
        origin: 'computed',
        kind: 'exact-repeated-expression',
        words: ['d', 'e', 'f'],
        occurrences: [
          { ayah: 7, start: 1, end: 4 },
          { ayah: 8, start: 1, end: 4 },
        ],
      },
    ],
  };
  return { links, expressions };
}

describe('Phase 2C.1 Quran analytics aggregates', () => {
  it('counts curated link IDs once per touched surah, not once per ayah or per direction', () => {
    const { links, expressions } = fixture();
    const result = buildQuranAnalytics(links, expressions, hashes, notice);
    expect(result.totals).toEqual({
      ayahs: 6236,
      surahs: 114,
      curatedLinks: 3,
      curatedWithin: 1,
      curatedAcross: 2,
      exactExpressions: 2,
      exactSpans: 6,
      exactWithinSurahExpressions: 1,
      exactCrossSurahExpressions: 1,
    });
    expect(result.surahs).toHaveLength(114);
    expect(result.surahs[0]).toMatchObject({
      surah: 1,
      ayahCount: 7,
      curatedLinks: 1,
      curatedWithin: 0,
      curatedAcross: 1,
      firstCuratedAyah: 0,
      exactExpressions: 1,
      exactSpans: 1,
      exactCrossSurahExpressions: 1,
      firstExactAyah: 0,
    });
    expect(result.surahs[1]).toMatchObject({
      surah: 2,
      ayahCount: 286,
      curatedLinks: 3,
      curatedWithin: 1,
      curatedAcross: 2,
      curatedPer100Ayahs: 1.05,
      firstCuratedAyah: 7,
      exactExpressions: 2,
      exactSpans: 4,
      exactCrossSurahExpressions: 1,
      firstExactAyah: 7,
    });
    expect(result.surahs[2]).toMatchObject({
      surah: 3,
      curatedLinks: 1,
      curatedWithin: 0,
      curatedAcross: 1,
      exactExpressions: 1,
      exactSpans: 1,
    });
    expect(result.surahs[3]).toMatchObject({
      surah: 4,
      curatedLinks: 0,
      firstCuratedAyah: null,
      exactSpans: 0,
      firstExactAyah: null,
    });
    expect(result.topExpressions).toHaveLength(2);
    expect(result.topExpressions[0]).toMatchObject({
      spanCount: 4,
      distinctAyahCount: 4,
      surahCount: 3,
      firstAyah: 0,
    });
    expect(parseQuranAnalytics(result, hashes, links.linkCount)).toBe(result);
  });

  it('includes every ayah touched by a curated range without multiplying a link ID', () => {
    const { expressions } = fixture();
    const index = new QuranRelationshipIndex({
      format: 'quran-similar-passages',
      schemaVersion: 1,
      versification: CANONICAL_QURAN.id,
      sourceRowCount: 1,
      duplicateCount: 0,
      repeatedRangeMemberCount: 0,
      links: [
        { source: { start: 6, end: 8 }, target: { start: 293, end: 294 }, contextAfter: 0 },
      ],
    });
    const result = buildQuranAnalytics(index, expressions, hashes, notice);
    expect(result.totals.curatedLinks).toBe(1);
    expect(result.totals.curatedAcross).toBe(1);
    expect(result.surahs[0]?.curatedLinks).toBe(1);
    expect(result.surahs[1]?.curatedLinks).toBe(1);
    expect(result.surahs[2]?.curatedLinks).toBe(1);
    expect(result.surahs[0]?.firstCuratedAyah).toBe(6);
    expect(result.surahs[2]?.firstCuratedAyah).toBe(293);
    expect(parseQuranAnalytics(result, hashes, 1).surahs).toHaveLength(114);
  });

  it('fails on incompatible source versification or inconsistent occurrence totals', () => {
    const { links, expressions } = fixture();
    expect(() =>
      buildQuranAnalytics(
        links,
        { ...expressions, versification: 'not-the-quran' },
        hashes,
        notice,
      ),
    ).toThrow('canonical');
    expect(() =>
      buildQuranAnalytics(
        links,
        {
          ...expressions,
          statistics: { ...expressions.statistics, emittedOccurrences: 55 },
        },
        hashes,
        notice,
      ),
    ).toThrow('totals');
  });

  it('is deterministic against the pinned complete Tanzil and Mutashabihat corpus', () => {
    const manifest = JSON.parse(readFileSync('data/quran/sources.json', 'utf8')) as {
      readonly sources: readonly QuranEvidenceSource[];
    };
    const arabic = manifest.sources.find((pin) => pin.id === 'tanzil-uthmani');
    const curated = manifest.sources.find((pin) => pin.id === 'mutashabihat');
    if (!arabic || !curated) throw new Error('Missing source pins.');
    const source = readFileSync('data/raw/quran-uthmani-1.1.txt', 'utf8');
    const english = readFileSync('data/raw/en.pickthall.txt', 'utf8');
    const relations = readFileSync('data/raw/mutashabiha_data.json', 'utf8');
    const text = importQuranText(source, english);
    const relationships = new QuranRelationshipIndex(importMutashabihat(relations));
    const evidence = createExactExpressionEvidence(text.arabic, arabic);
    const report = buildQuranAnalytics(
      relationships,
      evidence,
      { arabic: arabic.sha256, curated: curated.sha256 },
      notice,
    );
    expect(report.totals).toMatchObject({
      ayahs: 6236,
      surahs: 114,
      curatedLinks: 2445,
      exactExpressions: 5084,
      exactSpans: 16924,
    });
    expect(report.surahs.reduce((sum, row) => sum + row.exactSpans, 0)).toBe(16924);
    expect(report.totals.curatedWithin + report.totals.curatedAcross).toBe(2445);
    expect(report.totals.exactWithinSurahExpressions + report.totals.exactCrossSurahExpressions).toBe(5084);
    expect(report.topExpressions).toHaveLength(32);
    expect(report.topExpressions[0]?.spanCount).toBe(114);
    expect(parseQuranAnalytics(report, { arabic: arabic.sha256, curated: curated.sha256 }, 2445)).toBe(report);
    const duplicate = buildQuranAnalytics(
      relationships,
      evidence,
      { arabic: arabic.sha256, curated: curated.sha256 },
      notice,
    );
    expect(createHash('sha256').update(JSON.stringify(report)).digest('hex')).toBe(
      createHash('sha256').update(JSON.stringify(duplicate)).digest('hex'),
    );
  }, 120_000);
});
