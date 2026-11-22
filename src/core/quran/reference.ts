import { formatAyahId, type AyahRef } from './ayah-ref.ts';
import { CANONICAL_QURAN, type QuranVersification } from './quran-versification.ts';
import { SURAHS, getSurah } from './surahs.ts';

const normalize = (value: string) => value.toLocaleLowerCase('en').normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '');

const NAME_LOOKUP = new Map<string, number>();
for (const surah of SURAHS) {
  for (const name of [surah.name, surah.arabicName, ...surah.aliases]) {
    NAME_LOOKUP.set(normalize(name), surah.number);
  }
}

export type ReferenceParseError =
  | { readonly kind: 'unreadable' }
  | { readonly kind: 'unknown-surah'; readonly query: string }
  | { readonly kind: 'no-such-ayah'; readonly surah: number; readonly ayahs: number };

export type ReferenceParseResult =
  | { readonly ok: true; readonly reference: AyahRef }
  | { readonly ok: false; readonly error: ReferenceParseError };

/** Accepts `2:255`, `Al-Baqarah 255`, and `Surah 2 Ayah 255`. */
export function parseReference(
  input: string,
  versification: QuranVersification = CANONICAL_QURAN,
): ReferenceParseResult {
  const text = input.trim();
  let surah: number | undefined;
  let ayah: number | undefined;

  let match = /^(\d{1,3})\s*:\s*(\d{1,3})$/i.exec(text);
  if (match) {
    surah = Number(match[1]);
    ayah = Number(match[2]);
  } else {
    match = /^surah\s+(\d{1,3})\s+ayah\s+(\d{1,3})$/i.exec(text);
    if (match) {
      surah = Number(match[1]);
      ayah = Number(match[2]);
    } else {
      match = /^(?:surah\s+)?(.+?)\s+(\d{1,3})$/iu.exec(text);
      if (match) {
        const nameQuery = match[1] ?? '';
        surah = NAME_LOOKUP.get(normalize(nameQuery));
        ayah = Number(match[2]);
        if (surah === undefined) return { ok: false, error: { kind: 'unknown-surah', query: nameQuery } };
      }
    }
  }
  if (surah === undefined || ayah === undefined || !Number.isInteger(surah) || !Number.isInteger(ayah)) {
    return { ok: false, error: { kind: 'unreadable' } };
  }
  const count = versification.ayahCountOf(surah);
  if (count === undefined) return { ok: false, error: { kind: 'unknown-surah', query: String(surah) } };
  if (ayah < 1 || ayah > count) return { ok: false, error: { kind: 'no-such-ayah', surah, ayahs: count } };
  return { ok: true, reference: { surah, ayah } };
}

export function formatReference(ref: AyahRef): string {
  return `${getSurah(ref.surah).name} ${formatAyahId(ref)}`;
}

export function formatIndexRange(
  versification: QuranVersification,
  start: number,
  end: number = start,
): string {
  const first = versification.refAt(start);
  const last = versification.refAt(end);
  if (first.surah !== last.surah) return `${formatReference(first)} – ${formatReference(last)}`;
  if (first.ayah !== last.ayah) return `${formatReference(first)}–${String(last.ayah)}`;
  return formatReference(first);
}
