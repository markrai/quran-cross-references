import { CANONICAL_QURAN } from './quran-versification.ts';

export type VerseSearchLanguage = 'arabic' | 'english';
export type VerseSearchMode = 'literal' | 'unmarked';

export interface VerseSearchOptions {
  readonly query: string;
  readonly language: VerseSearchLanguage;
  readonly mode: VerseSearchMode;
  readonly surah: number | null;
}

export interface VerseSearchSpan {
  readonly start: number;
  readonly end: number;
}

export interface VerseSearchHit {
  readonly ayahIndex: number;
  readonly spans: readonly VerseSearchSpan[];
}

export interface VerseSearchText {
  readonly arabic: readonly string[];
  readonly english: readonly string[];
}

interface UnmarkedText {
  readonly value: string;
  readonly starts: readonly number[];
  readonly ends: readonly number[];
}

export interface VerseSearchIndex {
  readonly text: VerseSearchText;
  readonly englishFolded: readonly string[];
  readonly arabicUnmarked: readonly UnmarkedText[];
}

export const MAX_VERSE_SEARCH_QUERY = 120;
export const VERSE_SEARCH_PAGE_SIZE = 20;

function withoutArabicMarks(text: string): UnmarkedText {
  let value = '';
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;
  for (const character of text) {
    const end = offset + character.length;
    if (/\p{M}/u.test(character) || character === '\u0640') {
      const last = ends.length - 1;
      if (last >= 0) {
        ends[last] = end;
        if (last > 0 && starts[last - 1] === starts[last]) ends[last - 1] = end;
      }
    } else {
      value += character;
      starts.push(offset);
      ends.push(end);
      if (character.length === 2) {
        starts.push(offset);
        ends.push(end);
      }
    }
    offset = end;
  }
  return { value, starts, ends };
}

export function createVerseSearchIndex(text: VerseSearchText): VerseSearchIndex {
  if (
    text.arabic.length !== CANONICAL_QURAN.ayahCount ||
    text.english.length !== CANONICAL_QURAN.ayahCount
  ) {
    throw new RangeError('A Quran verse search requires the complete canonical text.');
  }
  return {
    text,
    englishFolded: text.english.map((verse) => verse.toLocaleLowerCase('en')),
    arabicUnmarked: text.arabic.map(withoutArabicMarks),
  };
}

function findSpans(
  content: string,
  needle: string,
  projection?: UnmarkedText,
): readonly VerseSearchSpan[] {
  const spans: VerseSearchSpan[] = [];
  let from = 0;
  while (from < content.length && spans.length < 24) {
    const match = content.indexOf(needle, from);
    if (match === -1) break;
    const start = projection?.starts[match] ?? match;
    const end = projection?.ends[match + needle.length - 1] ?? match + needle.length;
    if (end > start) spans.push({ start, end });
    from = match + needle.length;
  }
  return spans;
}

export function searchQuranVerses(
  index: VerseSearchIndex,
  options: VerseSearchOptions,
): readonly VerseSearchHit[] {
  const query = options.query.trim();
  if (!query || query.length > MAX_VERSE_SEARCH_QUERY) return [];
  const unmarked = options.language === 'arabic' && options.mode === 'unmarked';
  const needle = unmarked
    ? withoutArabicMarks(query).value
    : options.language === 'english'
      ? query.toLocaleLowerCase('en')
      : query;
  if (!needle) return [];
  if (
    options.surah !== null &&
    (!Number.isInteger(options.surah) ||
      options.surah < 1 ||
      options.surah > CANONICAL_QURAN.surahCount)
  ) {
    return [];
  }
  const range =
    options.surah === null
      ? { start: 0, end: CANONICAL_QURAN.ayahCount - 1 }
      : CANONICAL_QURAN.surahRange(options.surah);
  const results: VerseSearchHit[] = [];
  for (let ayahIndex = range.start; ayahIndex <= range.end; ayahIndex += 1) {
    const projection = unmarked ? index.arabicUnmarked[ayahIndex] : undefined;
    const haystack = unmarked
      ? projection?.value
      : options.language === 'arabic'
        ? index.text.arabic[ayahIndex]
        : index.englishFolded[ayahIndex];
    if (haystack === undefined) continue;
    const spans = findSpans(haystack, needle, projection);
    if (spans.length > 0) results.push({ ayahIndex, spans });
  }
  return results;
}
