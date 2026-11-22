import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { importMutashabihat, importQuranText } from './datasets.ts';

const arabic = readFileSync('data/raw/quran-uthmani-1.1.txt', 'utf8');
const english = readFileSync('data/raw/en.pickthall.txt', 'utf8');
const mutashabihat = readFileSync('data/raw/mutashabiha_data.json', 'utf8');

describe('Quran source imports', () => {
  it('preserves every Arabic and English ayah without silently filling gaps', () => {
    const text = importQuranText(arabic, english);
    expect(text.format).toBe('quran-paired-text');
    expect(text.versification).toBe('hafs-kufan-6236');
    expect(text.arabic).toHaveLength(6236);
    expect(text.english).toHaveLength(6236);
    expect(text.arabic[0]).toContain('بِسْمِ');
    expect(text.english[0]).toContain('Allah');
    expect(text.english[261]).toContain('Allah');
    expect(text.arabic.every((value) => value.length > 0)).toBe(true);
    expect(text.english.every((value) => value.length > 0)).toBe(true);
  });

  it('rejects missing, duplicate, invalid, and malformed text rows', () => {
    expect(() => importQuranText(arabic, english.replace(/^1\|1\|.*\n/m, ''))).toThrow(
      /missing 1:1/,
    );
    expect(() => importQuranText(arabic, `1|1|a\n${english}`)).toThrow(/duplicate 1:1/);
    expect(() => importQuranText(arabic, `115|1|invalid\n${english}`)).toThrow(/invalid ayah/);
    expect(() => importQuranText(arabic, `broken\n${english}`)).toThrow(/malformed row/);
  });

  it('imports curated multi-ayah relationships without invented votes', () => {
    const data = importMutashabihat(mutashabihat);
    expect(data.format).toBe('quran-similar-passages');
    expect(data.versification).toBe('hafs-kufan-6236');
    expect(data.sourceRowCount).toBeGreaterThan(0);
    expect(data.links.length).toBeGreaterThan(0);
    expect(data.links).toContainEqual({
      source: { start: 8, end: 8 },
      target: { start: 1161, end: 1161 },
      contextAfter: 0,
    });
    expect(data.links.every((link) => link.source.end >= link.source.start)).toBe(true);
    expect(data.links.every((link) => link.target.end >= link.target.start)).toBe(true);
    expect(data.links.some((link) => link.source.start !== link.source.end)).toBe(true);
    expect(data.links[0]).not.toHaveProperty('votes');
    expect(importMutashabihat(mutashabihat)).toEqual(data);
  });

  it('rejects malformed and out-of-range relationships', () => {
    expect(() => importMutashabihat('[]')).toThrow(/expected an object/);
    expect(() => importMutashabihat('{"x":[]}')).toThrow(/invalid group/);
    expect(() => importMutashabihat('{"1":[{"src":{"ayah":0},"muts":[{"ayah":1}]}]}')).toThrow(
      /out of range/,
    );
    expect(() => importMutashabihat('{"1":[{"src":{"ayah":[1,3]},"muts":[{"ayah":4}]}]}')).toThrow(
      /consecutive/,
    );
    expect(() => importMutashabihat('{"1":[{"src":{"ayah":1},"muts":[]}]}')).toThrow(
      /nonempty array/,
    );
  });

  it('deduplicates repeated edges and source-range members deterministically', () => {
    const data = importMutashabihat(
      '{"1":[{"src":{"ayah":[1,1,2]},"muts":[{"ayah":10},{"ayah":10}]}]}',
    );
    expect(data.duplicateCount).toBe(1);
    expect(data.repeatedRangeMemberCount).toBe(1);
    expect(data.links).toHaveLength(1);
    expect(data.links[0]?.source).toEqual({ start: 0, end: 1 });
  });
});
