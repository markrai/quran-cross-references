import type { TranslationId } from '../core/datasets/ids.ts';
import type { TranslationManifest } from './translation-manifest.ts';

const PICKTHALL: TranslationManifest = {
  id: 'pickthall',
  name: 'The Meaning of the Glorious Koran',
  abbreviation: 'Pickthall',
  language: 'en',
  direction: 'ltr',
  versification: 'hafs-kufan-6236',
  license: {
    name: 'Public domain (1930 edition)',
    url: 'https://en.wikisource.org/wiki/The_Meaning_of_the_Glorious_Koran',
    publicDomain: true,
  },
  attribution:
    'Arabic text: Tanzil Quran Text, Uthmani v1.1, © Tanzil Project, CC BY 3.0; copied verbatim. ' +
    'English: The Meaning of the Glorious Koran, Marmaduke Pickthall (1930), public domain in ' +
    'the United States since 2026 and in life-plus-70 jurisdictions; Tanzil digital edition, 2010-09-04.',
  homepage: 'https://tanzil.net/',
  access: 'bundled',
};

export const TRANSLATION_MANIFESTS: readonly TranslationManifest[] = [PICKTHALL];
export const DEFAULT_TRANSLATION_ID: TranslationId = 'pickthall';
export function getTranslationManifest(id: TranslationId): TranslationManifest {
  if (id !== 'pickthall') throw new RangeError(`Unknown translation: ${String(id)}`);
  return PICKTHALL;
}
