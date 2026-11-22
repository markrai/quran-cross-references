import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildQuranArcGeometry,
  selectQuranRelationshipIds,
} from '../../src/core/quran/graph-adapters.ts';
import { QuranRelationshipIndex } from '../../src/core/quran/relationship-index.ts';
import {
  createCuratedRelationshipEvidence,
  QuranRelationshipEvidenceIndex,
  type QuranEvidenceSource,
} from '../../src/core/quran/relationship-evidence.ts';
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

  it('classifies all 2,445 pinned relationships without changing existing IDs or source ranges', () => {
    const raw = readFileSync('data/raw/mutashabiha_data.json', 'utf8');
    const sourceManifest = JSON.parse(readFileSync('data/quran/sources.json', 'utf8')) as {
      readonly sources: readonly QuranEvidenceSource[];
    };
    const source = sourceManifest.sources.find((entry) => entry.id === 'mutashabihat');
    if (!source) throw new Error('Pinned curated source is unavailable');
    const index = new QuranRelationshipIndex(importMutashabihat(raw));
    const dataset = createCuratedRelationshipEvidence(index, source);
    const evidence = new QuranRelationshipEvidenceIndex(dataset, index, source);
    expect(evidence.count).toBe(2445);
    expect(dataset.relationships.map((entry) => entry.stableId)).toHaveLength(2445);
    expect(new Set(dataset.relationships.map((entry) => entry.stableId)).size).toBe(2445);
    expect(dataset.relationships.every((entry, id) => entry.legacyId === id)).toBe(true);
    expect(evidence.byLegacyId(0).evidence).toEqual([
      { kind: 'curated-reference', sourceId: 'mutashabihat' },
    ]);
    const example = index.outgoing(8).find((link) => link.target.start === 1161);
    expect(example).toBeDefined();
    if (!example) throw new Error('Known pinned relationship is missing');
    expect(evidence.forLink(example).stableId).toBe('curated:mutashabihat:8-8:1161-1161');
    expect(source.sha256).toBe('785d5efa266a19c405a449b0a01ebf34fe7dc09836d5b6ef301eae874db780f0');
  });
});
