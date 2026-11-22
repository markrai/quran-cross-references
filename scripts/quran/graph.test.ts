import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildQuranArcGeometry, selectQuranRelationshipIds } from '../../src/core/quran/graph-adapters.ts';
import { QuranRelationshipIndex } from '../../src/core/quran/relationship-index.ts';
import { importMutashabihat } from './datasets.ts';

describe('Quran graph integration with pinned Mutashabihat snapshot', () => {
  it('indexes the full curated relationship corpus without losing range membership', () => {
    const raw = readFileSync('data/raw/mutashabiha_data.json', 'utf8');
    const dataset = importMutashabihat(raw);
    const index = new QuranRelationshipIndex(dataset);
    expect(index.linkCount).toBe(2445);
    expect(index.ayahCount).toBe(6236);
    expect([...selectQuranRelationshipIds(index)]).toHaveLength(2445);
    const example = index.outgoing(8).find((link) => link.target.start === 1161);
    expect(example).toBeDefined();
    expect(example?.source).toEqual({ start: 8, end: 8 });
    expect(index.incoming(1161).some((link) => link.id === example?.id)).toBe(true);
    const geometry = buildQuranArcGeometry(index, selectQuranRelationshipIds(index));
    expect(geometry.count).toBe(2445);
    expect(geometry.endpoints.every(Number.isFinite)).toBe(true);
    expect(geometry.contextAfter.every((value) => value >= 0)).toBe(true);
  });
});
