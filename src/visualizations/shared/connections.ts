import type { SurahNumber } from '../../core/quran/surahs.ts';
import type { AyahIndex } from '../../core/quran/ayah-ref.ts';
import type { AyahIndexRange, QuranVersification } from '../../core/quran/quran-versification.ts';
import type {
  CrossReferenceIndex,
  CrossReferenceLink,
} from '../../cross-references/cross-reference-index.ts';
import { compileLinkFilter, type LinkFilter } from './link-filter.ts';

export type LinkDirection = 'outgoing' | 'incoming';

/** A link seen from a passage: where its other end is. */
export interface Connection {
  readonly link: CrossReferenceLink;
  readonly direction: LinkDirection;
  /** The ayah inside the passage. */
  readonly here: AyahIndex;
  /** The other end: the target range (outgoing) or the source ayah (incoming). */
  readonly otherStart: AyahIndex;
  readonly otherEnd: AyahIndex;
}

export interface PassageConnections {
  /** Links from ayahs of the passage (what the passage references). */
  readonly outgoing: readonly Connection[];
  /** Links into ayahs of the passage (what references the passage). */
  readonly incoming: readonly Connection[];
}

function byOtherEnd(a: Connection, b: Connection): number {
  return a.otherStart - b.otherStart || a.otherEnd - b.otherEnd || a.here - b.here;
}

/** All connections of a ayah range, filtered, each list sorted by where the other end is. */
export function collectConnections(
  index: CrossReferenceIndex,
  range: AyahIndexRange,
  filter: LinkFilter,
  verseGenres: Uint8Array,
): PassageConnections {
  const passes = compileLinkFilter(filter, verseGenres);
  const outgoing: Connection[] = [];
  const incoming: Connection[] = [];
  const seenIncoming = new Set<number>();

  for (let ayah = range.start; ayah <= range.end; ayah += 1) {
    for (const link of index.outgoing(ayah)) {
      if (passes(link.from, link.targetStart, link.votes)) {
        outgoing.push({
          link,
          direction: 'outgoing',
          here: ayah,
          otherStart: link.targetStart,
          otherEnd: link.targetEnd,
        });
      }
    }
    for (const link of index.incoming(ayah)) {
      // A link to a range spanning several ayahs of the passage is counted once.
      if (seenIncoming.has(link.id)) {
        continue;
      }
      seenIncoming.add(link.id);
      if (passes(link.from, link.targetStart, link.votes)) {
        incoming.push({
          link,
          direction: 'incoming',
          here: ayah,
          otherStart: link.from,
          otherEnd: link.from,
        });
      }
    }
  }

  return {
    outgoing: outgoing.sort(byOtherEnd),
    incoming: incoming.sort(byOtherEnd),
  };
}

export interface BookGroup {
  readonly surah: SurahNumber;
  readonly connections: readonly Connection[];
}

/**
 * Where a connection meets the passage, when its reference alone doesn't say, or `null`:
 * - a link into several ayahs names them all, since it's listed under each of them (Matthew
 *   24:37 points to all of Genesis 6:1–7, not to 6:1 alone);
 * - in a surah, every other link names the surah's ayah it starts or lands on.
 */
export type LandingNote =
  | { readonly kind: 'range'; readonly start: AyahIndex; readonly end: AyahIndex }
  | { readonly kind: 'from-ayah'; readonly ayah: number }
  | { readonly kind: 'to-ayah'; readonly ayah: number };

export function landingNote(
  connection: Connection,
  versification: QuranVersification,
  inChapter: boolean,
): LandingNote | null {
  const { link, direction } = connection;
  if (direction === 'incoming' && link.targetEnd !== link.targetStart) {
    return { kind: 'range', start: link.targetStart, end: link.targetEnd };
  }
  if (!inChapter) {
    return null;
  }
  const ayah = versification.refAt(connection.here).ayah;
  return direction === 'outgoing' ? { kind: 'from-ayah', ayah } : { kind: 'to-ayah', ayah };
}

/** Groups connections (already sorted by their other end) by the surah of the other end. */
export function groupByBook(
  connections: readonly Connection[],
  versification: QuranVersification,
): BookGroup[] {
  const groups: { surah: SurahNumber; connections: Connection[] }[] = [];
  for (const connection of connections) {
    const surah = versification.surahAt(connection.otherStart).id;
    const last = groups.at(-1);
    if (last?.surah === surah) {
      last.connections.push(connection);
    } else {
      groups.push({ surah, connections: [connection] });
    }
  }
  return groups;
}

/** Unique IDs of the links behind a set of connections (outgoing and incoming together). */
export function connectionLinkIds(connections: PassageConnections): number[] {
  const ids = new Set<number>();
  for (const connection of [...connections.outgoing, ...connections.incoming]) {
    ids.add(connection.link.id);
  }
  return [...ids];
}
