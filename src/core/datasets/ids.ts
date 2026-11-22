export const TRANSLATION_IDS = ['pickthall'] as const;
export type TranslationId = (typeof TRANSLATION_IDS)[number];

export const CROSS_REFERENCE_SOURCE_IDS = ['mutashabihat'] as const;
export type CrossReferenceSourceId = (typeof CROSS_REFERENCE_SOURCE_IDS)[number];

// Original-language morphology is deliberately outside vertical slice 1.
export const WORD_SOURCE_IDS = [] as const;
export type WordSourceId = never;

export function isTranslationId(value: string): value is TranslationId {
  return value === 'pickthall';
}
