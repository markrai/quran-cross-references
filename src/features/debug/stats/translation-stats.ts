import { SURAHS } from '../../../core/quran/surahs.ts';
import type { AyahIndex } from '../../../core/quran/ayah-ref.ts';
import type { Translation } from '../../../translations/translation.ts';

export interface VerseMeasure {
  readonly ayah: AyahIndex;
  readonly value: number;
}

export interface TranslationStats {
  readonly ayahCount: number;
  readonly textAyahCount: number;
  /** Verses the translation leaves empty (e.g. moved to footnotes). */
  readonly omittedVerses: readonly AyahIndex[];
  readonly bookCount: number;
  readonly chapterCount: number;
  readonly wordCount: number;
  readonly characterCount: number;
  readonly longestVerse: VerseMeasure | undefined;
  readonly shortestVerse: VerseMeasure | undefined;
}

const WORD_PATTERN = /[\p{L}\p{N}]/u;

export function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => WORD_PATTERN.test(token)).length;
}

export function computeTranslationStats(translation: Translation): TranslationStats {
  const omittedVerses: AyahIndex[] = [];
  let wordCount = 0;
  let characterCount = 0;
  let longestVerse: VerseMeasure | undefined;
  let shortestVerse: VerseMeasure | undefined;

  for (let ayah = 0; ayah < translation.ayahCount; ayah += 1) {
    const text = translation.verseText(ayah);
    if (text === '') {
      omittedVerses.push(ayah);
      continue;
    }
    const words = countWords(text);
    wordCount += words;
    characterCount += text.length;
    if (!longestVerse || words > longestVerse.value) {
      longestVerse = { ayah, value: words };
    }
    if (!shortestVerse || words < shortestVerse.value) {
      shortestVerse = { ayah, value: words };
    }
  }

  const { versification } = translation;
  return {
    ayahCount: translation.ayahCount,
    textAyahCount: translation.ayahCount - omittedVerses.length,
    omittedVerses,
    bookCount: SURAHS.length,
    chapterCount: versification.chapterCount,
    wordCount,
    characterCount,
    longestVerse,
    shortestVerse,
  };
}
