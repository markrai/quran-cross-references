export const MAQAM_WORD_COUNT = 77_429;
export const MAQAM_TOKEN_POLICY = 'maqam-2026-annotated-word-locations-v1';
export const MORPHOLOGY_OCCURRENCE_PAGE_SIZE = 24;

export type QuranMorphMode = 'lemma' | 'root';

export interface QuranMorphWord {
  readonly word: string;
  readonly lemma: string | null;
  readonly root: string | null;
  readonly pos: string;
}

export interface QuranMorphologySource {
  readonly id: 'maqam-2026';
  readonly url: string;
  readonly fileName: string;
  readonly sha256: string;
  readonly license: string;
  readonly attribution: string;
  readonly retrievedAt: string;
}

export interface QuranMorphologyDataset {
  readonly format: 'quran-morphology';
  readonly schemaVersion: 1;
  readonly versification: string;
  readonly origin: 'annotated';
  readonly evidence: 'maqam-lemma-root';
  readonly tokenPolicy: typeof MAQAM_TOKEN_POLICY;
  readonly alignment: 'surah-ayah-only';
  readonly source: QuranMorphologySource;
  readonly ayahCount: number;
  readonly wordCount: number;
  readonly taggedLemmaWords: number;
  readonly taggedRootWords: number;
  readonly ayahs: readonly (readonly QuranMorphWord[])[];
  readonly tanzilNotice: string;
}

export interface QuranMorphOccurrence {
  readonly ayah: number;
  readonly position: number;
  readonly word: string;
  readonly pos: string;
}
