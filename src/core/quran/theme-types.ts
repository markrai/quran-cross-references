export const QSAC_AYAH_COUNT = 6236;
export const QSAC_TAG_COUNT = 338;
export const QSAC_DOMAIN_COUNT = 18;
export const QSAC_CATEGORY_COUNT = 70;
export const QSAC_PAGE_SIZE = 24;

export interface QuranThemeTag {
  readonly name: string;
  readonly domain: string;
  readonly category: string;
  readonly description: string;
  readonly count: number;
}

export interface QuranThemeDataset {
  readonly format: 'quran-external-themes';
  readonly schemaVersion: 1;
  readonly versification: 'hafs-kufan-6236';
  readonly origin: 'external-llm-assisted-annotation';
  readonly authority: 'exploratory-not-tafsir';
  readonly source: {
    readonly annotationsSha256: string;
    readonly ontologySha256: string;
    readonly revision: string;
    readonly license: 'CC BY 4.0';
    readonly attribution: string;
  };
  readonly annotationCount: number;
  readonly tags: readonly QuranThemeTag[];
  readonly ayahs: readonly (readonly number[])[];
}
