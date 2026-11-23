import type { QacMorphologyIndex } from './qac-index.ts';
import type { QacGrouping, QacOccurrence } from './qac-types.ts';
import { CANONICAL_QURAN } from './quran-versification.ts';
import { MAX_VERSE_SEARCH_QUERY, type VerseSearchHit } from './verse-search.ts';

export interface QacVerseSearchHit extends VerseSearchHit {
  readonly annotations: readonly QacOccurrence[];
}

export interface QacVerseSearchResult {
  readonly term: string | null;
  readonly hits: readonly QacVerseSearchHit[];
}

type QacSearchIndex = Pick<QacMorphologyIndex, 'resolve' | 'occurrences'>;

export function searchQacVerses(
  index: QacSearchIndex,
  grouping: QacGrouping,
  query: string,
  surah: number | null,
): QacVerseSearchResult {
  const trimmed = query.trim();
  if (
    !trimmed ||
    trimmed.length > MAX_VERSE_SEARCH_QUERY ||
    Array.from(trimmed).some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    }) ||
    (surah !== null &&
      (!Number.isInteger(surah) || surah < 1 || surah > CANONICAL_QURAN.surahCount))
  ) {
    return { term: null, hits: [] };
  }
  const term = index.resolve(grouping, trimmed);
  if (term === null) return { term: null, hits: [] };
  const range =
    surah === null
      ? { start: 0, end: CANONICAL_QURAN.ayahCount - 1 }
      : CANONICAL_QURAN.surahRange(surah);
  const perAyah = new Map<number, QacOccurrence[]>();
  for (const occurrence of index.occurrences(grouping, term)) {
    if (occurrence.ayah < range.start || occurrence.ayah > range.end) continue;
    const matches = perAyah.get(occurrence.ayah) ?? [];
    matches.push(occurrence);
    perAyah.set(occurrence.ayah, matches);
  }
  const hits: QacVerseSearchHit[] = Array.from(perAyah, ([ayahIndex, annotations]) => ({
    ayahIndex,
    spans: [],
    annotations: annotations.sort((a, b) => a.word - b.word),
  })).sort((a, b) => a.ayahIndex - b.ayahIndex);
  return { term, hits };
}
