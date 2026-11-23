import { buckwalterToArabic, type QacMorphologyIndex } from './qac-index.ts';
import type { QuranExpressionIndex } from './expression-browser.ts';
import { CANONICAL_QURAN } from './quran-versification.ts';
import type { QuranThemeIndex } from './theme-index.ts';

export type ThemeLanguageKind = 'root' | 'lemma' | 'exact';
export type ThemeLanguageDirection = 'enriched' | 'depleted';

export type ThemeLanguageInput =
  | {
      readonly kind: 'root' | 'lemma';
      readonly index: Pick<QacMorphologyIndex, 'wordsAt'>;
    }
  | {
      readonly kind: 'exact';
      readonly index: Pick<QuranExpressionIndex, 'forAyah'>;
    };

export interface ThemeLanguageFeature {
  readonly id: string;
  readonly label: string;
  readonly themeAyahs: readonly number[];
  readonly outsideAyahs: readonly number[];
  readonly themeRate: number;
  readonly outsideRate: number;
  readonly percentagePointDifference: number;
}

export interface ThemeLanguageReport {
  readonly theme: string;
  readonly kind: ThemeLanguageKind;
  readonly themeSize: number;
  readonly outsideSize: number;
  readonly themeAyahs: ReadonlySet<number>;
  readonly features: readonly ThemeLanguageFeature[];
}

export interface ThemeLanguageSurahRow {
  readonly surah: number;
  readonly total: number;
  readonly theme: number;
  readonly outside: number;
  readonly both: number;
  readonly featureOutside: number;
}

function sourceFeatures(input: ThemeLanguageInput, ayah: number): ReadonlyMap<string, string> {
  const found = new Map<string, string>();
  if (input.kind === 'exact') {
    for (const hit of input.index.forAyah(ayah)) {
      const expression = hit.expression;
      found.set(expression.id, expression.words.join(' '));
    }
  } else {
    for (const word of input.index.wordsAt(ayah)) {
      for (const term of input.kind === 'root' ? word.roots : word.lemmas) {
        found.set(term, buckwalterToArabic(term));
      }
    }
  }
  return found;
}

export function computeThemeLanguage(
  themes: Pick<QuranThemeIndex, 'find' | 'occurrences'>,
  themeName: string,
  input: ThemeLanguageInput,
): ThemeLanguageReport {
  const theme = themes.find(themeName);
  if (!theme) throw new Error('Unknown QSAC topic: ' + themeName);
  const positions = themes.occurrences(themeName);
  const selected = new Set<number>();
  for (const ayah of positions) {
    if (!CANONICAL_QURAN.isValidIndex(ayah) || selected.has(ayah)) {
      throw new Error('Theme postings have invalid or duplicate canonical ayah indices.');
    }
    selected.add(ayah);
  }
  if (selected.size !== theme.count) throw new Error('QSAC topic count differs from validated postings.');
  const themeSize = selected.size;
  const outsideSize = CANONICAL_QURAN.ayahCount - themeSize;
  const postings = new Map<
    string,
    { label: string; themeAyahs: number[]; outsideAyahs: number[] }
  >();

  for (let ayah = 0; ayah < CANONICAL_QURAN.ayahCount; ayah += 1) {
    const inTheme = selected.has(ayah);
    for (const [id, label] of sourceFeatures(input, ayah)) {
      let entry = postings.get(id);
      if (!entry) {
        entry = { label, themeAyahs: [], outsideAyahs: [] };
        postings.set(id, entry);
      }
      if (entry.label !== label) throw new Error('Conflicting linguistic feature labels.');
      if (inTheme) entry.themeAyahs.push(ayah);
      else entry.outsideAyahs.push(ayah);
    }
  }
  const features = [...postings.entries()].map(([id, entry]): ThemeLanguageFeature => {
    const themeRate = themeSize === 0 ? 0 : entry.themeAyahs.length / themeSize;
    const outsideRate = outsideSize === 0 ? 0 : entry.outsideAyahs.length / outsideSize;
    return {
      id,
      label: entry.label,
      themeAyahs: entry.themeAyahs,
      outsideAyahs: entry.outsideAyahs,
      themeRate,
      outsideRate,
      percentagePointDifference: (themeRate - outsideRate) * 100,
    };
  });
  return { theme: themeName, kind: input.kind, themeSize, outsideSize, themeAyahs: selected, features };
}

export function rankThemeLanguage(
  report: ThemeLanguageReport,
  direction: ThemeLanguageDirection,
  search: string,
): readonly ThemeLanguageFeature[] {
  const query = search.trim().toLocaleLowerCase('en');
  return report.features
    .filter((feature) => {
      if (
        query.length > 0 &&
        !feature.id.toLocaleLowerCase('en').includes(query) &&
        !feature.label.toLocaleLowerCase('en').includes(query)
      ) return false;
      if (direction === 'enriched') {
        return (
          feature.percentagePointDifference > 0 &&
          feature.themeAyahs.length >= 2 &&
          feature.themeAyahs.length + feature.outsideAyahs.length >= 3
        );
      }
      return feature.percentagePointDifference < 0 && feature.outsideAyahs.length >= 12;
    })
    .sort((left, right) => {
      const difference =
        direction === 'enriched'
          ? right.percentagePointDifference - left.percentagePointDifference
          : left.percentagePointDifference - right.percentagePointDifference;
      return (
        difference ||
        right.themeAyahs.length - left.themeAyahs.length ||
        left.id.localeCompare(right.id, 'en')
      );
    });
}

export function themeLanguageSurahs(
  report: ThemeLanguageReport,
  feature: ThemeLanguageFeature,
): readonly ThemeLanguageSurahRow[] {
  const inTheme = new Uint16Array(CANONICAL_QURAN.surahCount);
  const both = new Uint16Array(CANONICAL_QURAN.surahCount);
  const featureOutside = new Uint16Array(CANONICAL_QURAN.surahCount);
  for (const ayah of report.themeAyahs) {
    const surah = CANONICAL_QURAN.refAt(ayah).surah - 1;
    inTheme[surah] = (inTheme[surah] ?? 0) + 1;
  }
  for (const ayah of feature.themeAyahs) {
    const surah = CANONICAL_QURAN.refAt(ayah).surah - 1;
    both[surah] = (both[surah] ?? 0) + 1;
  }
  for (const ayah of feature.outsideAyahs) {
    const surah = CANONICAL_QURAN.refAt(ayah).surah - 1;
    featureOutside[surah] = (featureOutside[surah] ?? 0) + 1;
  }
  return Array.from({ length: CANONICAL_QURAN.surahCount }, (_, index) => {
    const total = CANONICAL_QURAN.surahRange(index + 1).end -
      CANONICAL_QURAN.surahRange(index + 1).start + 1;
    const theme = inTheme[index] ?? 0;
    return {
      surah: index + 1,
      total,
      theme,
      outside: total - theme,
      both: both[index] ?? 0,
      featureOutside: featureOutside[index] ?? 0,
    };
  });
}
