import type { CrossReferencesFile, TranslationTextFile } from '../../src/core/datasets/formats.ts';
import { crossReferencesDatasetPath, translationDatasetPath } from '../../src/core/datasets/paths.ts';
import { importMutashabihat } from './importers/mutashabihat.ts';
import { importQuranText } from './importers/quran-text.ts';
import type { RawSource } from './lib/sources.ts';

export interface RawSourceContent {
  readonly source: RawSource;
  readonly content: Buffer;
}
export type RawSourceReader = (sourceId: string) => Promise<RawSourceContent>;
export interface DatasetBuilder {
  readonly outputPath: string;
  readonly build: (readSource: RawSourceReader) => Promise<TranslationTextFile | CrossReferencesFile>;
}

function provenanceOf({ url, sha256, retrievedAt }: RawSource, snapshotDate: string | null) {
  return { url, sha256, retrievedAt, snapshotDate };
}

export const DATASET_BUILDERS: readonly DatasetBuilder[] = [
  {
    outputPath: translationDatasetPath('pickthall'),
    build: async (readSource) => {
      const [{ source, content: arabic }, { content: english }] = await Promise.all([
        readSource('tanzil-uthmani'),
        readSource('pickthall'),
      ]);
      return importQuranText(
        arabic.toString('utf8'),
        english.toString('utf8'),
        provenanceOf(source, '2021-02-01'),
      );
    },
  },
  {
    outputPath: crossReferencesDatasetPath('mutashabihat'),
    build: async (readSource) => {
      const { source, content } = await readSource('mutashabihat');
      return importMutashabihat(content.toString('utf8'), provenanceOf(source, '2026-11-01'));
    },
  },
];
