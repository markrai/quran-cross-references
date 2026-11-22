export const QAC_WORD_COUNT = 77_429;
export const QAC_SEGMENT_COUNT = 128_219;
export const QAC_STEM_COUNT = 77_915;
export const QAC_MORPHOLOGY_POLICY = 'qac-0.4-segment-position-buckwalter-v1';
export const QAC_OCCURRENCE_PAGE_SIZE = 24;

export type QacGrouping = 'lemma' | 'root';

export type QacSegment = readonly [form: string, tag: string, features: string];
export type QacWord = readonly QacSegment[];

export interface QacSource {
  readonly id: string;
  readonly url: string;
  readonly fileName: string;
  readonly sha256: string;
  readonly license: string;
  readonly attribution: string;
  readonly retrievedAt: string;
}

export interface QacMorphologyDataset {
  readonly format: 'quran-qac-morphology';
  readonly schemaVersion: 1;
  readonly versification: 'hafs-kufan-6236';
  readonly origin: 'annotated';
  readonly evidence: 'qac-segment-lemma-root';
  readonly tokenPolicy: typeof QAC_MORPHOLOGY_POLICY;
  readonly source: QacSource;
  readonly ayahCount: number;
  readonly wordCount: number;
  readonly segmentCount: number;
  readonly stemCount: number;
  readonly ayahs: readonly (readonly QacWord[])[];
  readonly qacNotice: string;
  readonly tanzilNotice: string;
}

export interface QacOccurrence {
  readonly ayah: number;
  readonly word: number;
  readonly form: string;
  readonly pos: string;
}

export interface QacWordAnalysis {
  readonly form: string;
  readonly lemmas: readonly string[];
  readonly roots: readonly string[];
  readonly pos: readonly string[];
  readonly segments: QacWord;
}
