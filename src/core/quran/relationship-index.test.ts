import { describe, expect, it } from 'vitest';
import {
  buildQuranArcGeometry,
  collectQuranConnections,
  selectQuranRelationshipIds,
} from './graph-adapters.ts';
import {
  passesQuranRelationshipFilter,
  relationshipWithinSurah,
  type QuranRelationshipFilter,
} from './relationship-filter.ts';
import { QuranRelationshipIndex, QuranRelationshipIntegrityError } from './relationship-index.ts';

const DATA = {
  format: 'quran-similar-passages',
  schemaVersion: 1,
  versification: 'hafs-kufan-6236',
  sourceRowCount: 5,
  duplicateCount: 0,
  repeatedRangeMemberCount: 0,
  links: [
    { source: { start: 0, end: 2 }, target: { start: 7, end: 9 }, contextAfter: 0 },
    { source: { start: 1, end: 1 }, target: { start: 2, end: 3 }, contextAfter: 2 },
    { source: { start: 7, end: 8 }, target: { start: 8, end: 10 }, contextAfter: 1 },
    { source: { start: 8, end: 8 }, target: { start: 1, end: 2 }, contextAfter: 0 },
    { source: { start: 292, end: 293 }, target: { start: 0, end: 0 }, contextAfter: 0 },
  ],
} as const;

const makeIndex = () => new QuranRelationshipIndex(DATA);
const ids = (links: readonly { readonly id: number }[]) => links.map((link) => link.id);

describe('QuranRelationshipIndex', () => {
  it('indexes every member of both endpoint ranges and preserves source order', () => {
    const index = makeIndex();
    expect(index.ayahCount).toBe(6236);
    expect(index.linkCount).toBe(5);
    expect(ids(index.outgoing(1))).toEqual([0, 1]);
    expect(ids(index.outgoing(2))).toEqual([0]);
    expect(ids(index.outgoing(293))).toEqual([4]);
    expect(ids(index.incoming(2))).toEqual([1, 3]);
    expect(ids(index.incoming(8))).toEqual([0, 2]);
    expect(ids(index.incoming(9))).toEqual([0, 2]);
    expect(ids(index.incoming(10))).toEqual([2]);
    expect(index.outgoingCount(1)).toBe(2);
    expect(index.incomingCount(2)).toBe(2);
    expect(index.outgoing(500)).toEqual([]);
    expect(index.incomingCount(500)).toBe(0);
    expect(index.link(1)).toEqual({ id: 1, ...DATA.links[1] });
  });

  it('deduplicates links for range queries, not individual ayah memberships', () => {
    const index = makeIndex();
    expect(ids(index.outgoingInRange({ start: 0, end: 2 }))).toEqual([0, 1]);
    expect(ids(index.incomingInRange({ start: 0, end: 2 }))).toEqual([1, 3, 4]);
    expect(ids(index.outgoingInRange({ start: 7, end: 9 }))).toEqual([2, 3]);
    expect(ids(index.incomingInRange({ start: 7, end: 9 }))).toEqual([0, 2]);
    expect(ids(index.outgoingInRange({ start: 293, end: 293 }))).toEqual([4]);
  });

  it('rejects invalid lookup positions and reversed ranges', () => {
    const index = makeIndex();
    expect(() => index.link(-1)).toThrow(RangeError);
    expect(() => index.link(5)).toThrow(RangeError);
    expect(() => index.link(1.5)).toThrow(RangeError);
    expect(() => index.outgoing(-1)).toThrow(RangeError);
    expect(() => index.incoming(6236)).toThrow(RangeError);
    expect(() => index.outgoingCount(1.5)).toThrow(RangeError);
    expect(() => index.incomingCount(-1)).toThrow(RangeError);
    expect(() => index.outgoingInRange({ start: 2, end: 1 })).toThrow(RangeError);
    expect(() => index.incomingInRange({ start: 0, end: 6236 })).toThrow(RangeError);
  });

  it('rejects malformed, unsafe, mismatched, and duplicate relationships', () => {
    expect(() => new QuranRelationshipIndex(null)).toThrow(QuranRelationshipIntegrityError);
    expect(() => new QuranRelationshipIndex({ ...DATA, format: 'cross-references' })).toThrow(
      'unknown format',
    );
    expect(() => new QuranRelationshipIndex({ ...DATA, schemaVersion: 2 })).toThrow(
      'unknown format',
    );
    expect(() => new QuranRelationshipIndex({ ...DATA, versification: 'other' })).toThrow(
      'versification',
    );
    expect(() => new QuranRelationshipIndex({ ...DATA, duplicateCount: -1 })).toThrow(
      'duplicateCount',
    );
    expect(() => new QuranRelationshipIndex({ ...DATA, repeatedRangeMemberCount: 1.5 })).toThrow(
      'repeatedRangeMemberCount',
    );
    expect(() => new QuranRelationshipIndex({ ...DATA, sourceRowCount: NaN })).toThrow(
      'sourceRowCount',
    );
    expect(() => new QuranRelationshipIndex({ ...DATA, links: null })).toThrow('links');
    expect(() => new QuranRelationshipIndex({ ...DATA, links: [null] })).toThrow('links[0]');
    expect(
      () =>
        new QuranRelationshipIndex({
          ...DATA,
          links: [
            { source: { start: 0, end: 6236 }, target: { start: 0, end: 0 }, contextAfter: 0 },
          ],
        }),
    ).toThrow('canonical ayah boundaries');
    expect(
      () =>
        new QuranRelationshipIndex({
          ...DATA,
          links: [{ source: { start: 3, end: 2 }, target: { start: 0, end: 0 }, contextAfter: 0 }],
        }),
    ).toThrow('canonical ayah boundaries');
    expect(
      () =>
        new QuranRelationshipIndex({
          ...DATA,
          links: [{ source: { start: -1, end: 0 }, target: { start: 0, end: 0 }, contextAfter: 0 }],
        }),
    ).toThrow('nonnegative integer');
    expect(
      () =>
        new QuranRelationshipIndex({
          ...DATA,
          links: [{ source: { start: 0, end: 0 }, target: { start: 0, end: 0 }, contextAfter: -1 }],
        }),
    ).toThrow('contextAfter');
    expect(
      () => new QuranRelationshipIndex({ ...DATA, links: [...DATA.links, DATA.links[0]] }),
    ).toThrow('duplicates');
  });

  it('supports empty datasets without inventing relationships', () => {
    const index = new QuranRelationshipIndex({ ...DATA, links: [], sourceRowCount: 0 });
    expect(index.linkCount).toBe(0);
    expect(index.outgoing(0)).toEqual([]);
    expect(index.incomingInRange({ start: 0, end: 6235 })).toEqual([]);
    expect(selectQuranRelationshipIds(index)).toEqual(new Int32Array());
  });
});

describe('Quran-specific filtering and rendering adapters', () => {
  it('separates entirely intra-surah relationships from crossing or inter-surah ones', () => {
    const index = makeIndex();
    expect(relationshipWithinSurah(index.link(1))).toBe(true);
    expect(relationshipWithinSurah(index.link(2))).toBe(true);
    expect(relationshipWithinSurah(index.link(0))).toBe(false);
    expect(relationshipWithinSurah(index.link(4))).toBe(false);

    const same: QuranRelationshipFilter = { scope: 'same-surah', surahs: null };
    const cross: QuranRelationshipFilter = { scope: 'cross-surah', surahs: null };
    expect([...selectQuranRelationshipIds(index, same)]).toEqual([1, 2]);
    expect([...selectQuranRelationshipIds(index, cross)]).toEqual([0, 3, 4]);
    expect(passesQuranRelationshipFilter(index.link(0), same)).toBe(false);
    expect(passesQuranRelationshipFilter(index.link(1), same)).toBe(true);
  });

  it('filters by either endpoint, including ranges that cross surah boundaries', () => {
    const index = makeIndex();
    expect([...selectQuranRelationshipIds(index, { scope: 'all', surahs: new Set([2]) })]).toEqual([
      0, 2, 3, 4,
    ]);
    expect([...selectQuranRelationshipIds(index, { scope: 'all', surahs: new Set([3]) })]).toEqual([
      4,
    ]);
    expect([
      ...selectQuranRelationshipIds(index, { scope: 'cross-surah', surahs: new Set([1]) }),
    ]).toEqual([0, 3, 4]);
    expect([...selectQuranRelationshipIds(index, { scope: 'all', surahs: new Set() })]).toEqual([]);
  });

  it('produces deterministic midpoint arc coordinates without vote-based weights', () => {
    const index = makeIndex();
    const geometry = buildQuranArcGeometry(index, new Int32Array([0, 4]));
    expect(geometry.count).toBe(2);
    expect([...geometry.linkIds]).toEqual([0, 4]);
    expect([...geometry.endpoints]).toEqual([1.5, 8.5, 293, 0.5]);
    expect([...geometry.contextAfter]).toEqual([0, 0]);
    expect(geometry).not.toHaveProperty('votes');
    expect(geometry).not.toHaveProperty('weights');
    expect(() => buildQuranArcGeometry(index, [99])).toThrow(RangeError);
  });

  it('collects clipped passage connections only once per direction', () => {
    const index = makeIndex();
    const connections = collectQuranConnections(index, { start: 1, end: 2 });
    expect(ids(connections.outgoing.map(({ link }) => link))).toEqual([1, 0]);
    expect(ids(connections.incoming.map(({ link }) => link))).toEqual([1, 3]);
    expect(connections.outgoing[1]).toMatchObject({
      direction: 'outgoing',
      here: { start: 1, end: 2 },
      other: { start: 7, end: 9 },
    });
    expect(connections.incoming[0]).toMatchObject({
      direction: 'incoming',
      here: { start: 2, end: 2 },
      other: { start: 1, end: 1 },
    });
    expect(connections.incoming[1]).toMatchObject({
      here: { start: 1, end: 2 },
      other: { start: 8, end: 8 },
    });
    const filtered = collectQuranConnections(
      index,
      { start: 1, end: 2 },
      {
        scope: 'same-surah',
        surahs: null,
      },
    );
    expect(ids(filtered.outgoing.map(({ link }) => link))).toEqual([1]);
    expect(ids(filtered.incoming.map(({ link }) => link))).toEqual([1]);
  });
});
