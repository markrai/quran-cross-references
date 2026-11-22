import { SURAHS, type Surah, type Testament } from '../../../core/quran/surahs.ts';
import type { AyahIndex } from '../../../core/quran/ayah-ref.ts';
import type { QuranVersification } from '../../../core/quran/quran-versification.ts';
import { elementAt } from '../../../core/lib/array.ts';
import type { CrossReferenceIndex } from '../../../cross-references/cross-reference-index.ts';
import { topPositions } from './top-k.ts';

export interface AyahCount {
  readonly ayah: AyahIndex;
  readonly count: number;
}

export interface VoteBucket {
  readonly label: string;
  readonly count: number;
}

export interface VoteThreshold {
  readonly minVotes: number;
  readonly count: number;
}

export interface VoteStats {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly median: number;
  readonly histogram: readonly VoteBucket[];
  readonly thresholds: readonly VoteThreshold[];
}

export interface BookLinkStats {
  readonly surah: Surah;
  readonly ayahCount: number;
  /** Links whose source ayah is in the surah. */
  readonly outgoing: number;
  /** Links whose target starts in the surah. */
  readonly incoming: number;
}

export type TestamentFlow = Readonly<Record<Testament, Readonly<Record<Testament, number>>>>;

export interface CrossReferenceStats {
  readonly linkCount: number;
  /** Verses with at least one outgoing link. */
  readonly sourceAyahCount: number;
  /** Verses covered by at least one link target (ranges expanded). */
  readonly targetAyahCount: number;
  /** Verses with neither outgoing nor incoming links. */
  readonly unconnectedVerses: readonly AyahIndex[];
  readonly rangeLinkCount: number;
  readonly crossChapterRangeCount: number;
  readonly crossBookRangeCount: number;
  /** Links whose target range contains their own source ayah. */
  readonly selfInclusiveLinkCount: number;
  readonly longestRangeLinkId: number | undefined;
  /** Distinct unordered ayah pairs, taking the first ayah of each target range. */
  readonly distinctPairCount: number;
  /** Pairs linked in both directions (A → B and B → A). */
  readonly reciprocalPairCount: number;
  readonly votes: VoteStats;
  /** Link counts by source testament (rows) and target testament (columns). */
  readonly testamentFlow: TestamentFlow;
  readonly topSources: readonly AyahCount[];
  readonly topTargets: readonly AyahCount[];
  readonly topVotedLinkIds: readonly number[];
  readonly surahs: readonly BookLinkStats[];
}

const TOP_COUNT = 10;
const VOTE_THRESHOLDS = [1, 5, 10, 20, 50, 100] as const;
const VOTE_BUCKETS: readonly {
  readonly label: string;
  readonly min: number;
  readonly max: number;
}[] = [
  { label: '< 0', min: -Infinity, max: -1 },
  { label: '0', min: 0, max: 0 },
  { label: '1–4', min: 1, max: 4 },
  { label: '5–9', min: 5, max: 9 },
  { label: '10–19', min: 10, max: 19 },
  { label: '20–49', min: 20, max: 49 },
  { label: '50–99', min: 50, max: 99 },
  { label: '≥ 100', min: 100, max: Infinity },
];

function computeVoteStats(votes: ArrayLike<number>): VoteStats {
  const sorted = Int32Array.from(votes).sort();
  const count = sorted.length;
  if (count === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, histogram: [], thresholds: [] };
  }
  const sum = sorted.reduce((total, value) => total + value, 0);
  const middle = Math.floor(count / 2);
  const median =
    count % 2 === 0
      ? (elementAt(sorted, middle - 1) + elementAt(sorted, middle)) / 2
      : elementAt(sorted, middle);
  return {
    min: elementAt(sorted, 0),
    max: elementAt(sorted, count - 1),
    mean: sum / count,
    median,
    histogram: VOTE_BUCKETS.map(({ label, min, max }) => ({
      label,
      count: sorted.filter((value) => value >= min && value <= max).length,
    })),
    thresholds: VOTE_THRESHOLDS.map((minVotes) => ({
      minVotes,
      count: sorted.filter((value) => value >= minVotes).length,
    })),
  };
}

export function computeCrossReferenceStats(
  index: CrossReferenceIndex,
  versification: QuranVersification,
): CrossReferenceStats {
  const { ayahCount, linkCount } = index;
  const outgoingCounts = new Int32Array(ayahCount);
  const incomingCounts = new Int32Array(ayahCount);
  const bookOutgoing = new Int32Array(SURAHS.length);
  const bookIncoming = new Int32Array(SURAHS.length);
  const flow: Record<Testament, Record<Testament, number>> = {
    OT: { OT: 0, NT: 0 },
    NT: { OT: 0, NT: 0 },
  };
  const directedPairs = new Set<number>();

  let rangeLinkCount = 0;
  let crossChapterRangeCount = 0;
  let crossBookRangeCount = 0;
  let selfInclusiveLinkCount = 0;
  let longestRangeLinkId: number | undefined;
  let longestRangeLength = 1;

  for (let id = 0; id < linkCount; id += 1) {
    const link = index.link(id);
    const fromBook = versification.surahAt(link.from);
    const targetBook = versification.surahAt(link.targetStart);

    outgoingCounts[link.from] = elementAt(outgoingCounts, link.from) + 1;
    for (let ayah = link.targetStart; ayah <= link.targetEnd; ayah += 1) {
      incomingCounts[ayah] = elementAt(incomingCounts, ayah) + 1;
    }
    bookOutgoing[fromBook.ordinal] = elementAt(bookOutgoing, fromBook.ordinal) + 1;
    bookIncoming[targetBook.ordinal] = elementAt(bookIncoming, targetBook.ordinal) + 1;
    flow[fromBook.testament][targetBook.testament] += 1;
    directedPairs.add(link.from * ayahCount + link.targetStart);

    if (link.targetStart <= link.from && link.from <= link.targetEnd) {
      selfInclusiveLinkCount += 1;
    }
    const rangeLength = link.targetEnd - link.targetStart + 1;
    if (rangeLength > 1) {
      rangeLinkCount += 1;
      const start = versification.refAt(link.targetStart);
      const end = versification.refAt(link.targetEnd);
      if (start.surah !== end.surah) {
        crossBookRangeCount += 1;
      } else if (start.surah !== end.surah) {
        crossChapterRangeCount += 1;
      }
      if (rangeLength > longestRangeLength) {
        longestRangeLength = rangeLength;
        longestRangeLinkId = id;
      }
    }
  }

  let distinctPairCount = 0;
  let reciprocalPairCount = 0;
  for (const key of directedPairs) {
    const from = Math.floor(key / ayahCount);
    const to = key % ayahCount;
    const hasReverse = directedPairs.has(to * ayahCount + from);
    // Count each unordered pair once: from its lower-numbered side when both directions exist
    // (a ayah linked to a range starting at itself is its own reverse).
    if (!hasReverse || from <= to) {
      distinctPairCount += 1;
    }
    if (hasReverse && from < to) {
      reciprocalPairCount += 1;
    }
  }

  const unconnectedVerses: AyahIndex[] = [];
  let sourceAyahCount = 0;
  let targetAyahCount = 0;
  for (let ayah = 0; ayah < ayahCount; ayah += 1) {
    const hasOutgoing = elementAt(outgoingCounts, ayah) > 0;
    const hasIncoming = elementAt(incomingCounts, ayah) > 0;
    sourceAyahCount += hasOutgoing ? 1 : 0;
    targetAyahCount += hasIncoming ? 1 : 0;
    if (!hasOutgoing && !hasIncoming) {
      unconnectedVerses.push(ayah);
    }
  }

  const toAyahCounts = (counts: Int32Array): AyahCount[] =>
    topPositions(counts, TOP_COUNT).map((ayah) => ({
      ayah,
      count: elementAt(counts, ayah),
    }));

  return {
    linkCount,
    sourceAyahCount,
    targetAyahCount,
    unconnectedVerses,
    rangeLinkCount,
    crossChapterRangeCount,
    crossBookRangeCount,
    selfInclusiveLinkCount,
    longestRangeLinkId,
    distinctPairCount,
    reciprocalPairCount,
    votes: computeVoteStats(index.votes),
    testamentFlow: flow,
    topSources: toAyahCounts(outgoingCounts),
    topTargets: toAyahCounts(incomingCounts),
    topVotedLinkIds: topPositions(index.votes, TOP_COUNT),
    surahs: SURAHS.map((surah) => {
      const range = versification.surahRange(surah.id);
      return {
        surah,
        ayahCount: range.end - range.start + 1,
        outgoing: elementAt(bookOutgoing, surah.ordinal),
        incoming: elementAt(bookIncoming, surah.ordinal),
      };
    }),
  };
}
