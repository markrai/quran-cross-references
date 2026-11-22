import { CANONICAL_QURAN, type AyahIndexRange, type QuranVersification } from './quran-versification.ts';
import type { QuranRelationship } from './relationship-index.ts';

export type QuranRelationshipScope = 'all' | 'same-surah' | 'cross-surah';

export interface QuranRelationshipFilter {
  readonly scope: QuranRelationshipScope;
  readonly surahs: ReadonlySet<number> | null;
}

export const DEFAULT_QURAN_RELATIONSHIP_FILTER: QuranRelationshipFilter = {
  scope: 'all',
  surahs: null,
};

function rangeTouchesSelectedSurah(
  range: AyahIndexRange,
  selected: ReadonlySet<number>,
  versification: QuranVersification,
): boolean {
  const first = versification.refAt(range.start).surah;
  const last = versification.refAt(range.end).surah;
  for (let surah = first; surah <= last; surah += 1) {
    if (selected.has(surah)) return true;
  }
  return false;
}

export function relationshipWithinSurah(
  link: QuranRelationship,
  versification: QuranVersification = CANONICAL_QURAN,
): boolean {
  const sourceFirst = versification.refAt(link.source.start).surah;
  const sourceLast = versification.refAt(link.source.end).surah;
  const targetFirst = versification.refAt(link.target.start).surah;
  const targetLast = versification.refAt(link.target.end).surah;
  return sourceFirst === sourceLast && sourceFirst === targetFirst && targetFirst === targetLast;
}

export function passesQuranRelationshipFilter(
  link: QuranRelationship,
  filter: QuranRelationshipFilter,
  versification: QuranVersification = CANONICAL_QURAN,
): boolean {
  if (filter.scope !== 'all') {
    const within = relationshipWithinSurah(link, versification);
    if (filter.scope === 'same-surah' ? !within : within) return false;
  }
  if (filter.surahs === null) return true;
  return (
    rangeTouchesSelectedSurah(link.source, filter.surahs, versification) ||
    rangeTouchesSelectedSurah(link.target, filter.surahs, versification)
  );
}
