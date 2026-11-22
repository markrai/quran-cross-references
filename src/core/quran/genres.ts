import { SURAHS, type SurahNumber } from './surahs.ts';

/** Neutral alternating display bands; these are visual only, not theological classifications. */
const DEFINITIONS = [
  { id: 'odd-surahs', name: 'Odd-numbered surahs' },
  { id: 'even-surahs', name: 'Even-numbered surahs' },
] as const;
export type GenreId = (typeof DEFINITIONS)[number]['id'];
export interface Genre { readonly id: GenreId; readonly name: string; readonly ordinal: number }
export const GENRES: readonly Genre[] = DEFINITIONS.map((definition, ordinal) => ({ ...definition, ordinal }));
export function getGenre(id: GenreId): Genre {
  const genre = GENRES.find((candidate) => candidate.id === id);
  if (!genre) throw new RangeError(`Unknown display band: ${id}`);
  return genre;
}
export function getSurahGenre(surah: SurahNumber): Genre {
  return GENRES[(surah - 1) % 2] as Genre;
}
export function getGenreSurahs(id: GenreId): readonly SurahNumber[] {
  return SURAHS.filter((surah) => getSurahGenre(surah.number).id === id).map((surah) => surah.number);
}
