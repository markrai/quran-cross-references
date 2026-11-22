import type { AyahIndex } from './ayah-ref.ts';
import { formatAyahId, parseAyahId } from './ayah-ref.ts';
import type { AyahIndexRange, QuranVersification } from './quran-versification.ts';
import { formatReference } from './reference.ts';

export type Passage =
  | { readonly kind: 'ayah'; readonly ayah: AyahIndex }
  | { readonly kind: 'surah'; readonly surah: number };

export const ayahPassage = (ayah: AyahIndex): Passage => ({ kind: 'ayah', ayah });

export function surahPassageOf(ayah: AyahIndex, versification: QuranVersification): Passage {
  return { kind: 'surah', surah: versification.refAt(ayah).surah };
}

export function passageRange(passage: Passage, versification: QuranVersification): AyahIndexRange {
  return passage.kind === 'ayah'
    ? { start: passage.ayah, end: passage.ayah }
    : versification.surahRange(passage.surah);
}

export function isSamePassage(a: Passage | null, b: Passage | null): boolean {
  if (a === null || b === null) return a === b;
  return a.kind === 'ayah' || b.kind === 'ayah'
    ? a.kind === 'ayah' && b.kind === 'ayah' && a.ayah === b.ayah
    : a.surah === b.surah;
}

export function formatPassage(passage: Passage, versification: QuranVersification): string {
  return passage.kind === 'ayah'
    ? formatReference(versification.refAt(passage.ayah))
    : `Surah ${String(passage.surah)}`;
}

export function passageFromReference(reference: { readonly surah: number; readonly ayah: number }, versification: QuranVersification): Passage {
  const index = versification.indexOf(reference);
  if (index === undefined) throw new RangeError(`No such ayah: ${String(reference.surah)}:${String(reference.ayah)}`);
  return ayahPassage(index);
}

/** Stable deep-link ID (`2:255` for an ayah, `2` for a surah). */
export function toPassageId(passage: Passage, versification: QuranVersification): string {
  return passage.kind === 'ayah' ? formatAyahId(versification.refAt(passage.ayah)) : String(passage.surah);
}

export function parsePassageId(id: string, versification: QuranVersification): Passage | undefined {
  const ref = parseAyahId(id);
  if (ref) {
    const ayah = versification.indexOf(ref);
    return ayah === undefined ? undefined : ayahPassage(ayah);
  }
  const surah = Number(id);
  return versification.ayahCountOf(surah) === undefined ? undefined : { kind: 'surah', surah };
}
