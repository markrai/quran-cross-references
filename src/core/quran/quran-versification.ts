import { elementAt } from '../lib/array.ts';
import { SURAHS, getSurah, type Surah } from './surahs.ts';
import type { AyahIndex, AyahRef } from './ayah-ref.ts';

export type QuranVersificationId = 'hafs-kufan-6236';

export interface AyahIndexRange {
  readonly start: AyahIndex;
  readonly end: AyahIndex;
}

export interface SurahRange extends AyahIndexRange {
  readonly surah: number;
}

/** O(1) mapping between canonical Quran references and dense ayah indices. */
export class QuranVersification {
  readonly id: QuranVersificationId = 'hafs-kufan-6236';
  readonly ayahCount: number;
  readonly surahCount = SURAHS.length;
  readonly #starts: Uint16Array;
  readonly #indexSurahs: Uint8Array;
  // Al-Baqarah has 286 ayahs, so this intentionally cannot be Uint8Array.
  readonly #indexAyahs: Uint16Array;

  constructor() {
    this.#starts = new Uint16Array(SURAHS.length + 1);
    let total = 0;
    for (const surah of SURAHS) {
      this.#starts[surah.ordinal] = total;
      total += surah.ayahCount;
    }
    this.#starts[SURAHS.length] = total;
    this.ayahCount = total;
    if (SURAHS.length !== 114 || total !== 6236) {
      throw new RangeError(
        `Invalid Quran boundaries: ${String(SURAHS.length)} surahs, ${String(total)} ayahs.`,
      );
    }

    this.#indexSurahs = new Uint8Array(total);
    this.#indexAyahs = new Uint16Array(total);
    let index = 0;
    for (const surah of SURAHS) {
      for (let ayah = 1; ayah <= surah.ayahCount; ayah += 1) {
        this.#indexSurahs[index] = surah.number;
        this.#indexAyahs[index] = ayah;
        index += 1;
      }
    }
  }

  ayahCountOf(surah: number): number | undefined {
    return SURAHS[surah - 1]?.ayahCount;
  }

  indexOf(ref: AyahRef): AyahIndex | undefined {
    const count = this.ayahCountOf(ref.surah);
    if (count === undefined || !Number.isInteger(ref.ayah) || ref.ayah < 1 || ref.ayah > count) {
      return undefined;
    }
    return elementAt(this.#starts, ref.surah - 1) + ref.ayah - 1;
  }

  refAt(index: AyahIndex): AyahRef {
    if (!this.isValidIndex(index)) throw new RangeError(`Invalid ayah index: ${String(index)}`);
    return { surah: elementAt(this.#indexSurahs, index), ayah: elementAt(this.#indexAyahs, index) };
  }

  surahAt(index: AyahIndex): Surah {
    return getSurah(this.refAt(index).surah);
  }

  surahRange(surah: number): SurahRange {
    const count = this.ayahCountOf(surah);
    if (count === undefined) throw new RangeError(`Unknown surah: ${String(surah)}`);
    const start = elementAt(this.#starts, surah - 1);
    return { surah, start, end: start + count - 1 };
  }

  isValidIndex(index: number): index is AyahIndex {
    return Number.isInteger(index) && index >= 0 && index < this.ayahCount;
  }
}

export const QURAN_VERSIFICATION = new QuranVersification();
export const CANONICAL_QURAN = QURAN_VERSIFICATION;
