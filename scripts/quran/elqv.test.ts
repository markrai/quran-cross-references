import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QuranEmotionIndex } from '../../src/core/quran/emotion-index.ts';
import { ELQV_LABELS } from '../../src/core/quran/emotion-types.ts';
import { CANONICAL_QURAN } from '../../src/core/quran/quran-versification.ts';
import { importElqvEmotions } from './elqv.ts';

const catalog = JSON.parse(readFileSync('data/quran/sources.json', 'utf8')) as {
  readonly sources: readonly { readonly id: string; readonly sha256: string }[];
};
const pin = catalog.sources.find((item) => item.id === 'elqv-2025-expert-emotions');
if (!pin) throw new Error('Missing immutable ELQV source pin.');
const raw = readFileSync('data/raw/ELQV.csv', 'utf8');
const indexAt = (surah: number, ayah: number): number => {
  const result = CANONICAL_QURAN.indexOf({ surah, ayah });
  if (result === undefined) throw new Error('Invalid fixture reference.');
  return result;
};
const imported = () => importElqvEmotions(raw, pin.sha256);

describe('Independent ELQV 2025 specialist annotation source', () => {
  it('keeps original row totals, unique verse counts, and per-class sample histograms separate', () => {
    const dataset = imported();
    expect(dataset).toMatchObject({
      format: 'quran-external-emotions',
      schemaVersion: 1,
      versification: 'hafs-kufan-6236',
      origin: 'external-specialist-annotated-emotions',
      authority: 'exploratory-not-tafsir',
      rowCount: 2100,
      distinctAyahCount: 2087,
      membershipCount: 2092,
      identicalDuplicateCount: 8,
      conflictedAyahCount: 4,
      labels: ['fear', 'joy', 'anger', 'sadness'],
      labelCounts: [672, 586, 494, 340],
    });
    expect(dataset.entries).toHaveLength(2087);
    expect(dataset.entries.reduce((sum, [,labels]) => sum + labels.length, 0)).toBe(2092);
    expect(dataset.entries.every(([,labels]) => labels.length >= 1 && labels.length <= 3)).toBe(true);
    expect(JSON.stringify(dataset)).not.toContain('سورة ق');
    expect(JSON.stringify(dataset)).not.toContain('Verse Diac');
    expect(JSON.stringify(dataset)).not.toContain('Sourah Arabic');
    expect(dataset.source.attribution).toContain('Almarzoqi');
    expect(dataset.source.license).toBe('CC0-1.0');
  });

  it('preserves expert disagreement instead of voting away or multiplying source memberships', () => {
    const dataset = imported();
    const index = new QuranEmotionIndex(dataset, pin.sha256);
    expect(index.forAyah(indexAt(26, 8))).toEqual(['fear', 'anger', 'sadness']);
    expect(index.forAyah(indexAt(20, 12))).toEqual(['fear', 'joy']);
    expect(index.forAyah(indexAt(26, 172))).toEqual(['fear', 'anger']);
    expect(index.forAyah(indexAt(79, 17))).toEqual(['fear', 'anger']);
    expect(index.occurrences('conflicts')).toEqual([
      indexAt(20, 12),
      indexAt(26, 8),
      indexAt(26, 172),
      indexAt(79, 17),
    ]);
    expect(index.forAyah(indexAt(39, 23))).toEqual(['fear']);
    expect(index.occurrences('fear').length).toBe(672);
    expect(index.occurrences('joy').length).toBe(586);
    expect(index.occurrences('anger').length).toBe(494);
    expect(index.occurrences('sadness').length).toBe(340);
    expect(index.occurrences('all').length).toBe(2087);
    expect(index.occurrences('unknown' as 'fear')).toEqual([]);
    expect(index.forAyah(indexAt(1, 1))).toEqual([]);
    expect(() => index.forAyah(6236)).toThrow('ayah');
  });

  it('counts topic intersections only within the ELQV-covered sample and allows overlapping classes', () => {
    const index = new QuranEmotionIndex(imported(), pin.sha256);
    const overlap = index.overlaps([indexAt(26, 8), indexAt(20, 12)]);
    expect(overlap).toEqual({
      distinctAyahs: 2,
      labelCounts: [2, 1, 1, 1],
    });
    expect(index.overlaps([])).toEqual({ distinctAyahs: 0, labelCounts: [0, 0, 0, 0] });
    expect(index.distribution('fear')).toHaveLength(114);
    expect(index.distribution('conflicts').reduce((sum, row) => sum + row.count, 0)).toBe(4);
    expect(index.distribution('all').reduce((sum, row) => sum + row.count, 0)).toBe(2087);
    expect(ELQV_LABELS).toHaveLength(4);
  });

  it('never republishes alternative Arabic texts or translation columns, and regenerates deterministically', () => {
    const first = JSON.stringify(imported());
    const second = JSON.stringify(imported());
    expect(createHash('sha256').update(first).digest('hex')).toBe(
      createHash('sha256').update(second).digest('hex'),
    );
  });

  it('rejects broken or incomplete primary CSV records and unrecognized source labels', () => {
    const assertBad = (source: string, reason: string) => {
      expect(() => importElqvEmotions(source, pin.sha256)).toThrow(reason);
    };
    assertBad(raw.replace('Sourah Arabic,', 'Surah,'), 'schema');
    assertBad(raw.replace('سورة ق,50,37,', 'سورة ق,150,37,'), 'boundaries');
    assertBad(raw.replace('سورة ق,50,37,', 'سورة ق,050,37,'), 'Noncanonical');
    assertBad(raw.replace(',fear\n', ',unknown\n'), 'Unrecognized');
    assertBad(raw.replace('سورة ق,50,37,', 'سورة ق,50,37,,'), 'histogram');
    assertBad(raw.substring(0, raw.lastIndexOf('\n', raw.length - 2)), '2,100');
    expect(() => importElqvEmotions(raw, 'invalid')).toThrow('SHA-256');
  });

  it('rejects source tampering that changes the audited duplicate/discordant label distribution', () => {
    const lines = raw.split('\n');
    const one = lines.findIndex((line) => line.includes('سورة ق,50,37,'));
    if (one < 0) throw new Error('Missing expected source reference.');
    const changed = [...lines];
    changed[one] = (changed[one] ?? '').replace(',fear', ',joy');
    expect(() => importElqvEmotions(changed.join('\n'), pin.sha256)).toThrow('histogram');
  });

  it('fails closed on malformed client evidence, false source claims, and unsorted/duplicate verse IDs', () => {
    const dataset = imported();
    const build = (input: unknown, sourcePin = pin.sha256) => new QuranEmotionIndex(input, sourcePin);
    expect(() => build(null)).toThrow('object');
    expect(() => build({ ...dataset, source: null })).toThrow('object');
    expect(() => build({ ...dataset, origin: 'curated' })).toThrow('classification');
    expect(() => build(dataset, '0'.repeat(64))).toThrow('provenance');
    expect(() => build({ ...dataset, source: { ...dataset.source, attribution: 'uncredited' } })).toThrow('attribution');
    expect(() => build({ ...dataset, labels: ['joy','fear','anger','sadness'] })).toThrow('vocabulary');
    expect(() => build({ ...dataset, labelCounts: [675,589,495,341] })).toThrow('histogram');
    expect(() => build({ ...dataset, rowCount: 2087 })).toThrow('totals');
    expect(() => build({ ...dataset, entries: [] })).toThrow('2,087');
    expect(() => build({ ...dataset, entries: [null, ...dataset.entries.slice(1)] })).toThrow('array');
    const swapped = [dataset.entries[1], dataset.entries[0], ...dataset.entries.slice(2)];
    expect(() => build({ ...dataset, entries: swapped })).toThrow('sorted');
    const wrong = [...dataset.entries];
    wrong[0] = [6236, [0]];
    expect(() => build({ ...dataset, entries: wrong })).toThrow('canonical');
    const invalidClass = [...dataset.entries];
    invalidClass[0] = [dataset.entries[0]?.[0], [4]];
    expect(() => build({ ...dataset, entries: invalidClass })).toThrow('class IDs');
    const duplicateClass = [...dataset.entries];
    duplicateClass[0] = [dataset.entries[0]?.[0], [0, 0]];
    expect(() => build({ ...dataset, entries: duplicateClass })).toThrow('class IDs');
    const noLabels = [...dataset.entries];
    noLabels[0] = [dataset.entries[0]?.[0], []];
    expect(() => build({ ...dataset, entries: noLabels })).toThrow('sorted');
  });
});
