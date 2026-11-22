import {
  QURAN_ANALYTICS_TOP_LIMIT,
  type QuranAnalyticsDataset,
  type QuranAnalyticsExpression,
  type QuranAnalyticsSurah,
} from '../../src/core/quran/analytics-types.ts';
import { CANONICAL_QURAN } from '../../src/core/quran/quran-versification.ts';
import type { QuranRelationshipIndex } from '../../src/core/quran/relationship-index.ts';
import type { QuranExactExpressionDataset } from './expression-evidence.ts';

function per100(count: number, ayahs: number): number {
  return Math.round((count / ayahs) * 10_000) / 100;
}

export function buildQuranAnalytics(
  relationships: QuranRelationshipIndex,
  expressions: QuranExactExpressionDataset,
  hashes: { readonly arabic: string; readonly curated: string },
  tanzilNotice: string,
): QuranAnalyticsDataset {
  if (
    relationships.versification.id !== CANONICAL_QURAN.id ||
    expressions.versification !== CANONICAL_QURAN.id ||
    expressions.statistics.ayahCount !== CANONICAL_QURAN.ayahCount
  ) {
    throw new Error('Analytics inputs must share the canonical Quran versification.');
  }
  const rows: {
    surah: number;
    ayahCount: number;
    curatedLinks: number;
    curatedWithin: number;
    curatedAcross: number;
    firstCuratedAyah: number | null;
    exactExpressions: number;
    exactSpans: number;
    exactCrossSurahExpressions: number;
    firstExactAyah: number | null;
  }[] = Array.from({ length: CANONICAL_QURAN.surahCount }, (_, index) => ({
    surah: index + 1,
    ayahCount: CANONICAL_QURAN.surahRange(index + 1).end -
      CANONICAL_QURAN.surahRange(index + 1).start + 1,
    curatedLinks: 0,
    curatedWithin: 0,
    curatedAcross: 0,
    firstCuratedAyah: null,
    exactExpressions: 0,
    exactSpans: 0,
    exactCrossSurahExpressions: 0,
    firstExactAyah: null,
  }));

  let curatedWithin = 0;
  let curatedAcross = 0;
  for (let id = 0; id < relationships.linkCount; id += 1) {
    const link = relationships.link(id);
    const touched = new Map<number, number>();
    for (const span of [link.source, link.target]) {
      for (let index = span.start; index <= span.end; index += 1) {
        const surah = CANONICAL_QURAN.refAt(index).surah;
        touched.set(surah, Math.min(touched.get(surah) ?? index, index));
      }
    }
    const across = touched.size > 1;
    if (across) curatedAcross += 1;
    else curatedWithin += 1;
    for (const [surah, first] of touched) {
      const row = rows[surah - 1];
      if (!row) throw new Error('Analytics surah out of bounds.');
      row.curatedLinks += 1;
      if (across) row.curatedAcross += 1;
      else row.curatedWithin += 1;
      row.firstCuratedAyah = Math.min(row.firstCuratedAyah ?? first, first);
    }
  }

  let exactWithin = 0;
  let exactAcross = 0;
  const topExpressions: QuranAnalyticsExpression[] = [];
  let totalSpans = 0;
  for (const expression of expressions.expressions) {
    const touched = new Set<number>();
    const distinctAyahs = new Set<number>();
    for (const site of expression.occurrences) {
      const surah = CANONICAL_QURAN.refAt(site.ayah).surah;
      const row = rows[surah - 1];
      if (!row) throw new Error('Expression occurrence outside the Quran.');
      touched.add(surah);
      distinctAyahs.add(site.ayah);
      row.exactSpans += 1;
      row.firstExactAyah = Math.min(row.firstExactAyah ?? site.ayah, site.ayah);
      totalSpans += 1;
    }
    const across = touched.size > 1;
    if (across) exactAcross += 1;
    else exactWithin += 1;
    for (const surah of touched) {
      const row = rows[surah - 1];
      if (!row) throw new Error('Analytics surah out of bounds.');
      row.exactExpressions += 1;
      if (across) row.exactCrossSurahExpressions += 1;
    }
    const first = expression.occurrences[0];
    if (!first) throw new Error('Exact expression has no source occurrence.');
    topExpressions.push({
      id: expression.id,
      words: expression.words,
      wordCount: expression.words.length,
      spanCount: expression.occurrences.length,
      distinctAyahCount: distinctAyahs.size,
      surahCount: touched.size,
      firstAyah: first.ayah,
    });
  }
  if (
    totalSpans !== expressions.statistics.emittedOccurrences ||
    expressions.expressions.length !== expressions.statistics.emittedExpressions
  ) {
    throw new Error('Analytics expression totals do not match generated evidence.');
  }
  topExpressions.sort(
    (a, b) =>
      b.spanCount - a.spanCount ||
      b.surahCount - a.surahCount ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const surahs: QuranAnalyticsSurah[] = rows.map((row) => ({
    ...row,
    curatedPer100Ayahs: per100(row.curatedLinks, row.ayahCount),
    exactSpansPer100Ayahs: per100(row.exactSpans, row.ayahCount),
  }));

  return {
    format: 'quran-analytics',
    schemaVersion: 1,
    versification: CANONICAL_QURAN.id,
    evidence: {
      curated: 'curated-similar-passage',
      computed: 'exact-repeated-expression',
    },
    sourceHashes: hashes,
    totals: {
      ayahs: CANONICAL_QURAN.ayahCount,
      surahs: CANONICAL_QURAN.surahCount,
      curatedLinks: relationships.linkCount,
      curatedWithin,
      curatedAcross,
      exactExpressions: expressions.expressions.length,
      exactSpans: totalSpans,
      exactWithinSurahExpressions: exactWithin,
      exactCrossSurahExpressions: exactAcross,
    },
    surahs,
    topExpressions: topExpressions.slice(0, QURAN_ANALYTICS_TOP_LIMIT),
    tanzilNotice,
  };
}
