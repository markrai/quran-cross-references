import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QacMorphologyIndex, buckwalterToArabic } from '../../src/core/quran/qac-index.ts';
import { QAC_SEGMENT_COUNT, QAC_WORD_COUNT, type QacSource } from '../../src/core/quran/qac-types.ts';
import { importQacMorphology } from './qac.ts';

const sources = JSON.parse(readFileSync('data/quran/sources.json', 'utf8')) as {
  readonly sources: readonly QacSource[];
};
const source = sources.sources.find((pin) => pin.id === 'qac-morphology-v04');
if (!source) throw new Error('Missing pinned QAC source.');
const tanzilNotice = 'Copyright (C) 2007-2021 Tanzil Project';

describe('QAC v0.4 original segment-level importer', () => {
  it('preserves canonical counts, full segment positions and copyright notices', () => {
    const raw = readFileSync('data/raw/quranic-corpus-morphology-0.4.txt', 'utf8');
    const imported = importQacMorphology(raw, source, tanzilNotice);
    expect(imported).toMatchObject({
      format: 'quran-qac-morphology',
      schemaVersion: 1,
      evidence: 'qac-segment-lemma-root',
      origin: 'annotated',
      wordCount: 77429,
      segmentCount: 128219,
      stemCount: 77915,
      ayahCount: 6236,
    });
    expect(imported.ayahs).toHaveLength(6236);
    expect(imported.ayahs[0]).toHaveLength(4);
    expect(imported.ayahs[6235]).toHaveLength(3);
    expect(imported.ayahs[0]?.[0]?.[0]).toEqual(['bi', 'P', 'PREFIX|bi+']);
    expect(imported.ayahs[0]?.[0]?.[1]?.[2]).toContain('LEM:{som');
    expect(imported.ayahs[0]?.[2]?.[1]?.[2]).toContain('ROOT:rHm');
    expect(imported.qacNotice).toContain('Copyright (C) 2011 Kais Dukes');
    expect(imported.qacNotice).toContain('Tanzil Quran Text (Uthmani, version 1.0.2)');
    expect(imported.ayahs.reduce((sum, ayah) => sum + ayah.length, 0)).toBe(QAC_WORD_COUNT);
    expect(imported.ayahs.reduce(
      (sum, ayah) => sum + ayah.reduce((words, segments) => words + segments.length, 0),
      0,
    )).toBe(QAC_SEGMENT_COUNT);
  }, 120_000);

  it('indexes original Buckwalter lemma/root features, including multiple stems and absent annotations', () => {
    const raw = readFileSync('data/raw/quranic-corpus-morphology-0.4.txt', 'utf8');
    const dataset = importQacMorphology(raw, source, tanzilNotice);
    const index = new QacMorphologyIndex(dataset, source);
    expect(index.wordCount).toBe(77429);
    expect(index.segmentCount).toBe(128219);
    expect(index.stemCount).toBe(77915);
    expect(index.lemmaCount).toBe(4832);
    expect(index.rootCount).toBe(1642);
    expect(index.wordsAt(0)).toHaveLength(4);
    expect(index.wordsAt(0)[2]?.roots).toContain('rHm');
    expect(index.resolve('root', 'رحم')).toBe('rHm');
    expect(index.resolve('root', 'ر.ح.م')).toBe('rHm');
    expect(index.resolve('root', 'unknown-root')).toBeNull();
    expect(index.occurrences('root', 'rHm').length).toBeGreaterThan(100);
    expect(index.occurrences('root', 'rHm').some((site) => site.ayah === 0 && site.word === 2)).toBe(true);
    expect(buckwalterToArabic('rHm')).toBe('رحم');
    expect(buckwalterToArabic('{ll~ahi')).toContain('ٱ');
    const multicore = dataset.ayahs.flat().find((word) =>
      word.filter((segment) => segment[2].startsWith('STEM|')).length > 1,
    );
    expect(multicore).toBeDefined();
    expect(() => index.wordsAt(-1)).toThrow('ayah');
    expect(index.occurrences('root', '__no_such_root__')).toEqual([]);
  }, 120_000);

  it('rejects missing words, altered locations and source provenance mismatches', () => {
    const raw = readFileSync('data/raw/quranic-corpus-morphology-0.4.txt', 'utf8');
    const baseline = importQacMorphology(raw, source, tanzilNotice);
    expect(() => importQacMorphology(raw.replace('(1:1:1:1)', '(1:1:3:1)'), source, tanzilNotice)).toThrow();
    expect(() => importQacMorphology(raw.replace('(1:1:1:1)', '(1:2:1:1)'), source, tanzilNotice)).toThrow();
    expect(() => importQacMorphology(raw.replace('Copyright (C) 2011 Kais Dukes', 'Original note'), source, tanzilNotice)).toThrow('copyright');
    expect(() => new QacMorphologyIndex({ ...baseline, wordCount: 20 }, source)).toThrow('counts');
    expect(() => new QacMorphologyIndex({ ...baseline, ayahs: baseline.ayahs.slice(1) }, source)).toThrow('6,236');
    expect(() => new QacMorphologyIndex(baseline, { ...source, sha256: '0'.repeat(64) })).toThrow('provenance');
  }, 120_000);

  it('reproduces a byte-identical typed projection from the same pinned source', () => {
    const raw = readFileSync('data/raw/quranic-corpus-morphology-0.4.txt', 'utf8');
    const first = JSON.stringify(importQacMorphology(raw, source, tanzilNotice));
    const second = JSON.stringify(importQacMorphology(raw, source, tanzilNotice));
    const sha = (text: string) => createHash('sha256').update(text).digest('hex');
    expect(sha(first)).toBe(sha(second));
  }, 120_000);
});
