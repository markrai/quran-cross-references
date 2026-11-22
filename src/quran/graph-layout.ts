import { elementAt } from '../core/lib/array.ts';
import type { AyahIndexRange } from '../core/quran/quran-versification.ts';
import { formatIndexRange } from '../core/quran/reference.ts';
import type { QuranArcGeometry } from '../core/quran/graph-adapters.ts';
import type { QuranRelationshipIndex } from '../core/quran/relationship-index.ts';
import { GRAPH_AXIS_Y, graphXOfAyah } from './graph-viewport.ts';

export interface QuranGraphArc {
  readonly id: number;
  readonly source: AyahIndexRange;
  readonly target: AyahIndexRange;
  readonly left: number;
  readonly right: number;
  readonly path: string;
  readonly label: string;
}

export function rangesOverlap(a: AyahIndexRange, b: AyahIndexRange): boolean {
  return a.start <= b.end && b.start <= a.end;
}

export function arcTouchesRange(arc: QuranGraphArc, range: AyahIndexRange): boolean {
  return rangesOverlap(arc.source, range) || rangesOverlap(arc.target, range);
}

export function arcVisibleInViewport(
  arc: QuranGraphArc,
  viewport: { readonly x: number; readonly width: number },
): boolean {
  return arc.right >= viewport.x && arc.left <= viewport.x + viewport.width;
}

export function buildQuranGraphPaths(
  index: QuranRelationshipIndex,
  geometry: QuranArcGeometry,
): readonly QuranGraphArc[] {
  return Array.from(geometry.linkIds, (id, position) => {
    const source = elementAt(geometry.endpoints, position * 2);
    const target = elementAt(geometry.endpoints, position * 2 + 1);
    const x1 = graphXOfAyah(source, index.ayahCount);
    const x2 = graphXOfAyah(target, index.ayahCount);
    const distance = Math.abs(x2 - x1);
    const peak = Math.min(325, Math.max(30, Math.sqrt(distance) * 14));
    const link = index.link(id);
    const sourceLabel = formatIndexRange(
      index.versification,
      link.source.start,
      link.source.end,
    );
    const targetLabel = formatIndexRange(
      index.versification,
      link.target.start,
      link.target.end,
    );
    return {
      id,
      source: link.source,
      target: link.target,
      left: Math.min(x1, x2),
      right: Math.max(x1, x2),
      path: `M ${x1} ${GRAPH_AXIS_Y} Q ${(x1 + x2) / 2} ${GRAPH_AXIS_Y - peak * 2} ${x2} ${GRAPH_AXIS_Y}`,
      label: sourceLabel + ' to ' + targetLabel,
    };
  });
}
