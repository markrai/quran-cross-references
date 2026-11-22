import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QuranRelationshipIndex } from '../../src/core/quran/relationship-index.ts';
import { importMutashabihat } from './datasets.ts';
import { buildQuranTopology } from '../../src/quran/topology-model.ts';

describe('pinned full-corpus curated topology', () => {
  it('is deterministic and preserves exactly 2,445 curated relationship IDs', () => {
    const sources = JSON.parse(readFileSync('data/quran/sources.json', 'utf8')) as {
      readonly sources: readonly { readonly id: string; readonly sha256: string }[];
    };
    const curated = sources.sources.find((source) => source.id === 'mutashabihat');
    if (!curated) throw new Error('Pinned curated source missing.');
    const index = new QuranRelationshipIndex(
      importMutashabihat(readFileSync('data/raw/mutashabiha_data.json', 'utf8')),
    );
    const first = buildQuranTopology(index, curated.sha256);
    const second = buildQuranTopology(index, curated.sha256);
    expect(first.linkCount).toBe(2445);
    expect(first.surahs).toHaveLength(114);
    expect(first.topAyahs).toHaveLength(32);
    expect(first.directedPairIncidences).toBeGreaterThanOrEqual(2445);
    expect(first.edges.reduce((total, edge) => total + edge.ids.length, 0)).toBe(
      first.directedPairIncidences,
    );
    for (const edge of first.edges) {
      expect(edge.source).toBeGreaterThanOrEqual(1);
      expect(edge.target).toBeLessThanOrEqual(114);
      expect(edge.ids).toEqual([...edge.ids].sort((a, b) => a - b));
      for (const id of edge.ids) {
        expect(id).toBeGreaterThanOrEqual(0);
        expect(id).toBeLessThan(2445);
      }
    }
    expect(
      createHash('sha256').update(JSON.stringify(first)).digest('hex'),
    ).toBe(createHash('sha256').update(JSON.stringify(second)).digest('hex'));
  });
});
