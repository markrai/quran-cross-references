import { describe, expect, it } from 'vitest';
import { QuranRelationshipIndex } from '../core/quran/relationship-index.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import {
  buildQuranTopology,
  curatedNeighborhood,
  topologyNeighbors,
} from './topology-model.ts';
import { verifyQuranTopology } from './topology.ts';

const sha = 'a'.repeat(64);

function fixture() {
  return new QuranRelationshipIndex({
    format: 'quran-similar-passages',
    schemaVersion: 1,
    versification: CANONICAL_QURAN.id,
    sourceRowCount: 4,
    duplicateCount: 0,
    repeatedRangeMemberCount: 0,
    links: [
      { source: { start: 7, end: 7 }, target: { start: 8, end: 8 }, contextAfter: 0 },
      { source: { start: 0, end: 0 }, target: { start: 7, end: 7 }, contextAfter: 0 },
      { source: { start: 8, end: 8 }, target: { start: 293, end: 293 }, contextAfter: 0 },
      { source: { start: 6, end: 8 }, target: { start: 293, end: 294 }, contextAfter: 0 },
    ],
  });
}

describe('Phase 2C.2 curated network topology', () => {
  it('aggregates directed source/target pairs without turning ranges into a clique of ayahs', () => {
    const index = fixture();
    const report = buildQuranTopology(index, sha);
    expect(report).toMatchObject({
      format: 'quran-curated-topology',
      schemaVersion: 1,
      versification: CANONICAL_QURAN.id,
      origin: 'curated',
      sourceSha256: sha,
      linkCount: 4,
      directedPairIncidences: 5,
    });
    expect(report.surahs).toHaveLength(114);
    expect(report.surahs[0]).toEqual({
      surah: 1,
      outgoing: 2,
      incoming: 0,
      touching: 2,
      reciprocal: 0,
    });
    expect(report.surahs[1]).toEqual({
      surah: 2,
      outgoing: 3,
      incoming: 2,
      touching: 4,
      reciprocal: 1,
    });
    expect(report.edges).toEqual([
      { source: 1, target: 2, ids: [1] },
      { source: 1, target: 3, ids: [3] },
      { source: 2, target: 2, ids: [0] },
      { source: 2, target: 3, ids: [2, 3] },
    ]);
    expect(report.topAyahs[0]).toEqual({
      ayah: 7,
      outgoing: 2,
      incoming: 1,
      uniqueLinks: 3,
    });
    expect(report.topAyahs[1]).toEqual({
      ayah: 8,
      outgoing: 2,
      incoming: 1,
      uniqueLinks: 3,
    });
  });

  it('sorts partners deterministically, preserves directions and exposes all original link IDs', () => {
    const report = buildQuranTopology(fixture(), sha);
    expect(topologyNeighbors(report, 2, 'both', 1)).toEqual([
      { surah: 3, incoming: 0, outgoing: 2, ids: [2, 3], strength: 2 },
      { surah: 1, incoming: 1, outgoing: 0, ids: [1], strength: 1 },
    ]);
    expect(topologyNeighbors(report, 2, 'incoming', 1)).toEqual([
      { surah: 1, incoming: 1, outgoing: 0, ids: [1], strength: 1 },
    ]);
    expect(topologyNeighbors(report, 2, 'outgoing', 2)).toEqual([
      { surah: 3, incoming: 0, outgoing: 2, ids: [2, 3], strength: 2 },
    ]);
    expect(topologyNeighbors(report, 114, 'both', 1)).toEqual([]);
    expect(() => topologyNeighbors(report, 0, 'both', 1)).toThrow('surah');
    expect(() => topologyNeighbors(report, 2, 'both', 0)).toThrow('threshold');
  });

  it('expands only a selected page of first-hop evidence into a bounded second hop', () => {
    const index = fixture();
    const single = curatedNeighborhood(index, 0, 'outgoing', 1, 0);
    expect(single.first).toEqual([
      { id: 1, via: 0, neighbor: 7, direction: 'outgoing', hop: 1 },
    ]);
    expect(single.second).toEqual([]);
    expect(single.pages).toBe(1);

    const expanded = curatedNeighborhood(index, 0, 'outgoing', 2, 0);
    expect(expanded.first).toEqual(single.first);
    expect(expanded.second).toEqual([
      { id: 0, via: 7, neighbor: 8, direction: 'outgoing', hop: 2 },
      { id: 3, via: 7, neighbor: 293, direction: 'outgoing', hop: 2 },
    ]);
    expect(expanded.secondCount).toBe(2);
    expect(curatedNeighborhood(index, 8, 'incoming', 1, 0).first).toEqual([
      { id: 0, via: 8, neighbor: 7, direction: 'incoming', hop: 1 },
    ]);
    expect(() => curatedNeighborhood(index, -1, 'both', 1, 0)).toThrow('ayah');
    expect(() => curatedNeighborhood(index, 0, 'both', 1, -1)).toThrow('page');
  });

  it('paginates high-degree first-hop nodes and caps second-hop expansion', () => {
    const links = Array.from({ length: 25 }, (_, position) => ({
      source: { start: 0, end: 0 },
      target: { start: 7 + position, end: 7 + position },
      contextAfter: 0,
    }));
    for (let position = 0; position < 25; position += 1) {
      links.push({
        source: { start: 7, end: 7 },
        target: { start: 100 + position, end: 100 + position },
        contextAfter: 0,
      });
    }
    const index = new QuranRelationshipIndex({
      format: 'quran-similar-passages',
      schemaVersion: 1,
      versification: CANONICAL_QURAN.id,
      sourceRowCount: links.length,
      duplicateCount: 0,
      repeatedRangeMemberCount: 0,
      links,
    });
    const first = curatedNeighborhood(index, 0, 'outgoing', 2, 0);
    expect(first.first.length).toBe(12);
    expect(first.firstCount).toBe(25);
    expect(first.pages).toBe(3);
    expect(first.secondCount).toBe(25);
    expect(first.second.length).toBe(24);
    expect(first.second[0]?.hop).toBe(2);
    expect(curatedNeighborhood(index, 0, 'outgoing', 2, 1).first).toHaveLength(12);
    expect(curatedNeighborhood(index, 0, 'outgoing', 2, 2).first).toHaveLength(1);
    expect(curatedNeighborhood(index, 0, 'outgoing', 2, 3).first).toEqual([]);
  });

  it('checks published topology against all actual curated link IDs and provenance', () => {
    const index = fixture();
    const report = buildQuranTopology(index, sha);
    const data = { relationships: index, text: { arabic: [], english: [] } };
    expect(verifyQuranTopology(report, data, sha)).toEqual(report);
    expect(() =>
      verifyQuranTopology({ ...report, directedPairIncidences: 6 }, data, sha),
    ).toThrow('does not match');
    expect(() =>
      verifyQuranTopology(
        {
          ...report,
          edges: [{ source: 1, target: 3, ids: [999] }],
        },
        data,
        sha,
      ),
    ).toThrow('does not match');
    expect(() => verifyQuranTopology(report, data, 'b'.repeat(64))).toThrow('does not match');
    expect(() => buildQuranTopology(index, 'not-a-digest')).toThrow('SHA-256');
  });
});
