import { describe, expect, it } from 'vitest';
import { elementAt } from '../core/lib/array.ts';
import { buildQuranArcGeometry, selectQuranRelationshipIds } from '../core/quran/graph-adapters.ts';
import { QuranRelationshipIndex } from '../core/quran/relationship-index.ts';
import {
  arcTouchesRange,
  arcVisibleInViewport,
  buildQuranGraphPaths,
  rangesOverlap,
} from './graph-layout.ts';

const index = new QuranRelationshipIndex({
  format: 'quran-similar-passages',
  schemaVersion: 1,
  versification: 'hafs-kufan-6236',
  sourceRowCount: 2,
  duplicateCount: 0,
  repeatedRangeMemberCount: 0,
  links: [
    { source: { start: 7, end: 8 }, target: { start: 261, end: 261 }, contextAfter: 0 },
    { source: { start: 6000, end: 6001 }, target: { start: 7, end: 7 }, contextAfter: 2 },
  ],
});

describe('Quran graph layout and focused passages', () => {
  const selected = selectQuranRelationshipIds(index);
  const arcs = buildQuranGraphPaths(index, buildQuranArcGeometry(index, selected));
  const first = elementAt(arcs, 0);
  const second = elementAt(arcs, 1);

  it('creates stable labeled paths for the selected relationship index', () => {
    expect(arcs).toHaveLength(2);
    expect(first.id).toBe(0);
    expect(first.label).toContain('Al-Baqarah 2:1–2 to Al-Baqarah 2:255');
    expect(first.path).toContain(' Q ');
    expect(second.left).toBeLessThan(second.right);
  });

  it('includes both directed endpoints and range members in focus matching', () => {
    expect(arcs.every((arc) => arcTouchesRange(arc, { start: 7, end: 7 }))).toBe(true);
    expect(arcTouchesRange(first, { start: 8, end: 8 })).toBe(true);
    expect(arcTouchesRange(second, { start: 261, end: 261 })).toBe(false);
    expect(rangesOverlap({ start: 10, end: 13 }, { start: 13, end: 14 })).toBe(true);
    expect(rangesOverlap({ start: 10, end: 13 }, { start: 14, end: 15 })).toBe(false);
  });

  it('culls paths only when both endpoints are outside the viewport on one side', () => {
    const spanning = second;
    expect(arcVisibleInViewport(spanning, { x: 450, width: 100 })).toBe(true);
    expect(arcVisibleInViewport(first, { x: 900, width: 100 })).toBe(false);
    expect(arcVisibleInViewport(first, { x: -100, width: 100 })).toBe(false);
    expect(arcVisibleInViewport(arcs[0]!, { x: 0, width: 1200 })).toBe(true);
  });
});
