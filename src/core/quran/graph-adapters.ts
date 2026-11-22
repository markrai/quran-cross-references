import { elementAt } from '../lib/array.ts';
import type { AyahIndexRange } from './quran-versification.ts';
import {
  DEFAULT_QURAN_RELATIONSHIP_FILTER,
  passesQuranRelationshipFilter,
  type QuranRelationshipFilter,
} from './relationship-filter.ts';
import type { QuranRelationship } from './relationship-index.ts';
import { QuranRelationshipIndex } from './relationship-index.ts';

export interface QuranConnection {
  readonly link: QuranRelationship;
  readonly direction: 'outgoing' | 'incoming';
  readonly here: AyahIndexRange;
  readonly other: AyahIndexRange;
}

export interface QuranPassageConnections {
  readonly outgoing: readonly QuranConnection[];
  readonly incoming: readonly QuranConnection[];
}

export interface QuranArcGeometry {
  readonly count: number;
  readonly linkIds: Int32Array;
  readonly endpoints: Float32Array;
  readonly contextAfter: Int32Array;
}

export function selectQuranRelationshipIds(
  index: QuranRelationshipIndex,
  filter: QuranRelationshipFilter = DEFAULT_QURAN_RELATIONSHIP_FILTER,
): Int32Array {
  const ids = new Int32Array(index.linkCount);
  let count = 0;
  for (let id = 0; id < index.linkCount; id += 1) {
    if (passesQuranRelationshipFilter(index.link(id), filter, index.versification)) {
      ids[count] = id;
      count += 1;
    }
  }
  return ids.slice(0, count);
}

export function buildQuranArcGeometry(
  index: QuranRelationshipIndex,
  selectedIds: ArrayLike<number>,
): QuranArcGeometry {
  const count = selectedIds.length;
  const linkIds = new Int32Array(count);
  const endpoints = new Float32Array(count * 2);
  const contextAfter = new Int32Array(count);
  for (let position = 0; position < count; position += 1) {
    const id = elementAt(selectedIds, position);
    const link = index.link(id);
    linkIds[position] = id;
    endpoints[position * 2] = (link.source.start + link.source.end + 1) / 2;
    endpoints[position * 2 + 1] = (link.target.start + link.target.end + 1) / 2;
    contextAfter[position] = link.contextAfter;
  }
  return { count, linkIds, endpoints, contextAfter };
}

function clipped(range: AyahIndexRange, selected: AyahIndexRange): AyahIndexRange {
  return {
    start: Math.max(range.start, selected.start),
    end: Math.min(range.end, selected.end),
  };
}

function byOther(a: QuranConnection, b: QuranConnection): number {
  return a.other.start - b.other.start || a.other.end - b.other.end || a.link.id - b.link.id;
}

export function collectQuranConnections(
  index: QuranRelationshipIndex,
  range: AyahIndexRange,
  filter: QuranRelationshipFilter = DEFAULT_QURAN_RELATIONSHIP_FILTER,
): QuranPassageConnections {
  const visible = (link: QuranRelationship) =>
    passesQuranRelationshipFilter(link, filter, index.versification);
  const outgoing: QuranConnection[] = index
    .outgoingInRange(range)
    .filter(visible)
    .map((link) => ({
      link,
      direction: 'outgoing',
      here: clipped(link.source, range),
      other: link.target,
    }));
  const incoming: QuranConnection[] = index
    .incomingInRange(range)
    .filter(visible)
    .map((link) => ({
      link,
      direction: 'incoming',
      here: clipped(link.target, range),
      other: link.source,
    }));
  return { outgoing: outgoing.sort(byOther), incoming: incoming.sort(byOther) };
}
