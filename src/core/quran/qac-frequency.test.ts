import { describe, expect, it } from 'vitest';
import type { QacMorphologyIndex } from './qac-index.ts';
import type { QacGrouping, QacOccurrence } from './qac-types.ts';
import {
  buildQacFrequencyReport,
  qacFrequencyCoverage,
  qacSurahFrequency,
} from './qac-frequency.ts';

const site = (ayah: number, word: number): QacOccurrence => ({
  ayah,
  word,
  form: 'كلمة',
  pos: 'N',
});

const registries: Record<QacGrouping, Readonly<Record<string, readonly QacOccurrence[]>>> = {
  root: {
    b: [site(0, 1), site(1, 0)],
    c: [site(5, 2), site(5, 3)],
    a: [site(0, 0), site(0, 0), site(0, 1), site(7, 0)],
  },
  lemma: {
    L2: [site(0, 1)],
    L1: [site(0, 0)],
  },
};

const index: Pick<QacMorphologyIndex, 'wordCount' | 'terms' | 'occurrences'> = {
  wordCount: 12,
  terms: (grouping) => Object.keys(registries[grouping]),
  occurrences: (grouping, term) => registries[grouping][term] ?? [],
};

describe('Phase 3C.2 QAC vocabulary frequency analytics', () => {
  it('ranks exact annotations by unique word positions, then stable Buckwalter identifiers', () => {
    const report = buildQacFrequencyReport(index, 'root');
    expect(report.families).toEqual([
      { term: 'a', words: 3, ayahs: 2, surahs: 2 },
      { term: 'b', words: 2, ayahs: 2, surahs: 1 },
      { term: 'c', words: 2, ayahs: 1, surahs: 1 },
    ]);
    expect(report.cumulativeWords).toEqual([3, 4, 6]);
    expect(report.annotatedWords).toBe(6);
    expect(report.totalWords).toBe(12);
  });

  it('deduplicates overlapping families and reports potential source-word coverage', () => {
    const report = buildQacFrequencyReport(index, 'root');
    expect(qacFrequencyCoverage(report, 1)).toEqual({
      families: 1,
      words: 3,
      percent: 25,
    });
    expect(qacFrequencyCoverage(report, 2)).toEqual({
      families: 2,
      words: 4,
      percent: (4 / 12) * 100,
    });
    expect(qacFrequencyCoverage(report, 250)).toEqual({
      families: 3,
      words: 6,
      percent: 50,
    });
    expect(qacFrequencyCoverage(report, -1).words).toBe(0);
    expect(qacFrequencyCoverage(report, Number.NaN).words).toBe(0);
    expect(qacFrequencyCoverage(report, 2.9).families).toBe(2);
  });

  it('keeps roots distinct from lemmas rather than adding their counts together', () => {
    const roots = buildQacFrequencyReport(index, 'root');
    const lemmas = buildQacFrequencyReport(index, 'lemma');
    expect(roots.annotatedWords).toBe(6);
    expect(lemmas.annotatedWords).toBe(2);
    expect(lemmas.families.map((item) => item.term)).toEqual(['L1', 'L2']);
    expect(qacFrequencyCoverage(lemmas, 2).words).toBe(2);
  });

  it('counts matching QAC positions and ayahs by canonical surah with deterministic ordering', () => {
    expect(qacSurahFrequency(index, 'root', 'a')).toEqual([
      { surah: 1, words: 2, ayahs: 1 },
      { surah: 2, words: 1, ayahs: 1 },
    ]);
    expect(qacSurahFrequency(index, 'root', 'unknown')).toEqual([]);
  });

  it('fails on invalid canonical word coordinates instead of including corrupt data', () => {
    const corrupt = {
      wordCount: 12,
      terms: () => ['broken'],
      occurrences: () => [site(6236, 0)],
    } as Pick<QacMorphologyIndex, 'wordCount' | 'terms' | 'occurrences'>;
    expect(() => buildQacFrequencyReport(corrupt, 'root')).toThrow(
      'Invalid canonical QAC word position.',
    );
  });

  it('handles empty registries without NaN or fictional coverage', () => {
    const empty = {
      wordCount: 0,
      terms: () => [],
      occurrences: () => [],
    } as Pick<QacMorphologyIndex, 'wordCount' | 'terms' | 'occurrences'>;
    const report = buildQacFrequencyReport(empty, 'lemma');
    expect(report.families).toEqual([]);
    expect(qacFrequencyCoverage(report, 50)).toEqual({
      families: 0,
      words: 0,
      percent: 0,
    });
  });
});
