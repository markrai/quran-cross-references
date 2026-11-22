import { SURAHS, type SurahNumber } from '../../core/quran/surahs.ts';
import type { LocalizedSurah, SurahNames } from './types.ts';
export const enSurahs: SurahNames = Object.fromEntries(
  SURAHS.map((surah): readonly [SurahNumber, LocalizedSurah] => [surah.number, {
    name: surah.name,
    arabicName: surah.arabicName,
    abbreviation: String(surah.number),
    aliases: surah.aliases,
  }]),
) as SurahNames;
