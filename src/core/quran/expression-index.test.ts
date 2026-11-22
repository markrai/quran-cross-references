import { describe, expect, it } from 'vitest';
import {
  detectExactArabicExpressions,
  EXACT_EXPRESSION_MAX_WORDS,
  EXACT_EXPRESSION_MIN_WORDS,
} from './expression-index.ts';

const corpus = (...changed: readonly string[]): string[] =>
  Array.from({ length: 6236 }, (_, index) => changed[index] ?? 'ض');

describe('exact repeated Arabic expression detection', () => {
  it('reports corpus tokens and retains only maximal occurrence-equivalent expressions', () => {
    const result = detectExactArabicExpressions(
      corpus('ألف باء جيم دال هاء', 'ألف باء جيم دال هاء'),
    );
    expect([EXACT_EXPRESSION_MIN_WORDS, EXACT_EXPRESSION_MAX_WORDS]).toEqual([3, 8]);
    expect(result.expressions).toEqual([
      {
        words: ['ألف', 'باء', 'جيم', 'دال', 'هاء'],
        occurrences: [
          { ayah: 0, start: 0, end: 5 },
          { ayah: 1, start: 0, end: 5 },
        ],
      },
    ]);
    expect(result.statistics.ayahCount).toBe(6236);
    expect(result.statistics.tokenCount).toBe(6244);
    expect(result.statistics.repeatedCandidates).toBeGreaterThan(1);
    expect(result.statistics.redundantCandidates).toBe(
      result.statistics.repeatedCandidates - 1,
    );
    expect(result.statistics.emittedExpressions).toBe(1);
    expect(result.statistics.emittedOccurrences).toBe(2);
    expect(result.statistics.mostFrequentExpression).toBe(2);
  });

  it('retains shorter expressions that also occur independently of longer matches', () => {
    const result = detectExactArabicExpressions(
      corpus('ألف باء جيم دال', 'ألف باء جيم دال', 'ألف باء جيم هاء'),
    );
    const short = result.expressions.find((item) => item.words.join(' ') === 'ألف باء جيم');
    const long = result.expressions.find(
      (item) => item.words.join(' ') === 'ألف باء جيم دال',
    );
    expect(short?.occurrences).toEqual([
      { ayah: 0, start: 0, end: 3 },
      { ayah: 1, start: 0, end: 3 },
      { ayah: 2, start: 0, end: 3 },
    ]);
    expect(long?.occurrences).toHaveLength(2);
    expect(result.statistics.mostFrequentExpression).toBe(3);
  });

  it('never treats repetitions in only one ayah or across ayah boundaries as matches', () => {
    const sameAyah = detectExactArabicExpressions(
      corpus('ألف باء جيم ألف باء جيم', 'باء'),
    );
    expect(sameAyah.expressions).toEqual([]);
    const across = detectExactArabicExpressions(
      corpus('ألف باء', 'جيم دال', 'ألف باء', 'جيم دال'),
    );
    expect(across.expressions).toEqual([]);
    expect(across.statistics.emittedOccurrences).toBe(0);
    expect(across.statistics.mostFrequentExpression).toBe(0);
  });

  it('captures all occurrence positions including repeated spans inside the same ayah', () => {
    const scan = detectExactArabicExpressions(
      corpus('ألف باء جيم ألف باء جيم', 'ألف باء جيم'),
    );
    const item = scan.expressions.find((entry) => entry.words.join(' ') === 'ألف باء جيم');
    expect(item?.occurrences).toEqual([
      { ayah: 0, start: 0, end: 3 },
      { ayah: 0, start: 3, end: 6 },
      { ayah: 1, start: 0, end: 3 },
    ]);
  });

  it('caps sequence length at eight without silently discarding distinct maximal spans', () => {
    const nine = 'أ ب ج د هـ و ز ح ط';
    const result = detectExactArabicExpressions(corpus(nine, nine));
    expect(result.expressions.map((item) => item.words.join(' '))).toEqual([
      'أ ب ج د هـ و ز ح',
      'ب ج د هـ و ز ح ط',
    ]);
    expect(result.expressions.every((item) => item.words.length === 8)).toBe(true);
  });

  it('preserves strict orthographic differences as separate evidence', () => {
    const result = detectExactArabicExpressions(
      corpus('قَالَ لَهُمْ رَبُّهُمْ', 'قال لهم ربهم'),
    );
    expect(result.expressions).toEqual([]);
  });
});
