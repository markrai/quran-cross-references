import { describe, expect, it } from 'vitest';
import type { QuranThemeIndex } from './theme-index.ts';
import type { QacMorphologyIndex } from './qac-index.ts';
import type { QuranExpressionIndex, QuranPublishedExpression } from './expression-browser.ts';
import { CANONICAL_QURAN } from './quran-versification.ts';
import {
  computeThemeLanguage,
  rankThemeLanguage,
  themeLanguageSurahs,
} from './theme-language.ts';

const themeAyahs = [0, 1, 7];
const fakeThemes = {
  find(name: string) {
    return name === 'Mercy' ? { name, count: themeAyahs.length } : null;
  },
  occurrences(name: string) {
    return name === 'Mercy' ? themeAyahs : [];
  },
} as Pick<QuranThemeIndex, 'find' | 'occurrences'>;

function word(roots: readonly string[], lemmas: readonly string[] = roots) {
  return { roots, lemmas, form: '', pos: [], segments: [] };
}

const fakeQac = {
  wordsAt(ayah: number) {
    if (ayah === 0) return [word(['rHm'], ['raHm']), word(['rHm'], ['raHm'])];
    if (ayah === 1) return [word(['rHm'], ['raHm']), word(['Elm'], ['Eilm'])];
    if (ayah === 7) return [word(['Elm'], ['Eilm'])];
    if (ayah === 3) return [word(['rHm'], ['raHm'])];
    if (ayah < 30 && ayah >= 8) return [word(['nwr'], ['nwr'])];
    return [];
  },
} as Pick<QacMorphologyIndex, 'wordsAt'>;

function phrase(id: string, words: readonly string[]): QuranPublishedExpression {
  return {
    id,
    words,
    occurrences: [{ ayah: 0, start: 0, end: words.length }],
  };
}

const repeated = phrase('exact:v1:' + 'a'.repeat(64), ['هَٰذَا', 'كِتَابٌ', 'مُبِينٌ']);
const unique = phrase('exact:v1:' + 'b'.repeat(64), ['أَلَا', 'إِنَّ', 'اللَّهَ']);

const fakeExact = {
  forAyah(ayah: number) {
    if (ayah === 0) {
      return [
        { expression: repeated, start: 0, end: 3 },
        { expression: repeated, start: 2, end: 5 },
        { expression: unique, start: 5, end: 8 },
      ];
    }
    if (ayah === 7 || ayah === 2) return [{ expression: repeated, start: 0, end: 3 }];
    return [];
  },
} as Pick<QuranExpressionIndex, 'forAyah'>;

describe('Phase 2E.2 Quran linguistic pattern discovery', () => {
  it('counts ayahs rather than token occurrences and uses disjoint denominators', () => {
    const report = computeThemeLanguage(fakeThemes, 'Mercy', { kind: 'root', index: fakeQac });
    expect(report.themeSize).toBe(3);
    expect(report.outsideSize).toBe(CANONICAL_QURAN.ayahCount - 3);
    const mercy = report.features.find((feature) => feature.id === 'rHm');
    expect(mercy).toBeDefined();
    expect(mercy?.themeAyahs).toEqual([0, 1]);
    expect(mercy?.outsideAyahs).toEqual([3]);
    expect(mercy?.themeRate).toBeCloseTo(2 / 3, 7);
    expect(mercy?.outsideRate).toBeCloseTo(1 / 6233, 7);
    expect(mercy?.percentagePointDifference).toBeCloseTo(((2 / 3) - (1 / 6233)) * 100, 7);
    expect(rankThemeLanguage(report, 'enriched', '')[0]?.id).toBe('rHm');
  });

  it('treats lemma and root categories as distinct and never manufactures semantic correspondence', () => {
    const root = computeThemeLanguage(fakeThemes, 'Mercy', { kind: 'root', index: fakeQac });
    const lemma = computeThemeLanguage(fakeThemes, 'Mercy', { kind: 'lemma', index: fakeQac });
    expect(root.features.some((feature) => feature.id === 'rHm')).toBe(true);
    expect(lemma.features.some((feature) => feature.id === 'raHm')).toBe(true);
    expect(lemma.features.some((feature) => feature.id === 'rHm')).toBe(false);
    expect(root.kind).toBe('root');
    expect(lemma.kind).toBe('lemma');
  });

  it('shows separate background-heavy patterns without treating low support as significance', () => {
    const report = computeThemeLanguage(fakeThemes, 'Mercy', { kind: 'root', index: fakeQac });
    expect(rankThemeLanguage(report, 'depleted', '')[0]?.id).toBe('nwr');
    expect(rankThemeLanguage(report, 'depleted', 'رحم')).toEqual([]);
    expect(rankThemeLanguage(report, 'enriched', 'rHm')[0]?.id).toBe('rHm');
    expect(rankThemeLanguage(report, 'enriched', 'missing')).toHaveLength(0);
  });

  it('deduplicates exact-expression spans within a verse but not across distinct ayahs', () => {
    const report = computeThemeLanguage(fakeThemes, 'Mercy', { kind: 'exact', index: fakeExact });
    const found = report.features.find((feature) => feature.id === repeated.id);
    expect(found?.themeAyahs).toEqual([0, 7]);
    expect(found?.outsideAyahs).toEqual([2]);
    expect(report.features.find((feature) => feature.id === unique.id)?.themeAyahs).toEqual([0]);
    expect(rankThemeLanguage(report, 'enriched', '')).toHaveLength(1);
    expect(rankThemeLanguage(report, 'enriched', '')[0]?.id).toBe(repeated.id);
  });

  it('retains surah-specific denominators and both/theme/outside cell counts', () => {
    const report = computeThemeLanguage(fakeThemes, 'Mercy', { kind: 'root', index: fakeQac });
    const mercy = report.features.find((feature) => feature.id === 'rHm');
    if (!mercy) throw new Error('Missing fixture root.');
    const surahs = themeLanguageSurahs(report, mercy);
    expect(surahs).toHaveLength(114);
    expect(surahs[0]).toMatchObject({ surah: 1, total: 7, theme: 2, outside: 5, both: 2, featureOutside: 1 });
    expect(surahs[1]).toMatchObject({ surah: 2, theme: 1, both: 0 });
    expect(surahs.reduce((sum, row) => sum + row.both, 0)).toBe(2);
    expect(surahs.reduce((sum, row) => sum + row.featureOutside, 0)).toBe(1);
    expect(surahs.reduce((sum, row) => sum + row.total, 0)).toBe(6236);
  });

  it('rejects inconsistent or invalid QSAC source memberships instead of recomputing a misleading rate', () => {
    expect(() => computeThemeLanguage(fakeThemes, 'Absent', { kind: 'root', index: fakeQac })).toThrow(
      'Unknown QSAC',
    );
    const incorrect = {
      find: () => ({ count: 4 }),
      occurrences: () => [0, 1, 7],
    } as unknown as Pick<QuranThemeIndex, 'find' | 'occurrences'>;
    expect(() => computeThemeLanguage(incorrect, 'Mercy', { kind: 'root', index: fakeQac })).toThrow(
      'differs from validated postings',
    );
    const duplicated = {
      find: () => ({ count: 2 }),
      occurrences: () => [0, 0],
    } as unknown as Pick<QuranThemeIndex, 'find' | 'occurrences'>;
    expect(() => computeThemeLanguage(duplicated, 'Mercy', { kind: 'root', index: fakeQac })).toThrow(
      'duplicate',
    );
  });
});
