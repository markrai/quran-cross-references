import { SURAHS, type SurahNumber } from '../../core/quran/surahs.ts';
import { getSurahGenre } from '../../core/quran/genres.ts';
import type { AyahIndex } from '../../core/quran/ayah-ref.ts';
import type { QuranVersification } from '../../core/quran/quran-versification.ts';

/** One surah's stretch of the spine. */
export interface SpineSegment {
  readonly surah: SurahNumber;
  readonly genreOrdinal: number;
  readonly start: AyahIndex;
  readonly end: AyahIndex;
  readonly top: number;
  readonly bottom: number;
}

/**
 * The whole Bible as a vertical bar: surahs stacked in canonical order, each as tall as its
 * number of ayahs, with small gaps between surahs and larger ones between genres.
 */
export interface SpineLayout {
  readonly segments: readonly SpineSegment[];
  /** Vertical position of a ayah's center. */
  readonly yOf: (ayah: AyahIndex) => number;
  /** The ayah at a vertical position, or `null` outside the surahs. */
  readonly verseAt: (y: number) => AyahIndex | null;
}

export interface SpineGaps {
  readonly surah: number;
  readonly genre: number;
}

export function computeSpineLayout(
  versification: QuranVersification,
  top: number,
  bottom: number,
  gaps: SpineGaps,
): SpineLayout {
  let genreBreaks = 0;
  SURAHS.forEach((surah, index) => {
    const previous = SURAHS[index - 1];
    if (previous && getSurahGenre(previous.id).ordinal !== getSurahGenre(surah.id).ordinal) {
      genreBreaks += 1;
    }
  });
  const gapTotal = (SURAHS.length - 1 - genreBreaks) * gaps.surah + genreBreaks * gaps.genre;
  const pixelsPerVerse = Math.max(bottom - top - gapTotal, 0) / versification.ayahCount;

  const segments: SpineSegment[] = [];
  let y = top;
  SURAHS.forEach((surah, index) => {
    const previous = SURAHS[index - 1];
    const genreOrdinal = getSurahGenre(surah.id).ordinal;
    if (previous) {
      y += getSurahGenre(previous.id).ordinal === genreOrdinal ? gaps.surah : gaps.genre;
    }
    const range = versification.surahRange(surah.id);
    const height = (range.end - range.start + 1) * pixelsPerVerse;
    segments.push({
      surah: surah.id,
      genreOrdinal,
      start: range.start,
      end: range.end,
      top: y,
      bottom: y + height,
    });
    y += height;
  });

  const segmentOf = (ayah: AyahIndex) =>
    segments.find((segment) => ayah >= segment.start && ayah <= segment.end);

  return {
    segments,
    yOf: (ayah) => {
      const segment = segmentOf(ayah);
      return segment ? segment.top + (ayah - segment.start + 0.5) * pixelsPerVerse : top;
    },
    verseAt: (position) => {
      const segment = segments.find(
        (candidate) => position >= candidate.top && position <= candidate.bottom,
      );
      if (!segment || pixelsPerVerse === 0) {
        return null;
      }
      const offset = Math.floor((position - segment.top) / pixelsPerVerse);
      return Math.min(segment.start + Math.max(offset, 0), segment.end);
    },
  };
}
