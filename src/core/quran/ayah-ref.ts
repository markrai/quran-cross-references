import { isSurahNumber } from './surahs.ts';

/** A Quran ayah addressed by one-based surah and ayah numbers. */
export interface AyahRef {
  readonly surah: number;
  readonly ayah: number;
}

/** Dense, zero-based position in canonical Quran order. */
export type AyahIndex = number;

export function formatAyahId(ref: AyahRef): string {
  return `${String(ref.surah)}:${String(ref.ayah)}`;
}

export function parseAyahId(id: string): AyahRef | undefined {
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(id);
  if (!match) return undefined;
  const surah = Number(match[1]);
  const ayah = Number(match[2]);
  return isSurahNumber(surah) && ayah >= 1 ? { surah, ayah } : undefined;
}

