export const ELQV_LABELS = ['fear', 'joy', 'anger', 'sadness'] as const;
export type QuranEmotionLabel = (typeof ELQV_LABELS)[number];
export type QuranEmotionFilter = QuranEmotionLabel | 'all' | 'conflicts';

export const ELQV_ROW_COUNT = 2100;
export const ELQV_DISTINCT_AYAH_COUNT = 2087;
export const ELQV_MEMBERSHIP_COUNT = 2092;
export const ELQV_IDENTICAL_DUPLICATE_COUNT = 8;
export const ELQV_CONFLICT_AYAH_COUNT = 4;
export const ELQV_UNIQUE_LABEL_COUNTS = [672, 586, 494, 340] as const;
export const ELQV_PAGE_SIZE = 24;

export interface QuranEmotionDataset {
  readonly format: 'quran-external-emotions';
  readonly schemaVersion: 1;
  readonly versification: 'hafs-kufan-6236';
  readonly origin: 'external-specialist-annotated-emotions';
  readonly authority: 'exploratory-not-tafsir';
  readonly source: {
    readonly sha256: string;
    readonly revision: string;
    readonly license: 'CC0-1.0';
    readonly attribution: string;
  };
  readonly labels: readonly QuranEmotionLabel[];
  readonly rowCount: number;
  readonly distinctAyahCount: number;
  readonly membershipCount: number;
  readonly identicalDuplicateCount: number;
  readonly conflictedAyahCount: number;
  readonly labelCounts: readonly number[];
  readonly entries: readonly (readonly [number, readonly number[]])[];
}
