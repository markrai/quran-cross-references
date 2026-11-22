import { getSurahGenre } from '../../core/quran/genres.ts';
import type { QuranVersification } from '../../core/quran/quran-versification.ts';

/** Genre ordinal of every ayah, indexed by ayah index (for fast per-link lookups). */
export function computeVerseGenres(versification: QuranVersification): Uint8Array {
  const genres = new Uint8Array(versification.ayahCount);
  for (let ayah = 0; ayah < versification.ayahCount; ayah += 1) {
    genres[ayah] = getSurahGenre(versification.surahAt(ayah).id).ordinal;
  }
  return genres;
}
