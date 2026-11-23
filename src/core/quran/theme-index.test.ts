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
    domain: 'Domain ' + String(Math.floor((index * 18) / 338)),
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
    expect(() => new QuranThemeIndex({ ...dataset, authority: 'authoritative' }, hashes)).toThrow('classification');
    expect(() => new QuranThemeIndex(dataset, { ...hashes, annotations: 'f'.repeat(64) })).toThrow('provenance');
    const ayahs = [...dataset.ayahs];
    ayahs[0] = [0, 0];
    expect(() => new QuranThemeIndex({ ...dataset, ayahs }, hashes)).toThrow('numeric tag');
    const tags = [...dataset.tags];
    const first = tags[0];
    if (!first) throw new Error('Missing tag fixture.');
    tags[1] = { ...first };
    expect(() => new QuranThemeIndex({ ...dataset, tags }, hashes)).toThrow('metadata');
  });
});
