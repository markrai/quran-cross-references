import { describe, expect, it } from 'vitest';
import { QuranThemeIndex } from './theme-index.ts';
import type { QuranThemeDataset } from './theme-types.ts';

const hashes = { annotations: 'a'.repeat(64), ontology: 'b'.repeat(64) };

function fixture(): QuranThemeDataset {
  const counts = Array.from({ length: 338 }, () => 0);
  const ayahs = Array.from({ length: 6236 }, (_, ayah) => {
    const id = ayah % 338;
    counts[id] = (counts[id] ?? 0) + 1;
    return [id];
  });
  const tags = Array.from({ length: 338 }, (_, index) => ({
    name: 'Topic ' + String(index),
    description: 'Experimental annotation',
    domain: 'Domain ' + String(Math.floor((Math.floor((index * 70) / 338) * 18) / 70)),
    category: 'Category ' + String(Math.floor((index * 70) / 338)),
    count: counts[index] ?? 0,
  }));
  return {
    format: 'quran-external-themes',
    schemaVersion: 1,
    versification: 'hafs-kufan-6236',
    origin: 'external-llm-assisted-annotation',
    authority: 'exploratory-not-tafsir',
    source: {
      annotationsSha256: hashes.annotations,
      ontologySha256: hashes.ontology,
      revision: 'cb3852b127bfdda6668c5eec9e5c1d9cdcde3810',
      license: 'CC BY 4.0',
      attribution: 'QSAC, Ahmad Bilal, CC BY 4.0',
    },
    annotationCount: 6236,
    sourceAssignmentCount: 6236,
    duplicateAssignmentCount: 0,
    tags,
    ayahs,
  };
}

describe('QSAC client-side annotation validation', () => {
  it('validates exact provenance, counts and deterministic verse postings', () => {
    const index = new QuranThemeIndex(fixture(), hashes);
    expect(index.find('Topic 0')?.count).toBe(19);
    expect(index.occurrences('Topic 0')).toEqual(Array.from({ length: 19 }, (_, n) => n * 338));
    expect(index.forAyah(338)[0]?.name).toBe('Topic 0');
    expect(index.rankedTags()).toHaveLength(338);
    expect(index.frequencyBySurah('Topic 0')).toHaveLength(114);
  });

  it('rejects forged totals, duplicate IDs and changed tag semantics', () => {
    const dataset = fixture();
    expect(() => new QuranThemeIndex({ ...dataset, annotationCount: 1 }, hashes)).toThrow('total');
    expect(() => new QuranThemeIndex({ ...dataset, authority: 'authoritative' }, hashes)).toThrow(
      'classification',
    );
    expect(() => new QuranThemeIndex(dataset, { ...hashes, annotations: 'f'.repeat(64) })).toThrow(
      'provenance',
    );
    const ayahs = [...dataset.ayahs];
    ayahs[0] = [0, 0];
    expect(() => new QuranThemeIndex({ ...dataset, ayahs }, hashes)).toThrow('numeric tag');
    const tags = [...dataset.tags];
    const first = tags[0];
    if (!first) throw new Error('Missing tag fixture.');
    tags[1] = { ...first };
    expect(() => new QuranThemeIndex({ ...dataset, tags }, hashes)).toThrow('metadata');
  });

  it('rejects malformed publication structures, missing attribution and damaged ontology records', () => {
    const dataset = fixture();
    expect(() => new QuranThemeIndex(null, hashes)).toThrow('object');
    expect(() => new QuranThemeIndex({ ...dataset, source: null }, hashes)).toThrow('object');
    expect(() => new QuranThemeIndex({ ...dataset, tags: null }, hashes)).toThrow('array');
    expect(() => new QuranThemeIndex({ ...dataset, ayahs: null }, hashes)).toThrow('array');
    expect(() => new QuranThemeIndex({ ...dataset, tags: dataset.tags.slice(1) }, hashes)).toThrow('338');
    expect(() => new QuranThemeIndex(dataset, { ...hashes, ontology: 'bad' })).toThrow('provenance');
    expect(() => new QuranThemeIndex({ ...dataset, source: { ...dataset.source, attribution: 'Uncredited' } }, hashes)).toThrow('attribution');
    const first = dataset.tags[0];
    if (!first) throw new Error('Missing fixture tag.');
    expect(() =>
      new QuranThemeIndex({ ...dataset, tags: [{ ...first, name: '' }, ...dataset.tags.slice(1)] }, hashes),
    ).toThrow('canonical');
    expect(() =>
      new QuranThemeIndex({ ...dataset, tags: [{ ...first, count: -1 }, ...dataset.tags.slice(1)] }, hashes),
    ).toThrow('metadata');
    expect(() =>
      new QuranThemeIndex({ ...dataset, tags: [{ ...first, domain: 'Unknown domain' }, ...dataset.tags.slice(1)] }, hashes),
    ).toThrow('hierarchy');
  });

  it('rejects empty, oversized and malformed verse-level assignments and inconsistent audits', () => {
    const dataset = fixture();
    const first = dataset.ayahs[0];
    if (!first) throw new Error('Missing verse fixture.');
    const changed = (replacement: unknown): unknown => ({
      ...dataset,
      ayahs: [replacement, ...dataset.ayahs.slice(1)],
    });
    expect(() => new QuranThemeIndex(changed([]), hashes)).toThrow('1–6');
    expect(() => new QuranThemeIndex(changed([0, 1, 2, 3, 4, 5, 6]), hashes)).toThrow('1–6');
    expect(() => new QuranThemeIndex(changed(null), hashes)).toThrow('array');
    expect(() => new QuranThemeIndex(changed(['0']), hashes)).toThrow('numeric tag');
    expect(() => new QuranThemeIndex(changed([-1]), hashes)).toThrow('numeric tag');
    expect(() => new QuranThemeIndex(changed([339]), hashes)).toThrow('numeric tag');
    expect(() =>
      new QuranThemeIndex({ ...dataset, sourceAssignmentCount: 6237 }, hashes),
    ).toThrow('Raw source totals');
    expect(() =>
      new QuranThemeIndex({ ...dataset, duplicateAssignmentCount: -1 }, hashes),
    ).toThrow('Raw source totals');
    expect(() =>
      new QuranThemeIndex({ ...dataset, sourceAssignmentCount: 'unverified' }, hashes),
    ).toThrow('Raw source totals');
    expect(() => new QuranThemeIndex({ ...dataset, ayahs: [first, ...dataset.ayahs.slice(1)], tags: dataset.tags.map((tag, id) => id === 0 ? { ...tag, count: 0 } : tag) }, hashes)).toThrow('frequency');
    const index = new QuranThemeIndex(dataset, hashes);
    expect(index.occurrences('not-a-theme')).toEqual([]);
    expect(index.frequencyBySurah('not-a-theme').every((row) => row.count === 0)).toBe(true);
  });

});
