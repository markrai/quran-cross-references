import type { AyahIndex } from '../core/quran/ayah-ref.ts';
import type { QuranVersification } from '../core/quran/quran-versification.ts';
import type { DatasetProvenance, ImportNotice, TranslationTextFile } from '../core/datasets/formats.ts';
import { elementAt } from '../core/lib/array.ts';
import type { TranslationManifest } from './translation-manifest.ts';

export interface TextSearchResult {
  readonly totalCount: number;
  readonly ayahs: readonly AyahIndex[];
}

export function normalizeForSearch(text: string): string {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
}

/** The paired, independently attributed Arabic Quran text and English rendering. */
export class Translation {
  readonly manifest: TranslationManifest;
  readonly versification: QuranVersification;
  readonly provenance: DatasetProvenance;
  readonly notices: readonly ImportNotice[];
  readonly #arabic: readonly string[];
  readonly #english: readonly string[];
  #searchableEnglish: readonly string[] | undefined;

  constructor(manifest: TranslationManifest, versification: QuranVersification, file: TranslationTextFile) {
    if (file.arabic.length !== versification.ayahCount || file.ayahs.length !== versification.ayahCount) {
      throw new Error(`Quran text has ${String(file.arabic.length)} Arabic and ${String(file.ayahs.length)} English ayahs; expected ${String(versification.ayahCount)}.`);
    }
    this.manifest = manifest;
    this.versification = versification;
    this.provenance = file.provenance;
    this.notices = file.notices;
    this.#arabic = file.arabic;
    this.#english = file.ayahs;
  }

  get ayahCount(): number { return this.#english.length; }
  arabicText(index: AyahIndex): string { return elementAt(this.#arabic, index); }
  englishText(index: AyahIndex): string { return elementAt(this.#english, index); }

  search(query: string, limit: number): TextSearchResult {
    const needle = normalizeForSearch(query);
    if (needle === '') return { totalCount: 0, ayahs: [] };
    this.#searchableEnglish ??= this.#english.map(normalizeForSearch);
    const ayahs: AyahIndex[] = [];
    let totalCount = 0;
    this.#searchableEnglish.forEach((text, index) => {
      if (text.includes(needle)) {
        totalCount += 1;
        if (ayahs.length < limit) ayahs.push(index);
      }
    });
    return { totalCount, ayahs };
  }
}
