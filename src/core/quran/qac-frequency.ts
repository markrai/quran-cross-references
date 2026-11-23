import type { QacMorphologyIndex } from './qac-index.ts';
import type { QacGrouping, QacOccurrence } from './qac-types.ts';
import { CANONICAL_QURAN } from './quran-versification.ts';

type QacFrequencySource = Pick<QacMorphologyIndex, 'wordCount' | 'terms' | 'occurrences'>;

export interface QacFrequencyFamily {
  readonly term: string;
  readonly words: number;
  readonly ayahs: number;
  readonly surahs: number;
}

export interface QacFrequencyReport {
  readonly grouping: QacGrouping;
  readonly totalWords: number;
  readonly annotatedWords: number;
  readonly families: readonly QacFrequencyFamily[];
  readonly cumulativeWords: readonly number[];
}

export interface QacFrequencyCoverage {
  readonly families: number;
  readonly words: number;
  readonly percent: number;
}

export interface QacSurahFrequency {
  readonly surah: number;
  readonly words: number;
  readonly ayahs: number;
}

export const QAC_COVERAGE_SIZES = [10, 25, 50, 100, 250] as const;

function positionKey(site: QacOccurrence): string {
  if (
    !CANONICAL_QURAN.isValidIndex(site.ayah) ||
    !Number.isInteger(site.word) ||
    site.word < 0 ||
    site.word >= 300
  ) {
    throw new RangeError('Invalid canonical QAC word position.');
  }
  return String(site.ayah) + ':' + String(site.word);
}

function compareTerms(a: QacFrequencyFamily, b: QacFrequencyFamily): number {
  if (a.words !== b.words) return b.words - a.words;
  return a.term < b.term ? -1 : a.term > b.term ? 1 : 0;
}

export function buildQacFrequencyReport(
  index: QacFrequencySource,
  grouping: QacGrouping,
): QacFrequencyReport {
  const families = index.terms(grouping).map((term) => {
    const words = new Set<string>();
    const ayahs = new Set<number>();
    const surahs = new Set<number>();
    for (const site of index.occurrences(grouping, term)) {
      words.add(positionKey(site));
      ayahs.add(site.ayah);
      surahs.add(CANONICAL_QURAN.refAt(site.ayah).surah);
    }
    return { term, words: words.size, ayahs: ayahs.size, surahs: surahs.size };
  });
  families.sort(compareTerms);

  const covered = new Set<string>();
  const cumulativeWords: number[] = [];
  for (const family of families) {
    for (const site of index.occurrences(grouping, family.term)) {
      covered.add(positionKey(site));
    }
    cumulativeWords.push(covered.size);
  }
  return {
    grouping,
    totalWords: index.wordCount,
    annotatedWords: covered.size,
    families,
    cumulativeWords,
  };
}

export function qacFrequencyCoverage(
  report: QacFrequencyReport,
  requestedFamilies: number,
): QacFrequencyCoverage {
  const families = Number.isFinite(requestedFamilies)
    ? Math.max(0, Math.min(report.families.length, Math.floor(requestedFamilies)))
    : 0;
  const words = families === 0 ? 0 : (report.cumulativeWords[families - 1] ?? 0);
  return {
    families,
    words,
    percent: report.totalWords === 0 ? 0 : (words / report.totalWords) * 100,
  };
}

export function qacSurahFrequency(
  index: Pick<QacFrequencySource, 'occurrences'>,
  grouping: QacGrouping,
  term: string,
): readonly QacSurahFrequency[] {
  const sites = index.occurrences(grouping, term);
  const counters = new Map<number, { words: Set<string>; ayahs: Set<number> }>();
  for (const site of sites) {
    const surah = CANONICAL_QURAN.refAt(site.ayah).surah;
    const row = counters.get(surah) ?? { words: new Set<string>(), ayahs: new Set<number>() };
    row.words.add(positionKey(site));
    row.ayahs.add(site.ayah);
    counters.set(surah, row);
  }
  return Array.from(counters, ([surah, row]) => ({
    surah,
    words: row.words.size,
    ayahs: row.ayahs.size,
  })).sort((a, b) => b.words - a.words || a.surah - b.surah);
}
