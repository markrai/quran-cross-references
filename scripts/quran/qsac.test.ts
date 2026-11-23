import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QuranThemeIndex } from '../../src/core/quran/theme-index.ts';
import { importQsacThemes } from './qsac.ts';

const pins = JSON.parse(readFileSync('data/quran/sources.json', 'utf8')) as {
  readonly sources: readonly { readonly id: string; readonly sha256: string }[];
};
const source = pins.sources.find((entry) => entry.id === 'qsac-verse-tags-v1');
const ontology = pins.sources.find((entry) => entry.id === 'qsac-ontology-v1');
if (!source || !ontology) throw new Error('Missing QSAC source pins.');
const hashes = { annotations: source.sha256, ontology: ontology.sha256 };
const csv = readFileSync('data/raw/qsac-dataset.csv', 'utf8');
const ontologyText = readFileSync('data/raw/qsac-ontology.json', 'utf8');

describe('Phase 2D.1 external QSAC thematic evidence importer', () => {
  it('preserves 6,236 canonical verse labels, unique ontology labels and separate evidence origin', () => {
    const dataset = importQsacThemes(csv, ontologyText, hashes);
    expect(dataset).toMatchObject({
      format: 'quran-external-themes',
      schemaVersion: 1,
      versification: 'hafs-kufan-6236',
      origin: 'external-llm-assisted-annotation',
      authority: 'exploratory-not-tafsir',
    });
    expect(dataset.ayahs).toHaveLength(6236);
    expect(dataset.tags).toHaveLength(338);
    expect(new Set(dataset.tags.map((tag) => tag.domain)).size).toBe(18);
    expect(new Set(dataset.tags.map((tag) => tag.domain + '/' + tag.category)).size).toBe(70);
    expect(dataset.annotationCount).toBeGreaterThan(14000);
    expect(dataset.ayahs[0]?.map((id) => dataset.tags[id]?.name)).toEqual([
      'Names and Attributes of Allah',
      'Divine Mercy',
    ]);
    expect(dataset.ayahs[6235]?.length).toBeGreaterThan(0);
    expect(dataset.tags.reduce((sum, item) => sum + item.count, 0)).toBe(dataset.annotationCount);
    expect(JSON.stringify(dataset)).not.toContain('Sovereign of the Day of Recompense');
    expect(JSON.stringify(dataset)).not.toContain('بِسْمِ اللَّهِ');
  });

  it('indexes authentic theme labels into canonical ayah positions without synthesizing edges', () => {
    const dataset = importQsacThemes(csv, ontologyText, hashes);
    const index = new QuranThemeIndex(dataset, hashes);
    expect(index.forAyah(0).map((tag) => tag.name)).toContain('Divine Mercy');
    expect(index.find('Divine Mercy')?.domain).toBeTruthy();
    expect(index.find('not a topic')).toBeNull();
    const hits = index.occurrences('Divine Mercy');
    expect(hits[0]).toBe(0);
    expect(hits).toContain(2);
    expect(index.frequencyBySurah('Divine Mercy').reduce((sum, row) => sum + row.count, 0)).toBe(hits.length);
    expect(index.rankedTags()[0]?.count).toBeGreaterThan(300);
    expect(() => index.forAyah(6236)).toThrow('ayah');
  });

  it('rejects missing verses, changed labels, malformed translations, or forged provenance', () => {
    expect(() => importQsacThemes(csv.replace('1,1,', '1,2,'), ontologyText, hashes)).toThrow('Unaligned');
    expect(() => importQsacThemes(csv.replace('Names and Attributes of Allah|Divine Mercy', 'not a real tag'), ontologyText, hashes)).toThrow('Unknown');
    expect(() => importQsacThemes(csv.replace('License: Creative Commons Attribution 4.0', 'Missing license'), ontologyText, hashes)).toThrow('attribution');
    expect(() => importQsacThemes(csv, ontologyText, { ...hashes, ontology: 'invalid' })).toThrow('checksum');
    const dataset = importQsacThemes(csv, ontologyText, hashes);
    expect(() => new QuranThemeIndex({ ...dataset, origin: 'curated' }, hashes)).toThrow('classification');
    expect(() => new QuranThemeIndex({ ...dataset, ayahs: dataset.ayahs.slice(1) }, hashes)).toThrow('6,236');
    const changed = [...dataset.ayahs];
    changed[0] = [999];
    expect(() => new QuranThemeIndex({ ...dataset, ayahs: changed }, hashes)).toThrow('numeric tag');
    const altered = [...dataset.tags];
    const original = altered[0];
    if (!original) throw new Error('Missing fixture tag.');
    altered[0] = { ...original, count: original.count + 1 };
    expect(() => new QuranThemeIndex({ ...dataset, tags: altered }, hashes)).toThrow('frequency');
  });

  it('generates byte-identical projections from pinned source copies', () => {
    const first = JSON.stringify(importQsacThemes(csv, ontologyText, hashes));
    const second = JSON.stringify(importQsacThemes(csv, ontologyText, hashes));
    expect(createHash('sha256').update(first).digest('hex')).toBe(
      createHash('sha256').update(second).digest('hex'),
    );
  });
});
