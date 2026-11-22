import type { SurahNumber } from '../../core/quran/surahs.ts';
export interface LocalizedSurah {
  readonly name: string;
  readonly arabicName: string;
  readonly abbreviation: string;
  readonly aliases: readonly string[];
}
export type SurahNames = Readonly<Record<SurahNumber, LocalizedSurah>>;
