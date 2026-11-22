export const QURAN_ANALYTICS_TOP_LIMIT = 32;

export interface QuranAnalyticsSurah {
  readonly surah: number;
  readonly ayahCount: number;
  readonly curatedLinks: number;
  readonly curatedWithin: number;
  readonly curatedAcross: number;
  readonly curatedPer100Ayahs: number;
  readonly firstCuratedAyah: number | null;
  readonly exactExpressions: number;
  readonly exactSpans: number;
  readonly exactCrossSurahExpressions: number;
  readonly exactSpansPer100Ayahs: number;
  readonly firstExactAyah: number | null;
}

export interface QuranAnalyticsExpression {
  readonly id: string;
  readonly words: readonly string[];
  readonly wordCount: number;
  readonly spanCount: number;
  readonly distinctAyahCount: number;
  readonly surahCount: number;
  readonly firstAyah: number;
}

export interface QuranAnalyticsTotals {
  readonly ayahs: number;
  readonly surahs: number;
  readonly curatedLinks: number;
  readonly curatedWithin: number;
  readonly curatedAcross: number;
  readonly exactExpressions: number;
  readonly exactSpans: number;
  readonly exactWithinSurahExpressions: number;
  readonly exactCrossSurahExpressions: number;
}

export interface QuranAnalyticsDataset {
  readonly format: 'quran-analytics';
  readonly schemaVersion: 1;
  readonly versification: string;
  readonly evidence: {
    readonly curated: 'curated-similar-passage';
    readonly computed: 'exact-repeated-expression';
  };
  readonly sourceHashes: {
    readonly arabic: string;
    readonly curated: string;
  };
  readonly totals: QuranAnalyticsTotals;
  readonly surahs: readonly QuranAnalyticsSurah[];
  readonly topExpressions: readonly QuranAnalyticsExpression[];
  readonly tanzilNotice: string;
}
