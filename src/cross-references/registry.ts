import type { CrossReferenceSourceId } from '../core/datasets/ids.ts';
import type { CrossReferenceSourceManifest } from './source-manifest.ts';

const MUTASHABIHAT: CrossReferenceSourceManifest = {
  id: 'mutashabihat',
  name: 'Quran Mutashabihat Data',
  description:
    'Curated similar and repeated Quran passages for memorization; this is not an exhaustive scholarly cross-reference set.',
  license: { name: 'CC0 1.0 Universal', url: 'https://creativecommons.org/publicdomain/zero/1.0/', publicDomain: true },
  attribution:
    'Similar-passage relationships: Quran Mutashabihat Data by Waqar144, based on work by Qari Idrees Al Asim and the maintainer, dedicated to the public domain under CC0 1.0.',
  homepage: 'https://github.com/Waqar144/Quran_Mutashabihat_Data',
  versification: 'hafs-kufan-6236',
  enabledByDefault: true,
};

export const CROSS_REFERENCE_SOURCE_MANIFESTS: readonly CrossReferenceSourceManifest[] = [MUTASHABIHAT];
export function getCrossReferenceSourceManifest(id: CrossReferenceSourceId): CrossReferenceSourceManifest {
  if (id !== 'mutashabihat') throw new RangeError(`Unknown source: ${String(id)}`);
  return MUTASHABIHAT;
}
