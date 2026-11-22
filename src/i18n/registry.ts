import type { GenreId } from '../core/quran/genres.ts';
import { enSurahs } from './surahs/en.ts';
import type { SurahNames } from './surahs/types.ts';
import { enInstall } from './install/en.tsx';
import type { InstallGuides } from './install/types.ts';
import { en } from './messages/en.ts';
import type { LocaleMessages } from './messages/types.ts';
import { DEFAULT_LOCALE_ID, type LocaleId } from './locale-id.ts';

export interface Locale {
  readonly id: LocaleId;
  readonly tag: string;
  readonly endonym: string;
  readonly messages: LocaleMessages;
  readonly surahs: SurahNames;
  readonly genres: Readonly<Record<GenreId, string>>;
  readonly install: InstallGuides;
}

const ENGLISH: Locale = {
  id: 'en', tag: 'en', endonym: 'English', messages: en, surahs: enSurahs,
  genres: { 'odd-surahs': 'Odd-numbered surahs', 'even-surahs': 'Even-numbered surahs' },
  install: enInstall,
};
export { DEFAULT_LOCALE_ID };
export const LOCALE_LIST: readonly Locale[] = [ENGLISH];
export function getLocale(_id: LocaleId): Locale { return ENGLISH; }
